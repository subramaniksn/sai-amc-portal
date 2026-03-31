import { useEffect, useState } from "react";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboard() {

  const [data, setData] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [pendingCustomer, setPendingCustomer] = useState([]);
  const [invoiceSummary, setInvoiceSummary] = useState({
    due: 0,
    pending: 0,
    paid: 0
  });

  const [yearList, setYearList] = useState([]);
  const [period, setPeriod] = useState("");

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role;

  // ===============================
  // AUTO YEAR GENERATION
  // ===============================
  useEffect(() => {
    const currentYear = new Date().getFullYear();

    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 5; i++) {
      years.push(`${i}-${i + 1}`);
    }

    setYearList(years);
    setPeriod(`${currentYear}-${currentYear + 1}`);
  }, []);

  // ===============================
  // FETCH DATA
  // ===============================
  useEffect(() => {
    if (!period) return;

    const year = period.split("-")[0];

    fetchData(year);
    fetchInvoiceSummary(year);
    fetchPendingCustomer(year);

  }, [period]);

  const fetchData = async (year) => {
    try {
      const res = await api.get("/amc", { params: { year } });
      setData(res.data);

      const upcomingRes = await api.get("/amc/upcoming", { params: { year } });
      setUpcoming(upcomingRes.data);

    } catch (err) {
      console.error("Fetch Data Error:", err);
    }
  };

  const fetchPendingCustomer = async (year) => {
    try {
      const res = await api.get("/amc/pending-by-customer", {
        params: { year }
      });
      setPendingCustomer(res.data);
    } catch (err) {
      console.error("Pending Customer Error:", err);
    }
  };

  const fetchInvoiceSummary = async (year) => {
    try {
      const res = await api.get("/invoice/invoice-summary", {
        params: { year }
      });
      setInvoiceSummary(res.data);
    } catch (err) {
      console.error("Invoice Summary Error:", err);
    }
  };

  // ===============================
  // CALCULATIONS
  // ===============================
  const totalAmount = pendingCustomer.reduce(
    (sum, row) => sum + Number(row.total_amount_without_gst || 0),
    0
  );

  const receivedAmount = pendingCustomer.reduce(
    (sum, row) => sum + Number(row.received_amount || 0),
    0
  );

  const pendingAmount = pendingCustomer.reduce(
    (sum, row) => sum + Number(row.pending_amount || 0),
    0
  );

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN").format(num || 0);

  const getPendingForPlant = (plantName) => {
    const p = pendingCustomer.find(
      (row) => row.plant_name === plantName
    );

    return {
      pending: p?.pending_amount || 0,
      received: p?.received_amount || 0
    };
  };

  // ===============================
  // CHART DATA
  // ===============================
  const chartData = pendingCustomer.map((row) => ({
    customer_name: row.plant_name,
    pending: row.pending_amount || 0
  }));

  return (
    <Container maxWidth="xl">

      <Typography variant="h4" gutterBottom>
        AMC Dashboard ({period})
      </Typography>

      {/* YEAR FILTER */}
      <Box sx={{ mb: 3, width: 250 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Period</InputLabel>
          <Select
            value={period}
            label="Period"
            onChange={(e) => setPeriod(e.target.value)}
          >
            {yearList.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* AMC ENDING ALERT */}
      {upcoming.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="error">
            {upcoming.length} AMC(s) ending soon:{" "}
            {upcoming
              //.slice(0, 3) // show first 3
              .map((u) => u.plant_name)
              .join(", ")
            }
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

      {/* INVOICE STATUS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>

        <Grid item xs={12} md={4}>
          <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/invoice-list/due")}>
            <CardContent>
              <Typography variant="h6">Due Invoices</Typography>
              <Typography variant="h4" color="error">
                {invoiceSummary.due}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/invoice-list/pending")}>
            <CardContent>
              <Typography variant="h6">Pending Payment</Typography>
              <Typography variant="h4" color="warning.main">
                {invoiceSummary.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ cursor: "pointer" }} onClick={() => navigate("/invoice-list/paid")}>
            <CardContent>
              <Typography variant="h6">Paid Invoices</Typography>
              <Typography variant="h4" color="success.main">
                {invoiceSummary.paid}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* BAR CHART */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pending Amount by Customer
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ bottom: 80 }}>

              <XAxis
                dataKey="customer_name"
                tick={{ fontSize: 12 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />

              <YAxis
                width={100}
                tickFormatter={(value) =>
                  `₹ ${new Intl.NumberFormat("en-IN").format(value)}`
                }
              />

              <Tooltip
                formatter={(value) =>
                  `₹ ${new Intl.NumberFormat("en-IN").format(value)}`
                }
              />

              <Bar dataKey="pending" fill="#ff9800" />
              
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Box sx={{ mb: 3 }}>

          {role?.toLowerCase() === "admin" && (
            <>
              <Button
                variant="contained"
                component={Link}
                to="/add-amc"
                sx={{ mr: 2 }}
              >
                Add AMC
              </Button>

              <Button
                variant="contained"
                color="success"
                sx={{ mr: 2 }}
                onClick={async () => {
                  try {
                    const year = period.split("-")[0]; // from dropdown

                    const res = await api.get(`/amc/export?year=${year}`, {
                      responseType: "blob", // IMPORTANT
                    });

                    const url = window.URL.createObjectURL(new Blob([res.data]));
                    const link = document.createElement("a");

                    link.href = url;
                    link.setAttribute("download", `AMC_Report_${year}.xlsx`);

                    document.body.appendChild(link);
                    link.click();
                    link.remove();

                  } catch (err) {
                    console.error("Export error:", err);
                    alert("Export failed");
                  }
                }}
              >
                Export AMC
              </Button>
            </>
          )}

        </Box>
      
      {/* AMC LIST */}
      <TableContainer component={Paper} sx={{ mt: 3, maxHeight: 500 }}>
  <Table stickyHeader>

    {/* HEADER */}
    <TableHead>
      <TableRow>
        {[
          "Plant Name",
          "Customer",
          "Total Amount",
          "Received",
          "Pending",
          "Status",
          "Action"
        ].map((head) => (
          <TableCell
            key={head}
            sx={{
              backgroundColor: "#1976d2 !important", // FORCE BLUE
              color: "#fff !important",              // FORCE WHITE TEXT
              fontWeight: "bold"
            }}
          >
            {head}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>

    {/* BODY */}
    <TableBody>
          {data.map((d) => {

            const payment = getPendingForPlant(d.plant_name);

            const pendingVal = Number(payment?.pending || 0);
            const receivedVal = Number(payment?.received || 0);

            let status = "Pending";
            let rowColor = "#ffebee"; // red

            if (pendingVal <= 0) {
              status = "Paid";
              rowColor = "#e8f5e9"; // green
            } else if (receivedVal > 0) {
              status = "Partial";
              rowColor = "#fff3e0"; // orange
            }

            return (
              <TableRow key={d.id} sx={{ backgroundColor: rowColor }}>

                <TableCell>{d.plant_name}</TableCell>

                <TableCell>{d.customer_name}</TableCell>

                <TableCell>
                  ₹ {formatCurrency(d.total_amount_without_gst)}
                </TableCell>

                <TableCell>
                  ₹ {formatCurrency(receivedVal)}
                </TableCell>

                <TableCell>
                  ₹ {formatCurrency(pendingVal)}
                </TableCell>

                <TableCell>
                  <Chip
                    label={status}
                    color={
                      status === "Paid"
                        ? "success"
                        : status === "Partial"
                        ? "warning"
                        : "error"
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