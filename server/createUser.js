const bcrypt = require("bcryptjs");
const pool = require("./db");

async function createUser() {
  const hashedPassword = await bcrypt.hash("manager123", 10);

  await pool.query(
    `INSERT INTO users (name, email, password, role)
     VALUES ($1,$2,$3,$4)`,
    ["Manager User", "manager@sai.com", hashedPassword, "Manager"]
  );

  console.log("User created successfully");
  process.exit();
}

createUser();