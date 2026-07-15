import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import {
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Checkbox,
  Chip,
  Snackbar,
  Alert
} from "@mui/material";

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-CA");
};

export default function EditAMC() {

  const { id } = useParams();

  const [amc, setAmc] = useState({});
  const [schedule, setSchedule] = useState([]);
  const [message, setMessage] = useState({ open: false, severity: "success", text: "" });
  const [savingId, setSavingId] = useState(null);

  const formatAmount = (amount) => new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  }).format(Number(amount || 0));

  const getStatus = (row) => {
    if (row.payment_received) return { label: "Paid", color: "success" };
    if (row.invoice_raised || row.invoice_number) return { label: "Payment Pending", color: "warning" };
    return { label: "Not Raised", color: "default" };
  };

  useEffect(() => {

    const fetchData = async () => {
      try {

        const amcRes = await api.get(`/amc/${id}`);
        setAmc(amcRes.data);

        const scheduleRes = await api.get(`/amc/schedule/${id}`);
        setSchedule(scheduleRes.data.map((row) => ({
          ...row,
          _was_payment_received: Boolean(row.payment_received)
        })));

      } catch (err) {
        console.error("Fetch Error:", err);
        setMessage({ open: true, severity: "error", text: "Unable to load AMC invoice details" });
      }
    };

    fetchData();

  }, [id]);

  const handleChange = (index, field, value) => {

    const updated = [...schedule];
    updated[index][field] = value;

    // Auto set payment date when payment received
    if (field === "payment_received" && value === true && !updated[index].payment_date) {
      updated[index].payment_date = new Date().toISOString().split("T")[0];
    }

    setSchedule(updated);

  };

  const saveRow = async (row, rowId) => {  // Accept 2 params
    try {
      if (!rowId) {
        console.error("❌ No rowId! Check table data:", row);
        setMessage({ open: true, severity: "error", text: "Invalid invoice schedule" });
        return;
      }

      if (row.payment_received && !row._was_payment_received) {
        if (!row.invoice_number || !row.invoice_date) {
          setMessage({ open: true, severity: "error", text: "Enter invoice number and invoice date before receiving payment" });
          return;
        }

        if (!window.confirm("Confirm that payment has been received? This action cannot be reversed.")) {
          return;
        }
      }

      setSavingId(rowId);
      
      const payload = {
        po_number: row.po_number || null,
        po_date: row.po_date || null,
        invoice_number: row.invoice_number || null,
        invoice_date: row.invoice_date || null
      };
      
      console.log("✅ Saving rowId:", rowId, payload);
      await api.put(`/invoice/update/${rowId}`, payload);

      if (row.payment_received && !row._was_payment_received) {
        await api.put(`/amc/receive/${rowId}`);
      }

      setSchedule((current) => current.map((item) =>
        item.id === rowId
          ? {
              ...item,
              invoice_raised: Boolean(item.invoice_number),
              _was_payment_received: Boolean(item.payment_received)
            }
          : item
      ));
      setMessage({ open: true, severity: "success", text: "Invoice schedule saved successfully" });
    } catch (err) {
      console.error("Save error:", err.response?.data || err);
      setMessage({
        open: true,
        severity: "error",
        text: err.response?.data?.error || err.response?.data?.message || "Unable to save invoice schedule"
      });
    } finally {
      setSavingId(null);
    }
  };

  return (

    <Container maxWidth="lg">

      <Typography variant="h4" gutterBottom>
        AMC Invoice Editor
      </Typography>

      {/* AMC INFO */}

      <Card sx={{ mb: 3 }}>
        <CardContent>

          <Typography variant="h6">
            {amc.customer_name}
          </Typography>

          <Typography>
            Plant: {amc.plant_name}
          </Typography>

          <Typography>
            AMC Period: {formatDate(amc.amc_start_date)} → {formatDate(amc.amc_end_date)}
          </Typography>

          <Typography>
            Total AMC Amount: ₹ {amc.total_amount_without_gst}
          </Typography>

        </CardContent>
      </Card>

      {/* INVOICE SCHEDULE */}

      {schedule.map((row, index) => (

        <Card key={row.id} sx={{ mb: 2 }}>
          <CardContent>

            <Grid container spacing={2} alignItems="center">

              <Grid item xs={12}>
                <Chip {...getStatus(row)} size="small" />
              </Grid>

              <Grid item xs={1}>
                <Typography>
                  P{row.period_number}
                </Typography>
              </Grid>

              <Grid item xs={2}>
                <Typography>
                  Due: {formatDate(row.due_date)}
                </Typography>
              </Grid>

              <Grid item xs={1}>
                <Typography>
                  {formatAmount(row.invoice_amount ?? row.amount)}
                </Typography>
              </Grid>

              <Grid item xs={2}>
                <TextField
                  label="PO Number"
                  value={row.po_number || ""}
                  disabled={row._was_payment_received}
                  onChange={(e) =>
                    handleChange(index, "po_number", e.target.value)
                  }
                  fullWidth
                />
              </Grid>

              <Grid item xs={2}>
                <TextField
                  type="date"
                  label="PO Date"
                  InputLabelProps={{ shrink: true }}
                  value={row.po_date ? formatDate(row.po_date) : ""}
                  disabled={row._was_payment_received}
                  onChange={(e) =>
                    handleChange(index, "po_date", e.target.value)
                  }
                  fullWidth
                />
              </Grid>

              <Grid item xs={2}>
                <TextField
                  label="Invoice Number"
                  value={row.invoice_number || ""}
                  disabled={row._was_payment_received}
                  onChange={(e) =>
                    handleChange(index, "invoice_number", e.target.value)
                  }
                  fullWidth
                />
              </Grid>

              <Grid item xs={2}>
                <TextField
                  type="date"
                  label="Invoice Date"
                  InputLabelProps={{ shrink: true }}
                  value={row.invoice_date ? formatDate(row.invoice_date) : ""}
                  disabled={row._was_payment_received}
                  onChange={(e) =>
                    handleChange(index, "invoice_date", e.target.value)
                  }
                  fullWidth
                />
              </Grid>

              <Grid item xs={2}>
                <TextField
                  type="date"
                  label="Payment Date"
                  InputLabelProps={{ shrink: true }}
                  value={row.payment_date ? formatDate(row.payment_date) : ""}
                  disabled
                  fullWidth
                />
              </Grid>

              <Grid item xs={1}>
                <Typography variant="caption">
                  Raised
                </Typography>
                <Checkbox
                  checked={row.invoice_raised || false}
                  disabled
                />
              </Grid>

              <Grid item xs={1}>
                <Typography variant="caption">
                  Paid
                </Typography>
                <Checkbox
                  checked={row.payment_received || false}
                  disabled={row._was_payment_received || !row.invoice_number || !row.invoice_date}
                  onChange={(e) =>
                    handleChange(index, "payment_received", e.target.checked)
                  }
                />
              </Grid>

              <Grid item xs={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => saveRow(row, row.id)}
                  disabled={row._was_payment_received || savingId === row.id}
                  fullWidth
                >
                  {savingId === row.id ? "Saving..." : "Save"}
                </Button>
              </Grid>

            </Grid>

          </CardContent>
        </Card>

      ))}

      <Snackbar
        open={message.open}
        autoHideDuration={4000}
        onClose={() => setMessage((current) => ({ ...current, open: false }))}
      >
        <Alert
          severity={message.severity}
          variant="filled"
          onClose={() => setMessage((current) => ({ ...current, open: false }))}
        >
          {message.text}
        </Alert>
      </Snackbar>

    </Container>

  );

}
