const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyToken } = require("../middleware/auth");



router.put("/update/:id", verifyToken, async (req, res) => {
  try {
    const {
      po_number = null,
      invoice_number = null,
      invoice_date = null,
      payment_date = null,
      payment_received = false
    } = req.body;

    console.log("UPDATE DATA:", { po_number, invoice_number, invoice_date, payment_date, payment_received, id: req.params.id });

    const parseDate = (dateStr) => {
      if (!dateStr || dateStr === '' || dateStr === 'null') return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    };

    // ✅ FIX #1: Validate ID before SQL
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: `Invalid ID: ${req.params.id}` });
    }

    const params = [
      po_number || null,
      invoice_number || null,
      parseDate(invoice_date),
      Boolean(payment_received),    // ← MOVED UP to $4
      parseDate(payment_date),      // ← MOVED DOWN to $5
      id
    ];

    console.log("SQL PARAMS:", params);

    // ✅ FIX #2: YOUR ORIGINAL SQL (NOT placeholder)
    const result = await pool.query(`
      UPDATE invoice_schedule
      SET
        po_number = $1,
        invoice_number = $2,
        invoice_date = $3,
        payment_received = $4,
        payment_date = $5,
        invoice_raised = CASE
            WHEN $2::text IS NOT NULL AND $2::text <> '' THEN true
            ELSE invoice_raised
        END
      WHERE id = $6
    `, params);

    console.log("Rows updated:", result.rowCount);
    res.json({ message: "Invoice schedule updated", rows: result.rowCount });
  } catch (err) {
    console.error("UPDATE SCHEDULE ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==============================
// INVOICE LIST (Due / Pending / Paid)
// ==============================

router.get("/invoice-list/:type", verifyToken, async (req, res) => {
  try {

    const { type } = req.params;
    let query = "";

    // ==============================
    // DUE INVOICES
    // ==============================

    if (type === "due") {

      query = `
      SELECT
        a.customer_name,
        a.plant_name,
        i.po_number,
        i.period_number,
        TO_CHAR(i.due_date,'YYYY-MM-DD') AS due_date,
        CASE
          WHEN i.due_date < CURRENT_DATE THEN 'OVERDUE'
          WHEN i.due_date = CURRENT_DATE THEN 'DUE TODAY'
          ELSE 'UPCOMING'
        END AS invoice_status
      FROM invoice_schedule i
      JOIN amc_site_entry a ON a.id = i.amc_id
      WHERE i.invoice_raised = false
      AND i.payment_received = false
      AND i.due_date <= CURRENT_DATE + INTERVAL '30 days'
      ORDER BY i.due_date
      `;
    }

    // ==============================
    // PAYMENT PENDING
    // ==============================

    else if (type === "pending") {

      query = `
      SELECT
        a.customer_name,
        a.plant_name,
        i.po_number,
        i.period_number,
        TO_CHAR(i.due_date,'YYYY-MM-DD') AS due_date,
        'Payment Pending' AS invoice_status
      FROM invoice_schedule i
      JOIN amc_site_entry a ON a.id = i.amc_id
      WHERE i.invoice_raised = true
      AND i.payment_received = false
      ORDER BY i.due_date
      `;
    }

    // ==============================
    // PAID INVOICES
    // ==============================

    else if (type === "paid") {

      query = `
      SELECT
        a.customer_name,
        a.plant_name,
        i.po_number,
        i.period_number,
        TO_CHAR(i.due_date,'YYYY-MM-DD') AS due_date,
        'Paid' AS invoice_status
      FROM invoice_schedule i
      JOIN amc_site_entry a ON a.id = i.amc_id
      WHERE i.payment_received = true
      ORDER BY i.due_date
      `;
    }

    else {
      return res.status(400).json({ error: "Invalid invoice type" });
    }

    const result = await pool.query(query);
    res.json(result.rows);

  } catch (err) {

    console.error("INVOICE LIST ERROR:", err);
    res.status(500).json({ error: "Server error" });

  }
});


// ==============================
// DASHBOARD SUMMARY
// ==============================

router.get("/invoice-summary", verifyToken, async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE invoice_raised = false
          AND payment_received = false
          AND due_date <= CURRENT_DATE + INTERVAL '30 days'
        ) AS due,

        COUNT(*) FILTER (
          WHERE invoice_raised = true
          AND payment_received = false
        ) AS pending,

        COUNT(*) FILTER (
          WHERE payment_received = true
        ) AS paid

      FROM invoice_schedule
    `);

    res.json({
      due: Number(result.rows[0].due),
      pending: Number(result.rows[0].pending),
      paid: Number(result.rows[0].paid)
    });

  } catch (err) {

    console.error("INVOICE SUMMARY ERROR:", err);
    res.status(500).json({ error: "Server error" });

  }

});

module.exports = router;
