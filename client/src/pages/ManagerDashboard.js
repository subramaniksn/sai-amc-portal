import { useState, useEffect, useCallback } from "react";
import api from "../api";

import {
  Container,
  Grid,
  Card,
  Typography,
  TextField,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from "@mui/material";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend
} from "recharts";

export default function ManagerDashboard() {

  const [sites, setSites] = useState([]);
  const [filteredSites, setFilteredSites] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [mwFilter, setMwFilter] = useState("");
  const [siteCountFilter, setSiteCountFilter] = useState("");

  const [yearList, setYearList] = useState([]);
  const [period, setPeriod] = useState("");
  const [upcoming, setUpcoming] = useState([]);
  const [amcStatus, setAmcStatus] = useState("live"); // ✅ NEW

  // ===============================
  // YEAR GENERATION
  // ===============================
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 5; i++) {
      years.push(`${i}-${i + 1}`);
    }
    setYearList(years);
    setPeriod("all"); // ✅ default All
  }, []);

  // ===============================
  // FETCH DATA
  // ===============================


  const fetchSites = useCallback(async (year) => {
    try {
      const res = await api.get("/amc", {
        params: {
          year: year || undefined,
          status: amcStatus
        }
      });

      const data = res.data || [];
      setSites(data);
      setFilteredSites(data);
      setSelectedCustomer(null);
    } catch (err) {
      console.error("Failed to load sites:", err);
    }
  }, [amcStatus]);

  const fetchUpcoming = useCallback(async (year) => {
    try {
      const res = await api.get("/amc/upcoming", {
        params: { year: year || undefined }
      });

      setUpcoming(res.data);
    } catch (err) {
      console.error("Upcoming AMC Error:", err);
    }
  }, []);

    useEffect(() => {
    if (period === "") return;

    const year = period === "all" ? "" : period.split("-")[0];

    fetchSites(year);
    fetchUpcoming(year);
  }, [period, amcStatus, fetchSites, fetchUpcoming]);

  // SAFE DATE FORMAT
  const formatDate = (date) => {
    if (!date) return "N/A";
    const d = new Date(date);
    if (isNaN(d)) return "N/A";
    const day   = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year  = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // TOTAL COUNTS
  const totalSites     = sites.length;
  const totalCustomers = [...new Set(sites.map(s => s.customer_name))].length;
  const totalMW        = sites.reduce((sum, s) => sum + parseFloat(s.plantcapacity_mw || 0), 0);

  // GROUP DATA FOR CHART
  const grouped = filteredSites.reduce((acc, site) => {
    const customer = site.customer_name || "Unknown";
    if (!acc[customer]) acc[customer] = [];
    acc[customer].push(site);
    return acc;
  }, {});

  const chartData = Object.entries(grouped).map(([customer, customerSites]) => {
    const totalMW = customerSites.reduce(
      (sum, s) => sum + parseFloat(s.plantcapacity_mw || 0), 0
    );
    return { customer, sites: customerSites.length, mw: totalMW };
  });

  // FILTER
  const applyFilter = () => {
    let data = [...sites];

    if (mwFilter) {
      data = data.filter(
        (s) => parseFloat(s.plantcapacity_mw || 0) >= parseFloat(mwFilter)
      );
    }

    if (siteCountFilter) {
      const groupedTemp = data.reduce((acc, s) => {
        const cust = s.customer_name || "Unknown";
        if (!acc[cust]) acc[cust] = [];
        acc[cust].push(s);
        return acc;
      }, {});

      data = Object.values(groupedTemp)
        .filter((sites) => sites.length >= parseInt(siteCountFilter))
        .flat();
    }

    setFilteredSites(data);
    setSelectedCustomer(null);
  };

  // BAR CLICK
  const handleBarClick = (data) => {
    if (!data || !data.customer) return;
    const customer = data.customer;
    const sitesOfCustomer = filteredSites.filter(
      (s) => s.customer_name === customer
    );
    setSelectedCustomer({ name: customer, sites: sitesOfCustomer });
  };

  const handleExport = async () => {
    try {
      const year = period === "all" ? "" : period.split("-")[0];
      const response = await api.get("/amc/export", {
        params: {
          year: year || undefined,
          status: amcStatus           // ✅ pass status to export
        },
        responseType: "blob"
      });
      const url  = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href  = url;
      link.setAttribute("download", `AMC_Report_${amcStatus}_${year || "all"}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export data");
    }
  };

  return (
    <Container maxWidth="lg">

      {/* TITLE */}
      <Typography variant="h4" gutterBottom>
        Manager Dashboard —{" "}
        {amcStatus === "live" ? "🟢 Live" : amcStatus === "completed" ? "🔴 Completed" : "📋 All"}
        {" "}({period === "all" ? "All Years" : period})
      </Typography>

      {/* YEAR SELECT */}
      <Box sx={{ mb: 3, width: 250 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Period</InputLabel>
          <Select
            value={period}
            label="Period"
            onChange={(e) => setPeriod(e.target.value)}
          >
            <MenuItem value="all">All Years</MenuItem>  {/* ✅ All option */}
            {yearList.map((y) => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
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
            {upcoming.length > 6 && "..."}
          </Alert>
        </Box>
      )}

      {/* DASHBOARD CARDS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6">Total MW</Typography>
            <Typography variant="h4" color="success.main">
              {totalMW.toFixed(2)}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6">Total Sites</Typography>
            <Typography variant="h4" color="primary">
              {totalSites}
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6">Total Customers</Typography>
            <Typography variant="h4" color="secondary">
              {totalCustomers}
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* FILTER */}
      <Card sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Minimum MW"
              type="number"
              value={mwFilter}
              onChange={(e) => setMwFilter(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Minimum Sites"
              type="number"
              value={siteCountFilter}
              onChange={(e) => setSiteCountFilter(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box display="flex" gap={2}>
              <Button variant="contained" onClick={applyFilter}>
                Apply Filter
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  setMwFilter("");
                  setSiteCountFilter("");
                  setFilteredSites(sites);
                  setSelectedCustomer(null);
                }}
              >
                Clear
              </Button>
              <Button variant="contained" color="success" onClick={handleExport}>
                Export Excel
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Card>

      {/* CHART */}
      <Card sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Customer Portfolio Overview
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Site count and managed MW by customer. Select a bar to view its sites.
        </Typography>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData} margin={{ bottom: 80, right: 20 }}>
            <CartesianGrid stroke="#eaecf0" vertical={false} />
            <XAxis
              dataKey="customer"
              tick={{ fontSize: 12 }}
              angle={-35}
              textAnchor="end"
              interval={0}
            />
            <YAxis yAxisId="sites" allowDecimals={false} label={{ value: "Sites", angle: -90, position: "insideLeft" }} />
            <YAxis yAxisId="mw" orientation="right" label={{ value: "MW", angle: 90, position: "insideRight" }} />
            <Tooltip formatter={(value, name) => [Number(value).toLocaleString("en-IN"), name]} />
            <Legend verticalAlign="top" height={32} />
            <Bar yAxisId="sites" dataKey="sites" name="Sites" fill="#155eef" radius={[6, 6, 0, 0]} onClick={handleBarClick} />
            <Line yAxisId="mw" type="monotone" dataKey="mw" name="Managed MW" stroke="#f79009" strokeWidth={3} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* SITE TABLE */}
      {selectedCustomer && (
        <Card sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Sites for {selectedCustomer.name}
          </Typography>
          <Box sx={{ overflowX: "auto" }}>
            <Table sx={{ minWidth: 1200 }} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Plant Name</TableCell>
                  <TableCell align="center">MW</TableCell>
                  <TableCell>Billing Address</TableCell>
                  <TableCell>Contact Person</TableCell>
                  <TableCell align="center">PO No</TableCell>
                  <TableCell align="center">AMC Start</TableCell>
                  <TableCell align="center">AMC End</TableCell>
                  <TableCell align="center">Billing Cycle</TableCell>
                  <TableCell>Supporting Document</TableCell>
                  <TableCell align="center">Site Visit</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedCustomer.sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell>{site.plant_name}</TableCell>
                    <TableCell align="center">{site.plantcapacity_mw || "0"}</TableCell>
                    <TableCell>{site.billing_address?.split(",")[0] || "N/A"}</TableCell>
                    <TableCell>{site.contact_person || "N/A"}</TableCell>
                    <TableCell align="center">{site.po_number || "N/A"}</TableCell>
                    <TableCell align="center">{formatDate(site.amc_start_date)}</TableCell>
                    <TableCell align="center">{formatDate(site.amc_end_date)}</TableCell>
                    <TableCell align="center">{site.billing_cycle || "N/A"}</TableCell>
                    <TableCell>{site.supporting_document_for_invoice || "N/A"}</TableCell>
                    <TableCell align="center">{site.site_visit || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}

    </Container>
  );
}
