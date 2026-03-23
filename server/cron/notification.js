const cron = require("node-cron");
const pool = require("../db");
const nodemailer = require("nodemailer");

// ======================================
// MAIL CONFIGURATION
// ======================================
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // TLS
  auth: {
    user: process.env.EMAIL_USER, // support@saiautomation.co.in
    pass: process.env.EMAIL_PASS  // your outlook password
  },
  tls: {
    ciphers: "SSLv3"
  }
});

// ======================================
// RUN DAILY AT 9:00 AM
// ======================================
cron.schedule("* * * * *", async () => {
  console.log("Running Invoice Notification Cron...");

  try {

    // ======================================
    // 1️⃣ INVOICE RAISE ALERT (3 DAYS BEFORE DUE DATE)
    // ======================================
    const upcoming = await pool.query(
      `SELECT s.*, a.customer_name, a.plant_name
       FROM invoice_schedule s
       JOIN amc_site_entry a ON s.amc_id = a.id
       WHERE s.due_date = CURRENT_DATE + INTERVAL '3 days'
       AND s.invoice_number IS NULL
       AND s.notification_sent = FALSE`
    );

    for (let row of upcoming.rows) {

      await transporter.sendMail({
        from: "support@saiautomation.co.in",
        to: "account@saiautomation.co.in",
        subject: "🚨 Invoice Raise Alert - 3 Days Due",
        html: `
          <h3>Invoice Raise Required</h3>
          <p><strong>Customer:</strong> ${row.customer_name}</p>
          <p><strong>Plant:</strong> ${row.plant_name}</p>
          <p><PO Number:</strong> ${row.po_number || "Not Generated Yet"}</p>
          <p><strong>Period:</strong> ${row.period_number}</p>
          <p><strong>Due Date:</strong> ${row.due_date}</p>
        `
      });

      await pool.query(
        "UPDATE invoice_schedule SET notification_sent=TRUE WHERE id=$1",
        [row.id]
      );
    }


    // ======================================
    // 2️⃣ PAYMENT REMINDER (20 DAYS AFTER DUE DATE)
    // ======================================
    const paymentReminder = await pool.query(
      `SELECT s.*, a.customer_name, a.plant_name
       FROM invoice_schedule s
       JOIN amc_site_entry a ON s.amc_id = a.id
       WHERE s.due_date = CURRENT_DATE - INTERVAL '20 days'
       AND s.payment_received = FALSE`
    );

    for (let row of paymentReminder.rows) {

      await transporter.sendMail({
        from: "support@saiautomation.co.in",
        to: "account@saiautomation.co.in",
        subject: "💰 Payment Reminder - 20 Days Overdue",
        html: `
          <h3>Payment Overdue</h3>
          <p><strong>Customer:</strong> ${row.customer_name}</p>
          <p><strong>Plant:</strong> ${row.plant_name}</p>
          <p><strong>PO Number:</strong> ${row.po_number || "Not Generated Yet"}</p>
          <p><strong>Period:</strong> ${row.period_number}</p>
          <p><strong>Due Date:</strong> ${row.due_date}</p>
        `
      });

    }


    // ======================================
    // 3️⃣ AMC ENDING THIS MONTH NOTIFICATION
    // ======================================
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const endingAmc = await pool.query(
      `SELECT customer_name, plant_name, amc_end_date
       FROM amc_site_entry
       WHERE amc_end_date BETWEEN $1 AND $2`,
      [firstDay, lastDay]
    );

    if (endingAmc.rows.length > 0) {

      const amcList = endingAmc.rows.map(row =>
        `${row.customer_name} - ${row.plant_name} (Ends: ${new Date(row.amc_end_date).toLocaleDateString("en-IN")})`
      ).join("<br>");

      await transporter.sendMail({
        from: "support@saiautomation.co.in",
        to: "santhosh@saiautomation.co.in,arunchandar@saiautomation.co.in",
        cc: "account@saiautomation.co.in",
        subject: `⚠️ ${now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} - ${endingAmc.rows.length} AMCs Ending`,
        html: `
          <h2>AMCs Ending This Month</h2>
          <p>The following AMCs are ending this month:</p>

          <div style="background:#f5f5f5;padding:15px;border-radius:5px">
            ${amcList}
          </div>

          <hr>

          <p><strong>Action Required:</strong> Send renewal offers.</p>
          <p><em>Automated notification - ${new Date().toLocaleString("en-IN")}</em></p>
        `
      });

    }

  } catch (err) {

    console.error("CRON ERROR:", err);

  }

});