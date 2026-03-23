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
  Checkbox
} from "@mui/material";

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-CA");
};

export default function EditAMC() {

  const { id } = useParams();

  const [amc, setAmc] = useState({});
  const [schedule, setSchedule] = useState([]);

  useEffect(() => {

    const fetchData = async () => {
      try {

        const amcRes = await api.get(`/amc/${id}`);
        setAmc(amcRes.data);

        const scheduleRes = await api.get(`/amc/schedule/${id}`);
        setSchedule(scheduleRes.data);

      } catch (err) {
        console.error("Fetch Error:", err);
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
        alert("Invalid row ID");
        return;
      }
      
      const payload = {
        po_number: row.po_number || null,
        invoice_number: row.invoice_number || null,
        invoice_date: row.invoice_date || null,
        payment_received: Boolean(row.payment_received),
        payment_date: row.payment_date || null
      };
      
      console.log("✅ Saving rowId:", rowId, payload);
      await api.put(`/invoice/update/${rowId}`, payload);
      alert("✅ Saved!");
    } catch (err) {
      console.error("Save error:", err.response?.data || err);
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
                  ₹ {row.amount}
                </Typography>
              </Grid>

              <Grid item xs={2}>
                <TextField
                  label="PO Number"
                  value={row.po_number || ""}
                  onChange={(e) =>
                    handleChange(index, "po_number", e.target.value)
                  }
                  fullWidth
                />
              </Grid>

              <Grid item xs={2}>
                <TextField
                  label="Invoice Number"
                  value={row.invoice_number || ""}
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
                  onChange={(e) =>
                    handleChange(index, "payment_date", e.target.value)
                  }
                  fullWidth
                />
              </Grid>

              <Grid item xs={1}>
                <Typography variant="caption">
                  Raised
                </Typography>
                <Checkbox
                  checked={row.invoice_raised || false}
                  onChange={(e) =>
                    handleChange(index, "invoice_raised", e.target.checked)
                  }
                />
              </Grid>

              <Grid item xs={1}>
                <Typography variant="caption">
                  Paid
                </Typography>
                <Checkbox
                  checked={row.payment_received || false}
                  onChange={(e) =>
                    handleChange(index, "payment_received", e.target.checked)
                  }
                />
              </Grid>

              <Grid item xs={2}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => saveRow(row, row.id)}  // ✅ Pass row + ID
                  fullWidth
                >
                  Save
                </Button>
              </Grid>

            </Grid>

          </CardContent>
        </Card>

      ))}

    </Container>

  );

}
