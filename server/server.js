const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth");
const amcRoutes = require("./routes/amc");
const invoiceRoutes = require("./routes/invoice");

require("./cron/notification");

const app = express();

app.use(cors());
app.use(express.json());

// =========================
// ROUTES
// =========================

app.use("/api/auth", authRoutes);
app.use("/api/amc", amcRoutes);
app.use("/api/invoice", invoiceRoutes);

// =========================
// SERVER
// =========================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 AMC Server running on port ${PORT}`);
});
