const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

const authRoutes = require("./routes/auth");
const amcRoutes = require("./routes/amc");
const invoiceRoutes = require("./routes/invoice");

require("./cron/notification");

const app = express();

// =========================
// MIDDLEWARE
// =========================
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Origin not allowed by CORS"));
  }
}));
app.use(express.json({ limit: "100kb" }));

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

// ✅ FIXED LINE HERE
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

// =========================
// SERVER
// =========================
const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`🚀 AMC Server running on port ${PORT}`);
});
