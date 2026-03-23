const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const amcRoutes = require("./routes/amc");
const invoiceRoutes = require("./routes/invoice");

require("./cron/notification");

const app = express();

// =========================
// MIDDLEWARE
// =========================
app.use(cors());
app.use(express.json());

// =========================
// API ROUTES
// =========================
app.use("/api/auth", authRoutes);
app.use("/api/amc", amcRoutes);
app.use("/api/invoice", invoiceRoutes);

// =========================
// FRONTEND (React build)
// =========================
app.use(express.static(path.join(__dirname, "../client/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

// =========================
// SERVER
// =========================
const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`🚀 AMC Server running on port ${PORT}`);
});