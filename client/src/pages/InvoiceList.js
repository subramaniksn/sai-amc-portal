import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import api from "../api";

import {
  Container,
  Typography,
  CircularProgress,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  TableContainer
} from "@mui/material";

export default function InvoiceList() {
  const { type } = useParams();
  const location = useLocation();
  const year = location.state?.year || "";
  const status = location.state?.status || "";  // ✅ read status from navigate state

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  // =========================
  // FORMAT DATE -> DD-MM-YYYY
  // =========================
  const formatDate = (date) => {
    if (!date) return "";
    const parts = date.split("-");
    if (parts.length !== 3) return date;
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  };

  // =========================
  // FETCH DATA
  // =========================
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/invoice/invoice-list/${type}`, {
          params: {
            year: year || undefined,
            status: status || undefined   // ✅ pass status to backend
          }
        });
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch invoices:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [type, year, status]);  // ✅ status in dependency array

  // =========================
  // ROW COLOR LOGIC
  // =========================
  const getRowColor = (status) => {
    if (!status) return "#ffffff";
    const s = status.toLowerCase();
    if (s === "overdue" || s === "payment pending") return "#ffebee";
    if (s === "upcoming") return "#fff3e0";
    if (s === "due today") return "#fff8e1";
    if (s === "paid") return "#e8f5e9";
    return "#ffffff";
  };

  // =========================
  // TITLE LABEL
  // =========================
  const statusLabel =
    status === "live"      ? "🟢 Live" :
    status === "completed" ? "🔴 Completed" : "📋 All";

  return (
    <Container maxWidth="lg">

      {/* TITLE */}
      <Typography variant="h4" gutterBottom sx={{ mb: 1 }}>
        {type?.toUpperCase()} Invoices
      </Typography>

      {/* SUBTITLE — shows which filter is active */}
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
        {statusLabel} {year ? `· ${year}-${Number(year)+1}` : "· All Years"}
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

      {/* TABLE */}
      {!loading && data.length > 0 && (
        <TableContainer
          component={Paper}
          elevation={5}
          sx={{
            maxHeight: 700,
            overflow: "auto",
            "&::-webkit-scrollbar": { width: "12px" },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#888",
              borderRadius: "4px"
            }
          }}
        >
          <Table stickyHeader>

            {/* HEADER */}
            <TableHead>
              <TableRow>
                {["Plant Name", "Customer", "PO Number", "Invoice Number", "Quarter", "Due Date", "Status"].map((head) => (
                  <TableCell
                    key={head}
                    sx={{
                      backgroundColor: "#1976d2",
                      color: "#fff",
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
              {data.map((d, index) => (
                <TableRow
                  key={index}
                  hover
                  sx={{
                    backgroundColor: getRowColor(d.invoice_status),
                    transition: "0.3s"
                  }}
                >
                  <TableCell>{d.plant_name}</TableCell>
                  <TableCell>{d.customer_name}</TableCell>
                  <TableCell>{d.po_number}</TableCell>
                  <TableCell>{d.invoice_number || "N/A"}</TableCell>
                  <TableCell>Q{d.period_number}</TableCell>
                  <TableCell>{formatDate(d.due_date)}</TableCell>
                  <TableCell sx={{ fontWeight: "bold" }}>
                    {d.invoice_status}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>

          </Table>
        </TableContainer>
      )}

    </Container>
  );
}