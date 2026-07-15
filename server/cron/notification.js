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
      return false;
    }

    const sock = whatsapp.getSock();

    if (!sock) {
      console.log("⚠️ WhatsApp socket unavailable");
      return false;
    }

    const jid = `${number}@s.whatsapp.net`;

    await sock.sendMessage(jid, {
      text: message,
    });

    console.log(`✅ WhatsApp sent to ${number}`);
    return true;
  } catch (err) {
    console.error("WHATSAPP SEND ERROR:", err.message);
    return false;
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

    return result.rows.map((r) =>
      r.phone.replace(/\D/g, "")
    );
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

const notificationCron = process.env.NOTIFICATION_CRON || "0 10 * * *";

if (!cron.validate(notificationCron)) {
  throw new Error("NOTIFICATION_CRON contains an invalid cron expression");
}

let cronRunning = false;

cron.schedule(notificationCron, async () => {
  if (cronRunning) {
    console.log("Skipping notification cron because the previous run is still active");
    return;
  }

  cronRunning = true;
  console.log("Running WhatsApp Invoice Cron...");

  try {

    // ====================================================
    // 1. INVOICE RAISE ALERT
    // ====================================================

    const invoiceUsers = await getUserPhonesByIds([5]);

    const upcomingInvoices = await pool.query(`
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

    for (const row of upcomingInvoices.rows) {

      const msg =
`🚨 *Invoice Raise Alert*

Customer: ${row.customer_name}
Plant: ${row.plant_name}
PO Number: ${row.po_number || "Not Available"}
Quarter: ${row.period_number}
Due Date: ${new Date(row.due_date).toLocaleDateString("en-IN")}

Please raise the invoice.`;

      let sent = false;

      for (const phone of invoiceUsers) {
        const result = await sendWhatsApp(phone, msg);

        if (result) {
          sent = true;
        }
      }

      if (sent) {
        await pool.query(
          `
          UPDATE invoice_schedule
          SET notification_sent = TRUE
          WHERE id = $1
          `,
          [row.id]
        );
      }
    }

    // ====================================================
    // 2. PAYMENT REMINDER
    // ====================================================

    const paymentReminder = await pool.query(`
      SELECT
        s.*,
        a.customer_name,
        a.plant_name
      FROM invoice_schedule s
      JOIN amc_site_entry a
      ON a.id = s.amc_id
      WHERE s.due_date <= CURRENT_DATE - INTERVAL '20 days'
      AND s.payment_received = FALSE
      AND s.payment_notification_sent = FALSE
    `);

    for (const row of paymentReminder.rows) {

      const msg =
`💰 *Payment Reminder*

Customer: ${row.customer_name}
Plant: ${row.plant_name}
Invoice No: ${row.invoice_number || "Not Available"}
PO Number: ${row.po_number || "Not Available"}
Quarter: ${row.period_number}

Payment pending for more than 20 days.

Please follow up with customer.`;

      let sent = false;

      for (const phone of invoiceUsers) {
        const result = await sendWhatsApp(phone, msg);

        if (result) {
          sent = true;
        }
      }

      if (sent) {
        await pool.query(
          `
          UPDATE invoice_schedule
          SET payment_notification_sent = TRUE
          WHERE id = $1
          `,
          [row.id]
        );
      }
    }

    // ====================================================
    // 3. AMC RENEWAL ALERT
    // ====================================================

    const managerUsers = await getUserPhonesByIds([4, 6]);

    const endingAmc = await pool.query(`
      SELECT
        id,
        customer_name,
        plant_name,
        amc_end_date
      FROM amc_site_entry
      WHERE amc_end_date >= CURRENT_DATE
      AND amc_end_date <= CURRENT_DATE + INTERVAL '30 days'
      AND renewal_notification_sent = FALSE
    `);

    for (const row of endingAmc.rows) {

      const msg =
`⚠️ *AMC Renewal Alert*

Customer: ${row.customer_name}
Plant: ${row.plant_name}
AMC End Date: ${new Date(row.amc_end_date).toLocaleDateString("en-IN")}

Please initiate AMC renewal process.`;

      let sent = false;

      for (const phone of managerUsers) {
        const result = await sendWhatsApp(phone, msg);

        if (result) {
          sent = true;
        }
      }

      if (sent) {
        await pool.query(
          `
          UPDATE amc_site_entry
          SET renewal_notification_sent = TRUE
          WHERE id = $1
          `,
          [row.id]
        );
      }
    }

  } catch (err) {
    console.error("CRON ERROR:", err);
  } finally {
    cronRunning = false;
  }
}, {
  timezone: "Asia/Kolkata"
});

module.exports = {};
