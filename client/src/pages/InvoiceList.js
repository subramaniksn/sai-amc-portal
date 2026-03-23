import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api";
import {
Container,
Typography,
Card,
CardContent,
Grid,
CircularProgress,
Box
} from "@mui/material";

export default function InvoiceList() {

const { type } = useParams();

const [data, setData] = useState([]);
const [loading, setLoading] = useState(true);

// FORMAT DATE -> DD-MM-YYYY
const formatDate = (date) => {
if (!date) return "";
const parts = date.split("-");
if (parts.length !== 3) return date;
return `${parts[2]}-${parts[1]}-${parts[0]}`;
};

useEffect(() => {


const fetchData = async () => {
  try {

    const res = await api.get(`/invoice/invoice-list/${type}`);

    setData(res.data);

  } catch (err) {

    console.error("Failed to fetch invoices:", err);

  } finally {

    setLoading(false);

  }
};

fetchData();


}, [type]);

// CARD COLOR BASED ON STATUS
const getCardColor = (status) => {


if (!status) return "#ffffff";

const s = status.toLowerCase();

if (s === "overdue" || s === "payment pending") return "#ffebee";
if (s === "upcoming") return "#fff3e0";
if (s === "paid") return "#e8f5e9";

return "#ffffff";


};

return ( <Container maxWidth="lg">


  <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
    {type.toUpperCase()} Invoices
  </Typography>

  {/* LOADING */}
  {loading && (
    <Box sx={{ textAlign: "center", mt: 5 }}>
      <CircularProgress />
    </Box>
  )}

  {/* NO DATA */}
  {!loading && data.length === 0 && (
    <Typography>No invoices found</Typography>
  )}

  {/* INVOICE CARDS */}
  <Grid container spacing={3}>

    {data.map((d, index) => (

      <Grid item xs={12} md={4} key={index}>

        <Card sx={{ backgroundColor: getCardColor(d.invoice_status) }}>

          <CardContent>

            <Typography variant="h6">
              {d.plant_name}
            </Typography>

            <Typography>
              Customer: {d.customer_name}
            </Typography>

            <Typography>
              Quarter: Q{d.period_number}
            </Typography>

            <Typography>
              Due Date: {formatDate(d.due_date)}
            </Typography>

            <Typography sx={{ mt: 1, fontWeight: "bold" }}>
              Status: {d.invoice_status}
            </Typography>

          </CardContent>

        </Card>

      </Grid>

    ))}

  </Grid>

</Container>


);
}
