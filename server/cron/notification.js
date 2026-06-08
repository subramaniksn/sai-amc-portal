const cron = require("node-cron");
const pool = require("../db");

// ==============================
// WHATSAPP SOCKET IMPORT
// ==============================
const { sock, isWhatsAppReady } = require("../whatsapp");

// ==============================
// SEND WHATSAPP HELPER
// ==============================
async function sendWhatsApp(number, message) {
  try {
    if (!isWhatsAppReady) {
      console.log("⚠️ WhatsApp not ready");
      return;
    }

    const jid = number.includes("@s.whatsapp.net")
      ? number
      : `${number}@s.whatsapp.net`;

    await sock.sendMessage(jid, { text: message });

    console.log("✅ WhatsApp sent to:", number);
  } catch (err) {
    console.error("WHATSAPP SEND ERROR:", err.message);
  }
}

// ==============================
// GET USERS BY IDS
// ==============================
const getUserPhonesByIds = async (ids) => {
  const result = await pool.query(
    `SELECT phone FROM users WHERE id = ANY($1) AND phone IS NOT NULL`,
    [ids]
  );

  return result.rows.map(r => r.phone);
};

// ======================================
// CRON (EVERY MINUTE - TEST MODE)
// ======================================
cron.schedule("* * * * *", async () => {
  console.log("Running WhatsApp Invoice Cron...");

  try {

    // ==============================
    // 1️⃣ INVOICE ALERT (3 DAYS BEFORE DUE)
    // SENT TO ID 5 (ACCOUNTS)
    // ==============================
    const upcoming = await pool.query(`
      SELECT s.*, a.customer_name, a.plant_name
      FROM invoice_schedule s
      JOIN amc_site_entry a ON s.amc_id = a.id
      WHERE s.due_date = CURRENT_DATE + INTERVAL '3 days'
      AND s.invoice_number IS NULL
      AND s.notification_sent = FALSE
    `);

    const accountsPhones = await getUserPhonesByIds([5]);

    for (let row of upcoming.rows) {

      const msg = `
🚨 *Invoice Raise Alert*

Customer: ${row.customer_name}
Plant: ${row.plant_name}
PO Number: ${row.po_number || "Not Generated"}
Period: ${row.period_number}
Due Date: ${row.due_date}
      `;

      for (let phone of accountsPhones) {
        await sendWhatsApp(phone, msg);
      }

      await pool.query(
        "UPDATE invoice_schedule SET notification_sent=TRUE WHERE id=$1",
        [row.id]
      );
    }


    // ==============================
    // 2️⃣ PAYMENT REMINDER
    // SENT TO ID 5 (ACCOUNTS)
    // ==============================
    const paymentReminder = await pool.query(`
      SELECT s.*, a.customer_name, a.plant_name
      FROM invoice_schedule s
      JOIN amc_site_entry a ON s.amc_id = a.id
      WHERE s.due_date = CURRENT_DATE - INTERVAL '20 days'
      AND s.payment_received = FALSE
    `);

    const accountsPhones2 = await getUserPhonesByIds([5]);

    for (let row of paymentReminder.rows) {

      const msg = `
💰 *Payment Reminder (20 Days Overdue)*

Customer: ${row.customer_name}
Plant: ${row.plant_name}
PO Number: ${row.po_number || "Not Generated"}
Period: ${row.period_number}
Due Date: ${row.due_date}
      `;

      for (let phone of accountsPhones2) {
        await sendWhatsApp(phone, msg);
      }
    }


    // ==============================
    // 3️⃣ AMC ENDING THIS MONTH
    // SENT TO ID 4 & 6 (MANAGERS)
    // ==============================
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const endingAmc = await pool.query(`
      SELECT customer_name, plant_name, amc_end_date
      FROM amc_site_entry
      WHERE amc_end_date BETWEEN $1 AND $2
    `, [firstDay, lastDay]);

    const managerPhones = await getUserPhonesByIds([4, 6]);

    if (endingAmc.rows.length > 0) {

      let msg = `⚠️ *AMCs Ending This Month*\n\n`;

      endingAmc.rows.forEach(r => {
        msg += `• ${r.customer_name} - ${r.plant_name} (Ends: ${r.amc_end_date})\n`;
      });

      for (let phone of managerPhones) {
        await sendWhatsApp(phone, msg);
      }
    }

  } catch (err) {
    console.error("CRON ERROR:", err);
  }
});