import { useEffect, useState, useCallback } from "react";
import api from "../api";
import { Link, useNavigate } from "react-router-dom";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Alert,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {
  const [amcStatus, setAmcStatus] = useState("live");
  const [data, setData] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [pendingCustomer, setPendingCustomer] = useState([]);
  const [invoiceSummary, setInvoiceSummary] = useState({ due: 0, pending: 0, paid: 0 });
  const [yearList, setYearList] = useState([]);
  const [period, setPeriod] = useState("all");
  const [activeAmountSeries, setActiveAmountSeries] = useState("all");
  const [showChart, setShowChart] = useState(false);
  const [selectedMake, setSelectedMake] = useState(null);
  const [makeType, setMakeType] = useState(null); // 'scada' | 'plc'

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role;
  useEffect(() => {
    const currentYear = new Date().getFullYear();

    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 5; i++) {
      years.push(`${i}-${i + 1}`);
    }

    setYearList(years);
    setPeriod("all");
  }, []);

  // ===============================
  // FETCH DATA on mount + amcStatus change
  // ===============================
  const fetchData = useCallback(async (year) => {
    try {
      const res = await api.get("/amc", {
        params: {
          status: amcStatus,
          year: year || undefined
        }
      });
      setData(res.data);
      const upcomingRes = await api.get("/amc/upcoming");
      setUpcoming(upcomingRes.data);
    } catch (err) {
      console.error("Fetch Data Error:", err);
    }
  }, [amcStatus]);

  const fetchPendingCustomer = useCallback(async (year) => {
    try {
      const res = await api.get("/amc/pending-by-customer", {
        params: {
          status: amcStatus,
          year: year || undefined
        }
      });
      setPendingCustomer(res.data);
    } catch (err) {
      console.error("Pending Customer Error:", err);
    }
  }, [amcStatus]);

  const fetchInvoiceSummary = useCallback(async (year) => {
    try {
      const res = await api.get("/invoice/invoice-summary", {
        params: {
          status: amcStatus,
          year: year || undefined
        }
      });
      setInvoiceSummary(res.data);
    } catch (err) {
      console.error("Invoice Summary Error:", err);
    }
  }, [amcStatus]);

  useEffect(() => {
    if (period === "") return;

    const year =
      period === "all"
        ? ""
        : period.split("-")[0];

    fetchData(year);
    fetchInvoiceSummary(year);
    fetchPendingCustomer(year);

  }, [
    period,
    amcStatus,
    fetchData,
    fetchInvoiceSummary,
    fetchPendingCustomer
  ]);

  // ===============================
  // CALCULATIONS
  // ===============================
  const totalAmount = pendingCustomer.reduce(
    (sum, row) => sum + Number(row.total_amount_without_gst || 0), 0
  );
  const receivedAmount = pendingCustomer.reduce(
    (sum, row) => sum + Number(row.received_amount || 0), 0
  );
  const pendingAmount = pendingCustomer.reduce(
    (sum, row) => sum + Number(row.pending_amount || 0), 0
  );

  // Count distinct plants (sites) so a multi-year AMC is not counted per year
  const distinctSites = (arr) => {
    const seen = new Set();
    return arr.filter((s) => {
      const key = s.plant_name || "";
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // SCADA / PLC make counts (distinct plants per make)
  // Supports comma-separated multiple makes per site, e.g. "ABB, Siemens, Phoenix"
  const scadaCounts = Object.entries(
    distinctSites(data).reduce((acc, s) => {
      const makes = (s.scada_make || "")
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      if (makes.length === 0) {
        acc["Not Specified"] = (acc["Not Specified"] || 0) + 1;
      } else {
        makes.forEach((make) => {
          acc[make] = (acc[make] || 0) + 1;
        });
      }
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const plcCounts = Object.entries(
    distinctSites(data).reduce((acc, s) => {
      const makes = (s.plc_make || "")
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);
      if (makes.length === 0) {
        acc["Not Specified"] = (acc["Not Specified"] || 0) + 1;
      } else {
        makes.forEach((make) => {
          acc[make] = (acc[make] || 0) + 1;
        });
      }
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  // Sites for selected make (click a make in the counts below to view its sites)
  const makeSites = selectedMake
    ? distinctSites(data).filter((s) => {
        const field = makeType === "scada" ? "scada_make" : "plc_make";
        const makes = (s[field] || "")
          .split(",")
          .map((m) => m.trim())
          .filter(Boolean);
        return makes.includes(selectedMake);
      })
    : [];

  const handleMakeClick = (make, type) => {
    setSelectedMake(make);
    setMakeType(type);
  };

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN").format(num || 0);

  const getPendingForAmc = (amcId) => {
    const p = pendingCustomer.find((row) => Number(row.amc_id) === Number(amcId));
    return {
      pending:  p?.pending_amount  || 0,
      received: p?.received_amount || 0
    };
  };

  // ===============================
  // CHART DATA
  // ===============================
  const chartData = pendingCustomer
    .map((row) => ({
      customer_name: `${row.plant_name} (${new Date(row.amc_start_date).getFullYear()})`,
      received: Number(row.received_amount || 0),
      pending: Number(row.pending_amount || 0)
    }))
    .sort((a, b) => b.pending - a.pending);

  const handleAmountLegendClick = (entry) => {
    const selected = entry.dataKey;
    setActiveAmountSeries((current) => current === selected ? "all" : selected);
  };

  const handleExport = async () => {
    try {
      const res = await api.get("/amc/export", {
        params: {
          status: amcStatus,
          year: period === "all" ? undefined : period.split("-")[0]
        },
        responseType: "blob"
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `AMC_Report_${amcStatus}_${period}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed");
    }
  };

  return (
    <Container maxWidth="xl">

      {/* TITLE */}
      <Typography variant="h4" gutterBottom>
        AMC Dashboard —
        {amcStatus === "live"
          ? "🟢 Live"
          : amcStatus === "completed"
          ? "🔴 Completed"
          : "📋 All"}
        {" "}
        ({period === "all" ? "All Years" : period})
      </Typography>
      <Box sx={{ mb: 3, width: 250 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Period</InputLabel>

          <Select
            value={period}
            label="Period"
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value="all">
              All Years
            </MenuItem>

            {yearList.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      {/* AMC STATUS TOGGLE */}
      <Box sx={{ mb: 3, display: "flex", gap: 2, alignItems: "center" }}>
        <Button
          variant={amcStatus === "live" ? "contained" : "outlined"}
          color="success"
          onClick={() => setAmcStatus("live")}
        >
          🟢 Live AMC
        </Button>
        <Button
          variant={amcStatus === "completed" ? "contained" : "outlined"}
          color="error"
          onClick={() => setAmcStatus("completed")}
        >
          🔴 Completed AMC
        </Button>
        <Button
          variant={amcStatus === "all" ? "contained" : "outlined"}
          color="inherit"
          onClick={() => setAmcStatus("all")}
        >
          📋 All
        </Button>
      </Box>

      {/* AMC ENDING ALERT */}
      {upcoming.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="error">
            {upcoming.length} AMC(s) ending soon:{" "}
            {upcoming.map((u) => u.plant_name).join(", ")}
            {upcoming.length > 3 && "..."}
          </Alert>
        </Box>
      )}

      {/* KPI CARDS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={4}>
            <CardContent>
              <Typography variant="h6">Total Revenue</Typography>
              <Typography variant="h5" color="primary">
                ₹ {formatCurrency(totalAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={4}>
            <CardContent>
              <Typography variant="h6">Pending Amount</Typography>
              <Typography variant="h5" color="error">
                ₹ {formatCurrency(pendingAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={4}>
            <CardContent>
              <Typography variant="h6">Received Amount</Typography>
              <Typography variant="h5" color="success.main">
                ₹ {formatCurrency(receivedAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* INVOICE STATUS CARDS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/invoice-list/due", {
              state: { status: amcStatus }
            })}
          >
            <CardContent>
              <Typography variant="h6">Invoice Due</Typography>
              <Typography variant="h4" color="error">
                {invoiceSummary.due}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/invoice-list/pending", {
              state: { status: amcStatus }
            })}
          >
            <CardContent>
              <Typography variant="h6">Payment Pending</Typography>
              <Typography variant="h4" color="warning.main">
                {invoiceSummary.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/invoice-list/paid", {
              state: { status: amcStatus }
            })}
          >
            <CardContent>
              <Typography variant="h6">Payment Received</Typography>
              <Typography variant="h4" color="success.main">
                {invoiceSummary.paid}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* SCADA / PLC Make Counts */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            SCADA / PLC Make — Plant Count
          </Typography>
          {selectedMake && (
            <Box sx={{ mb: 2 }}>
              <Button
                variant="text"
                onClick={() => {
                  setSelectedMake(null);
                  setMakeType(null);
                }}
                startIcon={<ArrowBackIcon />}
              >
                Back to all makes
              </Button>
              <Typography variant="subtitle2" color="text.secondary" sx={{ ml: 2, display: "inline-block" }}>
                Sites using {makeType === "scada" ? "SCADA" : "PLC"} make: <b>{selectedMake}</b>
              </Typography>
            </Box>
          )}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                SCADA Make
              </Typography>
              <Grid container spacing={1}>
                {scadaCounts.length > 0 ? (
                  scadaCounts.map(([make, count]) => (
                    <Grid item key={make} xs={12} sm={6}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={
                          selectedMake === make && makeType === "scada" ? <CheckCircleIcon /> : undefined
                        }
                        color={
                          selectedMake === make && makeType === "scada"
                            ? "primary"
                            : "default"
                        }
                        onClick={() => handleMakeClick(make, "scada")}
                        sx={{
                          height: 48,
                          justifyContent: "space-between",
                          fontWeight:
                            selectedMake === make && makeType === "scada"
                              ? "bold"
                              : "normal",
                        }}
                      >
                        {make}
                        <Box sx={{ ml: 1 }}>{count}</Box>
                      </Button>
                    </Grid>
                  ))
                ) : (
                  <Typography color="text.secondary">No SCADA make recorded</Typography>
                )}
              </Grid>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                PLC Make
              </Typography>
              <Grid container spacing={1}>
                {plcCounts.length > 0 ? (
                  plcCounts.map(([make, count]) => (
                    <Grid item key={make} xs={12} sm={6}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={
                          selectedMake === make && makeType === "plc" ? <CheckCircleIcon /> : undefined
                        }
                        color={
                          selectedMake === make && makeType === "plc"
                            ? "primary"
                            : "default"
                        }
                        onClick={() => handleMakeClick(make, "plc")}
                        sx={{
                          height: 48,
                          justifyContent: "space-between",
                          fontWeight:
                            selectedMake === make && makeType === "plc"
                              ? "bold"
                              : "normal",
                        }}
                      >
                        {make}
                        <Box sx={{ ml: 1 }}>{count}</Box>
                      </Button>
                    </Grid>
                  ))
                ) : (
                  <Typography color="text.secondary">No PLC make recorded</Typography>
                )}
              </Grid>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Sites for selected make */}
      {selectedMake && makeSites.length > 0 && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Sites — {makeType === "scada" ? "SCADA" : "PLC"} Make: {selectedMake}
            </Typography>
            <TableContainer component={Paper}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    {["Plant Name", "Customer", "SCADA Make", "PLC Make", "AMC Start", "AMC End", "PO Number"].map(
                      (head) => (
                        <TableCell
                          key={head}
                          sx={{
                            backgroundColor: "#1976d2 !important",
                            color: "#fff !important",
                            fontWeight: "bold",
                          }}
                        >
                          {head}
                        </TableCell>
                      )
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {makeSites.map((s) => (
                    <TableRow key={s.id} sx={{ cursor: "pointer" }}>
                      <TableCell>{s.plant_name}</TableCell>
                      <TableCell>{s.customer_name}</TableCell>
                      <TableCell>{s.scada_make || "N/A"}</TableCell>
                      <TableCell>{s.plc_make || "N/A"}</TableCell>
                      <TableCell>
                        {s.amc_start_date ? new Date(s.amc_start_date).toLocaleDateString("en-IN") : "N/A"}
                      </TableCell>
                      <TableCell>
                        {s.amc_end_date ? new Date(s.amc_end_date).toLocaleDateString("en-IN") : "N/A"}
                      </TableCell>
                      <TableCell>{s.po_number || "N/A"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {makeSites.length === 0 && (
              <Typography color="text.secondary">No sites found for this make.</Typography>
            )}
          </CardContent>
        </Card>
      )}

      <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <Button variant="contained" component={Link} to="/add-amc">
          Add AMC
        </Button>
        <Button variant="contained" color="success" onClick={handleExport}>
          Export AMC
        </Button>
        <Button variant="outlined" onClick={() => setShowChart((current) => !current)}>
          {showChart ? "Hide Chart" : "Show Chart"}
        </Button>
      </Box>

      {/* BAR CHART */}
      {showChart && <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Collection Performance — All Plants
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Received versus pending AMC value for every plant. Click a legend item to isolate it.
          </Typography>
          <ResponsiveContainer width="100%" height={Math.max(420, chartData.length * 42)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 30 }}>
              <CartesianGrid stroke="#eaecf0" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(value) => `₹ ${new Intl.NumberFormat("en-IN", { notation: "compact" }).format(value)}`}
              />
              <YAxis type="category" dataKey="customer_name" width={150} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `₹ ${new Intl.NumberFormat("en-IN").format(value)}`} />
              <Legend
                onClick={handleAmountLegendClick}
                wrapperStyle={{ cursor: "pointer" }}
              />
              <Bar
                dataKey="received"
                name="Received"
                stackId="amount"
                fill="#079455"
                hide={activeAmountSeries !== "all" && activeAmountSeries !== "received"}
              />
              <Bar
                dataKey="pending"
                name="Pending"
                stackId="amount"
                fill="#f79009"
                radius={[0, 6, 6, 0]}
                hide={activeAmountSeries !== "all" && activeAmountSeries !== "pending"}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>}

      {/* AMC LIST TABLE */}
      <TableContainer component={Paper} sx={{ mt: 3, maxHeight: 500 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              {["Plant Name", "Customer", "Total Amount", "Received", "Payment Pending", "Status", "Action"].map((head) => (
                <TableCell
                  key={head}
                  sx={{
                    backgroundColor: "#1976d2 !important",
                    color: "#fff !important",
                    fontWeight: "bold"
                  }}
                >
                  {head}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((d) => {
              const payment    = getPendingForAmc(d.id);
              const pendingVal  = Number(payment?.pending  || 0);
              const receivedVal = Number(payment?.received || 0);

              let status   = "Payment Pending";
              let rowColor = "#ffebee";

              if (pendingVal <= 0) {
                status   = "Payment Received";
                rowColor = "#e8f5e9";
              } else if (receivedVal > 0) {
                status   = "Partial";
                rowColor = "#fff3e0";
              }

              return (
                <TableRow key={d.id} sx={{ backgroundColor: rowColor }}>
                  <TableCell>{d.plant_name}</TableCell>
                  <TableCell>{d.customer_name}</TableCell>
                  <TableCell>₹ {formatCurrency(d.total_amount_without_gst)}</TableCell>
                  <TableCell>₹ {formatCurrency(receivedVal)}</TableCell>
                  <TableCell>₹ {formatCurrency(pendingVal)}</TableCell>
                  <TableCell>
                    <Chip
                      label={status}
                      color={
                        status === "Payment Received" ? "success" :
                        status === "Partial" ? "warning" : "error"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {role?.toLowerCase() === "admin" && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => navigate(`/edit/${d.id}`)}
                      >
                        Edit
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

    </Container>
  );
}
