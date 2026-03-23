import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import {
  Container,
  TextField,
  Grid,
  Button,
  Typography,
  Card,
  CardContent,
  MenuItem,
  FormControl,
  InputLabel,
  Select
} from "@mui/material";

export default function AMCForm() {

  const navigate = useNavigate();

  const [form, setForm] = useState({
    customer_name: "",
    plant_name: "",
    billing_address: "",
    contact_person: "",
    plantcapacity_mw: "",
    amc_start_date: "",
    amc_end_date: "",
    supporting_document_for_invoice: "",
    billing_cycle: "",
    site_visit: "",
    invoice_raise_timing: "",
    total_amount_without_gst: "",
    po_no: "",
    po_date: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSelectChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const submit = async () => {

  try {

    if (!form.invoice_raise_timing) {
      alert("Please select Invoice Raise Timing");
      return;
    }

    const payload = {
      customer_name: form.customer_name,
      plant_name: form.plant_name,
      billing_address: form.billing_address,
      contact_person: form.contact_person,
      plantcapacity_mw: Number(form.plantcapacity_mw),
      amc_start_date: form.amc_start_date,
      amc_end_date: form.amc_end_date,
      supporting_document_for_invoice: form.supporting_document_for_invoice,
      billing_cycle: form.billing_cycle,
      site_visit: form.site_visit,
      invoice_raise_timing: form.invoice_raise_timing,
      total_amount_without_gst: Number(form.total_amount_without_gst),
      po_number: form.po_no
    };

    // Create AMC
    await api.post("/amc", payload);

    alert("AMC Created Successfully");

    navigate("/dashboard");

  } catch (err) {

    console.error("Error creating AMC:", err.response?.data || err);

    alert(
      err.response?.data?.error ||
      err.message ||
      "Error creating AMC"
    );

  }

};

  return (

    <Container maxWidth="md">

      <Card>

        <CardContent>

          <Typography variant="h5" gutterBottom>
            New AMC Site Entry
          </Typography>

          <Grid container spacing={2}>

            {[
              { key: "customer_name", label: "Customer Name" },
              { key: "plant_name", label: "Plant Name" },
              { key: "billing_address", label: "Billing Address" },
              { key: "contact_person", label: "Contact Person" },
              { key: "plantcapacity_mw", label: "Plant Capacity (MW)", type: "number" },
              { key: "amc_start_date", label: "AMC Start Date", type: "date" },
              { key: "amc_end_date", label: "AMC End Date", type: "date" },
              { key: "supporting_document_for_invoice", label: "Supporting Document" },
              { key: "site_visit", label: "Site Visit" },
              { key: "total_amount_without_gst", label: "Total Amount (₹)", type: "number" },
              { key: "po_no", label: "PO Number" },
              { key: "po_date", label: "PO Date", type: "date" }
            ].map((field) => (

              <Grid item xs={12} md={6} key={field.key}>

                <TextField
                  fullWidth
                  label={field.label}
                  name={field.key}
                  type={field.type || "text"}
                  InputLabelProps={field.type === "date" ? { shrink: true } : {}}
                  value={form[field.key]}
                  onChange={handleChange}
                />

              </Grid>

            ))}

            {/* Billing Cycle */}

            <Grid item xs={12} md={6}>

              <FormControl fullWidth>

                <InputLabel>Billing Cycle</InputLabel>

                <Select
                  name="billing_cycle"
                  value={form.billing_cycle}
                  onChange={handleSelectChange}
                >

                  <MenuItem value="">
                    <em>Select</em>
                  </MenuItem>

                  <MenuItem value="Monthly">Monthly</MenuItem>
                  <MenuItem value="Quarterly">Quarterly</MenuItem>
                  <MenuItem value="Half Yearly">Half Yearly</MenuItem>
                  <MenuItem value="Yearly">Yearly</MenuItem>

                </Select>

              </FormControl>

            </Grid>

            {/* Invoice Raise Timing */}

            <Grid item xs={12} md={6}>

              <FormControl fullWidth>

                <InputLabel>Invoice Raise Timing</InputLabel>

                <Select
                  name="invoice_raise_timing"
                  value={form.invoice_raise_timing}
                  onChange={handleSelectChange}
                >

                  <MenuItem value="">
                    <em>Select</em>
                  </MenuItem>

                  <MenuItem value="START">START</MenuItem>
                  <MenuItem value="END">END</MenuItem>

                </Select>

              </FormControl>

            </Grid>

          </Grid>

          <Button
            variant="contained"
            sx={{ mt: 3 }}
            onClick={submit}
          >
            Save AMC
          </Button>

        </CardContent>

      </Card>

    </Container>

  );

}
