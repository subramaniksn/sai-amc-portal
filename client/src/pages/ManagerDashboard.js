import { useState, useEffect } from "react";
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
  TableRow
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

export default function ManagerDashboard() {

  const [sites, setSites] = useState([]);
  const [filteredSites, setFilteredSites] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [mwFilter, setMwFilter] = useState("");
  const [siteCountFilter, setSiteCountFilter] = useState("");

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const res = await api.get("/amc");
      const data = res.data || [];
      setSites(data);
      setFilteredSites(data);
    } catch (err) {
      console.error("Failed to load sites:", err);
    }
  };

  // SAFE DATE FORMAT
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

  const totalMW = sites.reduce(
    (sum, s) => sum + parseFloat(s.plantcapacity_mw || 0),
    0
  );

  // GROUP DATA FOR CHART
  const grouped = filteredSites.reduce((acc, site) => {

    const customer = site.customer_name || "Unknown";

    if (!acc[customer]) acc[customer] = [];

    acc[customer].push(site);

    return acc;

  }, {});

  const chartData = Object.entries(grouped).map(([customer, customerSites]) => {

    const totalMW = customerSites.reduce(
      (sum, s) => sum + parseFloat(s.plantcapacity_mw || 0),
      0
    );

    return {
      customer,
      sites: customerSites.length,
      mw: totalMW
    };

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

    setSelectedCustomer({
      name: customer,
      sites: sitesOfCustomer
    });

  };
 
  const barColors = [
    "#ff9800",
    "#1976d2",
    "#2e7d32",
    "#d32f2f",
    "#7b1fa2"
  ];

  return (

    <Container maxWidth="lg">

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

                  <TableCell sx={{ minWidth: 120 }}>Plant Name</TableCell>
                  <TableCell align="center">MW</TableCell>
                  <TableCell sx={{ minWidth: 180 }}>Billing Address</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Contact Person</TableCell>
                  <TableCell align="center">PO No</TableCell>
                  <TableCell align="center">AMC Start</TableCell>
                  <TableCell align="center">AMC End</TableCell>
                  <TableCell align="center">Billing Cycle</TableCell>
                  <TableCell sx={{ minWidth: 200 }}>Supporting Document</TableCell>
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