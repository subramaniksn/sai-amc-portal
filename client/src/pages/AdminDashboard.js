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
  Chip
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
  const [invoiceSummary, setInvoiceSummary] = useState({
    due: 0,
    pending: 0,
    paid: 0
  });

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const role = user.role;
  const [pendingCustomer, setPendingCustomer] = useState([]);

  const fetchPendingCustomer = async () => {
    try {
      const res = await api.get("/amc/pending-by-customer");
      setPendingCustomer(res.data);
    } catch (err) {
      console.error("Pending Customer Error:", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchInvoiceSummary();
    fetchPendingCustomer();
  }, []);

  const getPendingForPlant = (plantName) => {
    const p = pendingCustomer.find(
      (row) => row.plant_name === plantName
    );

    return {
      pending: p?.pending_amount || 0,
      received: p?.received_amount || 0
    };
  };
  
  const fetchData = async () => {
    try {
      // Fetch AMC data (aggregated totals from invoice_schedule)
      const res = await api.get("/amc");
      setData(res.data);

      // Fetch upcoming invoices
      const upcomingRes = await api.get("/amc/upcoming");
      setUpcoming(upcomingRes.data);
    } catch (err) {
      console.error("Fetch Data Error:", err);
    }
  };

  const fetchInvoiceSummary = async () => {
    try {
      const res = await api.get("/invoice/invoice-summary");
      setInvoiceSummary(res.data);
    } catch (err) {
      console.error("Invoice Summary Error:", err);
    }
  };  

  const formatCurrency = (num) =>
    new Intl.NumberFormat("en-IN").format(num || 0);

  // ===============================
  // FINANCIAL CALCULATIONS
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
        AMC Dashboard
      </Typography>

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
            elevation={4}
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/invoice-list/due")}
          >
            <CardContent>
              <Typography variant="h6">Due Invoices</Typography>
              <Typography variant="h4" color="error">
                {invoiceSummary.due}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            elevation={4}
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/invoice-list/pending")}
          >
            <CardContent>
              <Typography variant="h6">Pending Payment</Typography>
              <Typography variant="h4" color="warning.main">
                {invoiceSummary.pending}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            elevation={4}
            sx={{ cursor: "pointer" }}
            onClick={() => navigate("/invoice-list/paid")}
          >
            <CardContent>
              <Typography variant="h6">Paid Invoices</Typography>
              <Typography variant="h4" color="success.main">
                {invoiceSummary.paid}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* UPCOMING ALERT */}
      {upcoming.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Alert severity="warning">
            {upcoming.length} Invoice(s) to be raised within 7 days!
          </Alert>
        </Box>
      )}

      {/* ACTION BUTTONS */}
      <Box sx={{ mb: 3 }}>
        {role === "Admin" && (
          <Button
            variant="contained"
            component={Link}
            to="/add-amc"
            sx={{ mr: 2 }}
          >
            Add AMC
          </Button>
        )}

        <Button
          variant="outlined"
          color="secondary"
          onClick={async () => {
            try {
              const token = localStorage.getItem("token");
              const response = await api.get("/amc/export", {
                responseType: "blob",
                headers: { Authorization: `Bearer ${token}` }
              });
              const blob = new Blob([response.data], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "amc-data.xlsx";
              a.click();
              window.URL.revokeObjectURL(url);
            } catch (error) {
              alert("Export failed");
            }
          }}
        >
          Export Excel
        </Button>
      </Box>

      {/* BAR CHART */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Pending Amount by Customer
          </Typography>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart 
              data={chartData} 
              margin={{ bottom: 80 }} // space for rotated labels
            >              
              <XAxis
                dataKey="customer_name"
                tick={{ fontSize: 12 }}
                angle={-35}           // rotate labels
                textAnchor="end"       // align rotated text
                interval={0}           // show all labels
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="pending" fill="#ff9800" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* AMC LIST */}
      <Grid container spacing={3}>
        {data.map((d) => {

          const payment = getPendingForPlant(d.plant_name);

          const pending = payment.pending;
          const received = payment.received;

          let status = "Pending";
          let color = "error";

          if (pending === 0) {
            status = "Paid";
            color = "success";
          } else if (received > 0) {
            status = "Partial";
            color = "warning";
          }

          return (
            <Grid item xs={12} md={4} key={d.id}>
              <Card elevation={3}>
                <CardContent>
                  <Typography variant="h6">{d.plant_name}</Typography>
                  <Typography>Pending: ₹ {formatCurrency(pending)}</Typography>
                  <Typography>Received: ₹ {formatCurrency(received)}</Typography>
                  <Box sx={{ mt: 1 }}>
                    <Chip label={status} color={color} size="small" />
                  </Box>
                  {role === "Admin" && (
                    <Button
                      component={Link}
                      to={`/edit/${d.id}`}
                      size="small"
                      sx={{ mt: 1 }}
                    >
                      Edit
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

    </Container>
  );
}