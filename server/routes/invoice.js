const express = require("express");
const router = express.Router();
const pool = require("../db");
const { verifyToken, isAdmin } = require("../middleware/auth");


// ==============================
// UPDATE INVOICE SCHEDULE
// ==============================
router.put("/update/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const {
      po_number = null,
      po_date = null,
      invoice_number = null,
      invoice_date = null
    } = req.body;

    const parseDate = (dateStr) => {
      if (!dateStr || dateStr === '' || dateStr === 'null') return null;
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
    };

    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: `Invalid ID: ${req.params.id}` });
    }

    const existing = await pool.query(
      "SELECT payment_received FROM invoice_schedule WHERE id = $1",
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Invoice schedule not found" });
    }

    if (existing.rows[0].payment_received) {
      return res.status(409).json({ error: "Paid invoice schedules cannot be edited" });
    }

    const params = [
      po_number || null,
      parseDate(po_date),
      invoice_number || null,
      parseDate(invoice_date),
      id
    ];

    const result = await pool.query(`
      UPDATE invoice_schedule
      SET
        po_number = $1,
        po_date = $2,
        invoice_number = $3,
        invoice_date = $4,
        invoice_raised = CASE
            WHEN payment_received = true THEN invoice_raised
            WHEN $3::text IS NOT NULL AND $3::text <> '' THEN true
            ELSE false
        END
      WHERE id = $5
    `, params);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Invoice schedule not found" });
    }

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
    const { year, status } = req.query;

    let query = "";
    let values = [];

    // ✅ Filter on due_date year (not amc_start_date) so overdue invoices
    //    from any AMC start year are included correctly
    const yearFilter = year
      ? ` AND EXTRACT(YEAR FROM i.due_date) = $1 `
      : "";

    const statusCondition =
      status === "live"      ? ` AND a.amc_end_date >= CURRENT_DATE ` :
      status === "completed" ? ` AND a.amc_end_date < CURRENT_DATE `  : "";

    // ==============================
    // DUE — overdue (any past) + upcoming within 30 days
    // ==============================
    if (type === "due") {
      query = `
        SELECT
          a.customer_name,
          a.plant_name,
          i.po_number,
          i.invoice_number,
          i.period_number,
          COALESCE(i.invoice_amount, i.amount, 0) AS quarter_amount,
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
        AND (
          i.due_date < CURRENT_DATE                           -- all overdue (any past date)
          OR i.due_date <= CURRENT_DATE + INTERVAL '30 days' -- upcoming within 30 days
        )
        ${yearFilter}
        ${statusCondition}
        ORDER BY i.due_date
      `;
    }

    // ==============================
    // PENDING
    // ==============================
    else if (type === "pending") {
      query = `
        SELECT
          a.customer_name,
          a.plant_name,
          i.po_number,
          i.invoice_number,
          i.period_number,
          COALESCE(i.invoice_amount, i.amount, 0) AS quarter_amount,
          TO_CHAR(i.due_date,'YYYY-MM-DD') AS due_date,
          'Payment Pending' AS invoice_status
        FROM invoice_schedule i
        JOIN amc_site_entry a ON a.id = i.amc_id
        WHERE i.invoice_raised = true
        AND i.payment_received = false
        ${yearFilter}
        ${statusCondition}
        ORDER BY i.due_date
      `;
    }

    // ==============================
    // PAID
    // ==============================
    else if (type === "paid") {
      query = `
        SELECT
          a.customer_name,
          a.plant_name,
          i.po_number,
          i.invoice_number,
          i.period_number,
          COALESCE(i.invoice_amount, i.amount, 0) AS quarter_amount,
          TO_CHAR(i.due_date,'YYYY-MM-DD') AS due_date,
          'Paid' AS invoice_status
        FROM invoice_schedule i
        JOIN amc_site_entry a ON a.id = i.amc_id
        WHERE i.payment_received = true
        ${yearFilter}
        ${statusCondition}
        ORDER BY i.due_date
      `;
    }

    else {
      return res.status(400).json({ error: "Invalid invoice type" });
    }

    if (year) values.push(year);

    const result = await pool.query(query, values);
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
    const { year, status } = req.query;

    const conditions = [];
    const values = [];

    // ✅ Filter on due_date year — matches invoice-list behavior
    if (year) {
      values.push(year);
      conditions.push(`EXTRACT(YEAR FROM i.due_date) = $${values.length}`);
    }

    if (status === "live") {
      conditions.push(`a.amc_end_date >= CURRENT_DATE`);
    } else if (status === "completed") {
      conditions.push(`a.amc_end_date < CURRENT_DATE`);
    }

    // ✅ andClause — each subquery has its own WHERE, so we append with AND
    const andClause = conditions.length > 0
      ? `AND ` + conditions.join(" AND ")
      : "";

    const query = `
      SELECT
        (
          SELECT COUNT(*)
          FROM invoice_schedule i
          JOIN amc_site_entry a ON a.id = i.amc_id
          WHERE i.invoice_raised = false
          AND i.payment_received = false
          AND (
            i.due_date < CURRENT_DATE
            OR i.due_date <= CURRENT_DATE + INTERVAL '30 days'
          )
          ${andClause}
        ) AS due,

        (
          SELECT COUNT(*)
          FROM invoice_schedule i
          JOIN amc_site_entry a ON a.id = i.amc_id
          WHERE i.invoice_raised = true
          AND i.payment_received = false
          ${andClause}
        ) AS pending,

        (
          SELECT COUNT(*)
          FROM invoice_schedule i
          JOIN amc_site_entry a ON a.id = i.amc_id
          WHERE i.payment_received = true
          ${andClause}
        ) AS paid
    `;

    const result = await pool.query(query, values);

    res.json({
      due:     Number(result.rows[0].due),
      pending: Number(result.rows[0].pending),
      paid:    Number(result.rows[0].paid)
    });

  } catch (err) {
    console.error("INVOICE SUMMARY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
