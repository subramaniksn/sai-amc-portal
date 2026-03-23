const { Pool } = require("pg");
require("dotenv").config(); // Load .env variables

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,   // now reads DB_NAME=amc
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Optional: test connection when server starts
pool.connect((err, client, release) => {
  if (err) {
    return console.error("❌ Error connecting to PostgreSQL:", err.stack);
  }
  console.log("✅ Connected to PostgreSQL database:", process.env.DB_NAME);
  release();
});

module.exports = pool;