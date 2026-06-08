const cron = require("node-cron");
const pool = require("../db");
const whatsapp = require("../whatsapp");

// ==============================
// SEND WHATSAPP
// ==============================
async function sendWhatsApp(number, message) {
  try {
    if (!whatsapp.isReady()) {
      console.log("⚠️ WhatsApp not ready");
      return;
    }

    const sock = whatsapp.getSock();

    if (!sock) {
      console.log("⚠️ WhatsApp socket unavailable");
      return;
    }

    const jid = `${number}@s.whatsapp.net`;

    await sock.sendMessage(jid, {
      text: message
    });

    console.log(`✅ WhatsApp sent to ${number}`);
  } catch (err) {
    console.error("WHATSAPP SEND ERROR:", err.message);
  }
}

// ==============================
// GET USER PHONES
// ==============================
async function getUserPhonesByIds(ids) {
  try {
    const result = await pool.query(
      `
      SELECT phone
      FROM users
      WHERE id = ANY($1)
      AND phone IS NOT NULL
      AND phone <> ''
      `,
      [ids]
    );

    return result.rows.map(r => r.phone);
  } catch (err) {
    console.error("PHONE FETCH ERROR:", err);
    return [];
  }
}

// ======================================
// CRON
// ======================================
// TEST MODE = EVERY MINUTE
// PRODUCTION = 0 9 * * *
// ======================================

cron.schedule("* * * * *", async () => {
  console.log("Running WhatsApp Invoice Cron...");

  try {

    // ====================================================
    // 1. INVOICE RAISE ALERT
    // SEND TO USER ID = 5 (Accounts)
    // ====================================================

    const invoiceUsers = await getUserPhonesByIds([5]);

    const upcoming = await pool.query(`
      SELECT
        s.*,
        a.customer_name,
        a.plant_name
      FROM invoice_schedule s
      JOIN amc_site_entry a
      ON a.id = s.amc_id
      WHERE s.due_date = CURRENT_DATE + INTERVAL '3 days'
      AND s.invoice_number IS NULL
      AND s.notification_sent = FALSE
    `);

    for (const row of upcoming.rows) {

      const msg =
`🚨 *Invoice Raise Alert*

Customer: ${row.customer_name}
Plant: ${row.plant_name}
PO Number: ${row.po_number || "Not Generated"}
Quarter: ${row.period_number}
Due Date: ${row.due_date}

Please raise the invoice.`;

      for (const phone of invoiceUsers) {
        await sendWhatsApp(phone, msg);
      }

      await pool.query(
        `
        UPDATE invoice_schedule
        SET notification_sent = TRUE
        WHERE id = $1
        `,
        [row.id]
      );
    }

    // ====================================================
    // 2. PAYMENT REMINDER
    // SEND TO USER ID = 5 (Accounts)
    // ====================================================

    const paymentReminder = await pool.query(`
      SELECT
        s.*,
        a.customer_name,
        a.plant_name
      FROM invoice_schedule s
      JOIN amc_site_entry a
      ON a.id = s.amc_id
      WHERE s.due_date = CURRENT_DATE - INTERVAL '20 days'
      AND s.payment_received = FALSE
    `);

    for (const row of paymentReminder.rows) {

      const msg =
`💰 *Payment Reminder*

Customer: ${row.customer_name}
Plant: ${row.plant_name}
PO Number: ${row.po_number || "Not Generated"}
Quarter: ${row.period_number}
Due Date: ${row.due_date}

Payment is pending for more than 20 days.`;

      for (const phone of invoiceUsers) {
        await sendWhatsApp(phone, msg);
      }
    }

    // ====================================================
    // 3. AMC EXPIRY ALERT
    // SEND TO USER ID = 4 & 6
    // ====================================================

    const managerUsers = await getUserPhonesByIds([4, 6]);

    const now = new Date();

    const firstDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    );

    const lastDay = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    );

    const endingAmc = await pool.query(
      `
      SELECT
        customer_name,
        plant_name,
        amc_end_date
      FROM amc_site_entry
      WHERE amc_end_date BETWEEN $1 AND $2
      `,
      [firstDay, lastDay]
    );

    if (endingAmc.rows.length > 0) {

      let msg = "⚠️ *AMCs Ending This Month*\n\n";

      endingAmc.rows.forEach(row => {
        msg +=
`${row.customer_name}
${row.plant_name}
End Date: ${new Date(row.amc_end_date).toLocaleDateString("en-IN")}

`;
      });

      msg += "\nPlease initiate AMC renewal process.";

      for (const phone of managerUsers) {
        await sendWhatsApp(phone, msg);
      }
    }

  } catch (err) {
    console.error("CRON ERROR:", err);
  }
});