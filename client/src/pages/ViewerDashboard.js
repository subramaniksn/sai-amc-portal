import { useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Cell
} from "recharts";

export default function ViewerDashboard() {

  const navigate = useNavigate();

  const [sites, setSites] = useState([]);
  const [filteredSites, setFilteredSites] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [mwFilter, setMwFilter] = useState("");
  const [siteCountFilter, setSiteCountFilter] = useState("");

  const [invoiceSummary, setInvoiceSummary] = useState({
    due: 0,
    pending: 0,
    paid: 0
  });

  // ✅ NEW STATES
  const [yearList, setYearList] = useState([]);
  const [period, setPeriod] = useState("");
  const [endingAMC, setEndingAMC] = useState([]);

  // ===============================
  // AUTO YEAR GENERATE
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
  // FETCH BASE DATA
  // ===============================
  useEffect(() => {
    if (!period) return;

    const year = period.split("-")[0];

    fetchSites(year);
    fetchInvoiceSummary(year);   // ✅ FIXED
    fetchEndingAMC(year);

  }, [period]);

  const fetchSites = async (year) => {
    try {
      const res = await api.get("/amc", { params: { year } });
      const data = res.data || [];
      setSites(data);
      setFilteredSites(data);
    } catch (err) {
      console.error("Failed to load sites:", err);
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

  // ✅ AMC ENDING API
  const fetchEndingAMC = async (year) => {
    try {
      const res = await api.get("/amc/upcoming", {
        params: { year }
      });

      console.log("VIEWER AMC:", res.data); // debug

      setEndingAMC(res.data);
    } catch (err) {
      console.error("Ending AMC Error:", err);
    }
  };

  // DATE FORMAT
  const formatDate = (date) => {
    if (!date) return "N/A";
    const d = new Date(date);
    if (isNaN(d)) return "N/A";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
  };

  // TOTAL COUNTS
  const totalSites = sites.length;

  const totalCustomers = [...new Set(sites.map(s => s.customer_name))].length;

  const totalMW = sites.reduce((sum, s) => {
    return sum + parseFloat(s.plantcapacity_mw || 0);
  }, 0);

  // GROUP FOR CHART
  const grouped = filteredSites.reduce((acc, site) => {
    const customer = site.customer_name || "Unknown";
    if (!acc[customer]) acc[customer] = [];
    acc[customer].push(site);
    return acc;
  }, {});

  const chartData = Object.entries(grouped).map(([customer, customerSites]) => ({
    customer,
    sites: customerSites.length,
    mw: customerSites.reduce(
      (sum, s) => sum + parseFloat(s.plantcapacity_mw || 0),
      0
    )
  }));

  // FILTER
  const applyFilter = () => {

    let data = [...sites];

    if (mwFilter) {
      data = data.filter(
        s => parseFloat(s.plantcapacity_mw || 0) >= parseFloat(mwFilter)
      );
    }

    if (siteCountFilter) {

      const groupedTemp = data.reduce((acc, s) => {
        if (!acc[s.customer_name]) acc[s.customer_name] = [];
        acc[s.customer_name].push(s);
        return acc;
      }, {});

      data = Object.values(groupedTemp)
        .filter(sites => sites.length >= parseInt(siteCountFilter))
        .flat();
    }

    setFilteredSites(data);
    setSelectedCustomer(null);
  };

  // CHART CLICK
  const handleBarClick = (data) => {
    if (!data || !data.customer) return;

    const sitesOfCustomer = filteredSites.filter(
      s => s.customer_name === data.customer
    );

    setSelectedCustomer({
      name: data.customer,
      sites: sitesOfCustomer
    });
  };

  const handleExport = async () => {
    try {
      const year = period.split("-")[0];

      const response = await api.get(`/amc/export?year=${year}`, {
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `AMC_Report_${year}.xlsx`);

      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export data");
    }
  };

  const barColors = ["#ff9800", "#1976d2", "#2e7d32", "#d32f2f", "#7b1fa2"];

  return (
    <Container maxWidth="lg">

      {/* ✅ YEAR SELECT */}
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

      {/* ✅ AMC ENDING ALERT */}
      {endingAMC.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="error">
            {endingAMC.length} AMC(s) ending soon:{" "}
            {endingAMC.map((a) => a.plant_name).join(", ")}
            {endingAMC.length > 6 && "..."}
          </Alert>
        </Box>
      )}

      {/* ===== YOUR ORIGINAL UI BELOW (UNCHANGED) ===== */}

      <Grid container spacing={3} sx={{ mb: 4 }}>

        <Grid item xs={12} md={2}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6">Total MW</Typography>
            <Typography variant="h4" color="success.main">
              {totalMW.toFixed(2)}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6">Total Sites</Typography>
            <Typography variant="h4" color="primary">
              {totalSites}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6">Total Customers</Typography>
            <Typography variant="h4" color="secondary">
              {totalCustomers}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card sx={{ p: 3, cursor: "pointer" }}
            onClick={() => navigate("/invoice-list/due")}
          >
            <Typography variant="h6">Due</Typography>
            <Typography variant="h4" color="error">
              {invoiceSummary.due}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card sx={{ p: 3, cursor: "pointer" }}
            onClick={() => navigate("/invoice-list/pending")}
          >
            <Typography variant="h6">Pending</Typography>
            <Typography variant="h4" color="warning.main">
              {invoiceSummary.pending}
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={2}>
          <Card sx={{ p: 3, cursor: "pointer" }}
            onClick={() => navigate("/invoice-list/paid")}
          >
            <Typography variant="h6">Paid</Typography>
            <Typography variant="h4" color="success.main">
              {invoiceSummary.paid}
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

              <Button
                variant="contained"
                onClick={applyFilter}
              >
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

              <Button
                variant="contained"
                color="success"
                onClick={handleExport}
              >
                Export Excel
              </Button>

            </Box>

          </Grid>

        </Grid>

      </Card>

      {/* CHART */}
      <Card sx={{ p: 3, mb: 4 }}>

        <Typography variant="h6" gutterBottom>
          Customer Sites Overview
        </Typography>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData} margin={{ bottom: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="customer"
              tick={{ fontSize: 12 }}
              angle={-35} 
              textAnchor="end"
              interval={0} 
            />
            <YAxis />
            <Tooltip />
            <Bar dataKey="sites" onClick={handleBarClick}>
              {chartData.map((entry, index) => (
                <Cell key={index} fill={barColors[index % barColors.length]} />
              ))}
            </Bar>
          </BarChart>
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

                    <TableCell align="center">
                      {site.plantcapacity_mw || "0"}
                    </TableCell>

                    <TableCell>
                      {site.billing_address?.split(",")[0] || "N/A"}
                    </TableCell>

                    <TableCell>
                      {site.contact_person || "N/A"}
                    </TableCell>

                    <TableCell align="center">
                      {site.po_number || "N/A"}
                    </TableCell>

                    <TableCell align="center">
                      {formatDate(site.amc_start_date)}
                    </TableCell>

                    <TableCell align="center">
                      {formatDate(site.amc_end_date)}
                    </TableCell>

                    <TableCell align="center">
                      {site.billing_cycle || "N/A"}
                    </TableCell>

                    <TableCell>
                      {site.supporting_document_for_invoice || "N/A"}
                    </TableCell>

                    <TableCell align="center">
                      {site.site_visit || "N/A"}
                    </TableCell>

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