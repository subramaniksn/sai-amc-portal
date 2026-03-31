const express = require("express");
const pool = require("../db");
const ExcelJS = require("exceljs");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();


// ========================================
// GENERATE QUARTERLY SCHEDULE
// ========================================
function generateInvoiceSchedule(startDate, endDate, timing, monthStep) {

  const invoices = [];
  let current = new Date(startDate);
  let period = 1;

  while (current <= new Date(endDate)) {

    let dueDate;

    if (timing === "START") {

      dueDate = new Date(current);

    } else {

      const temp = new Date(current);
      temp.setMonth(temp.getMonth() + monthStep);
      temp.setDate(temp.getDate() - 1);
      dueDate = temp;

    }

    invoices.push({
      period_number: period,
      due_date: dueDate
    });

    current.setMonth(current.getMonth() + monthStep);
    period++;

  }

  return invoices;
}

// ========================================
// CREATE AMC
// ========================================
router.post("/", verifyToken, async (req, res) => {

  try {

    const {
      customer_name,
      plant_name,
      billing_address,
      contact_person,
      plantcapacity_mw,
      amc_start_date,
      amc_end_date,
      supporting_document_for_invoice,
      billing_cycle,
      site_visit,
      invoice_raise_timing,
      total_amount_without_gst,
      po_number
    } = req.body;

    const totalAmount = Number(total_amount_without_gst || 0);

    const amc = await pool.query(`
      INSERT INTO amc_site_entry (
        customer_name,
        plant_name,
        billing_address,
        contact_person,
        plantcapacity_mw,
        amc_start_date,
        amc_end_date,
        supporting_document_for_invoice,
        billing_cycle,
        site_visit,
        invoice_raise_timing,
        total_amount_without_gst,
        balance_amount_without_gst
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [
      customer_name,
      plant_name,
      billing_address,
      contact_person,
      plantcapacity_mw,
      amc_start_date,
      amc_end_date,
      supporting_document_for_invoice,
      billing_cycle,
      site_visit,
      invoice_raise_timing,
      totalAmount,
      totalAmount
    ]);

    const amcId = amc.rows[0].id;

    // AUTO CREATE INVOICE SCHEDULE
    if (billing_cycle) {

      let schedule = [];
      const cycle = billing_cycle.toLowerCase();

      if (cycle.includes("month")) {

        schedule = generateInvoiceSchedule(amc_start_date, amc_end_date, invoice_raise_timing, 1);

      } 
      else if (cycle.includes("quarter")) {

        schedule = generateInvoiceSchedule(amc_start_date, amc_end_date, invoice_raise_timing, 3);

      } 
      else if (cycle.includes("half")) {

        schedule = generateInvoiceSchedule(amc_start_date, amc_end_date, invoice_raise_timing, 6);

      } 
      else if (cycle.includes("year")) {

        schedule = generateInvoiceSchedule(amc_start_date, amc_end_date, invoice_raise_timing, 12);

      }

      const amountPerPeriod =
        schedule.length > 0 ? totalAmount / schedule.length : 0;

      for (const s of schedule) {

        await pool.query(`
          INSERT INTO invoice_schedule (
            amc_id,
            period_number,
            due_date,
            po_number,
            amount,
            invoice_amount
          )
          VALUES ($1,$2,$3,$4,$5,$6)
        `, [
          amcId,
          s.period_number,
          s.due_date,
          po_number || null,
          amountPerPeriod,
          amountPerPeriod
        ]);

      }

    }

    res.json(amc.rows[0]);

  } catch (err) {

    console.error("CREATE AMC ERROR:", err);
    res.status(500).json({ error: err.message });

  }

});


// ========================================
// GET AMC LIST
// ========================================
router.get("/", async (req, res) => {
  try {

    const { year } = req.query;

    let query = `
      SELECT 
        a.*,
        MAX(i.po_number) AS po_number,
        MAX(i.invoice_date) AS po_date
      FROM amc_site_entry a
      LEFT JOIN invoice_schedule i
      ON a.id = i.amc_id
    `;

    const values = [];

    // ✅ APPLY FILTER ONLY IF YEAR PASSED
    if (year) {
      query += ` WHERE EXTRACT(YEAR FROM a.amc_start_date) = $1 `;
      values.push(year);
    }

    query += `
      GROUP BY a.id
      ORDER BY a.id
    `;

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (err) {
    console.error("GET AMC ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
});


// ========================================
// GET INVOICE SCHEDULE
// ========================================
router.get("/schedule/:amcId", verifyToken, async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        id,
        period_number,
        due_date,
        po_number,
        amount,
        invoice_number,
        invoice_date,
        invoice_raised,
        payment_received
      FROM invoice_schedule
      WHERE amc_id=$1
      ORDER BY period_number
    `, [req.params.amcId]);

    res.json(result.rows);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});


// ========================================
// RAISE INVOICE
// ========================================
router.put("/raise/:scheduleId", verifyToken, async (req, res) => {

  try {

    const { invoice_number, invoice_date } = req.body;

    await pool.query(`
      UPDATE invoice_schedule
      SET
        invoice_raised = TRUE,
        invoice_number = $1,
        invoice_date = $2
      WHERE id = $3
    `, [invoice_number, invoice_date, req.params.scheduleId]);

    res.json({ message: "Invoice raised successfully" });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});


// ========================================
// RECEIVE PAYMENT
// ========================================
router.put("/receive/:scheduleId", verifyToken, async (req, res) => {

  try {

    const { amount } = req.body;
    const scheduleId = req.params.scheduleId;

    const schedule = await pool.query(
      "SELECT * FROM invoice_schedule WHERE id=$1",
      [scheduleId]
    );

    if (schedule.rows.length === 0) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    const row = schedule.rows[0];

    await pool.query(`
      UPDATE invoice_schedule
      SET
        payment_received = TRUE,
        payment_date = CURRENT_DATE
      WHERE id = $1
    `, [scheduleId]);

    await pool.query(`
      UPDATE amc_site_entry
      SET balance_amount_without_gst =
      balance_amount_without_gst - $1
      WHERE id = $2
    `, [amount, row.amc_id]);

    res.json({ message: "Payment received successfully" });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});

// ========================================
// DASHBOARD
// ========================================
router.get("/dashboard", verifyToken, async (req, res) => {

  try {

    const stats = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE invoice_raised=false) AS invoices_pending,
        COUNT(*) FILTER (WHERE invoice_raised=true AND payment_received=false) AS payment_pending,
        COUNT(*) FILTER (WHERE payment_received=true) AS paid_invoices
      FROM invoice_schedule
    `);

    res.json(stats.rows[0]);

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});

// ========================================
// UPCOMING AMCs
// ========================================

router.get("/upcoming", verifyToken, async (req, res) => {
  try {

    const { year } = req.query;

    let query = `
      SELECT
        customer_name,
        plant_name,
        amc_start_date,
        amc_end_date
      FROM amc_site_entry
      WHERE amc_end_date BETWEEN CURRENT_DATE 
      AND CURRENT_DATE + INTERVAL '30 days'
    `;

    const values = [];

    // ✅ APPLY YEAR FILTER (based on AMC start year)
    if (year) {
      query += ` AND EXTRACT(YEAR FROM amc_start_date) = $1 `;
      values.push(year);
    }

    query += ` ORDER BY amc_end_date`;

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (err) {
    console.error("ENDING AMC ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// EXPORT AMC DATA
// ========================================

router.get("/export", verifyToken, async (req, res) => {
  try {

    const { year } = req.query;

    let query = `
      SELECT
        a.customer_name,
        a.plant_name,
        MAX(i.po_number) AS po_number,

        TO_CHAR(a.amc_start_date, 'DD-MM-YYYY') AS amc_start_date,
        TO_CHAR(a.amc_end_date, 'DD-MM-YYYY') AS amc_end_date,

        SUM(i.invoice_amount) AS total_amount,

        SUM(CASE 
              WHEN i.payment_received = true 
              THEN i.invoice_amount 
              ELSE 0 
            END) AS received_amount,

        SUM(CASE 
              WHEN i.payment_received = false 
              THEN i.invoice_amount 
              ELSE 0 
            END) AS pending_amount

      FROM amc_site_entry a
      JOIN invoice_schedule i ON i.amc_id = a.id
    `;

    const values = [];

    // ✅ YEAR FILTER
    if (year) {
      query += ` WHERE EXTRACT(YEAR FROM a.amc_start_date) = $1 `;
      values.push(year);
    }

    query += `
      GROUP BY
        a.id,
        a.customer_name,
        a.plant_name,
        a.amc_start_date,
        a.amc_end_date
      ORDER BY a.customer_name
    `;

    const result = await pool.query(query, values);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("AMC Report");

    sheet.columns = [
      { header: "Customer Name", key: "customer_name", width: 25 },
      { header: "Plant Name", key: "plant_name", width: 25 },
      { header: "PO Number", key: "po_number", width: 20 },
      { header: "AMC Start Date", key: "amc_start_date", width: 18 },
      { header: "AMC End Date", key: "amc_end_date", width: 18 },
      { header: "Total Amount", key: "total_amount", width: 18 },
      { header: "Received Amount", key: "received_amount", width: 18 },
      { header: "Pending Amount", key: "pending_amount", width: 18 }
    ];

    sheet.addRows(result.rows);

    sheet.getRow(1).font = { bold: true };

    res.set({
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=amc-${year || "all"}.xlsx`
    });

    await workbook.xlsx.write(res);
    res.end();

  } catch (err) {
    console.error("EXPORT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
// ========================================
// GET PENDING AMCs BY CUSTOMER
// ========================================
router.get("/pending-by-customer", verifyToken, async (req, res) => {
  try {

    const { year } = req.query;

    let query = `
      SELECT
        a.customer_name,
        a.plant_name,
        a.total_amount_without_gst,

        COALESCE(SUM(
          CASE WHEN i.payment_received = true THEN i.amount ELSE 0 END
        ),0) AS received_amount,

        a.total_amount_without_gst -
        COALESCE(SUM(
          CASE WHEN i.payment_received = true THEN i.amount ELSE 0 END
        ),0) AS pending_amount

      FROM amc_site_entry a
      LEFT JOIN invoice_schedule i
      ON a.id = i.amc_id
    `;

    const values = [];

    if (year) {
      query += ` WHERE EXTRACT(YEAR FROM a.amc_start_date) = $1 `;
      values.push(year);
    }

    query += `
      GROUP BY a.id, a.customer_name, a.plant_name, a.total_amount_without_gst
      ORDER BY pending_amount DESC
    `;

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (err) {
    console.error("PENDING CUSTOMER ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
// ========================================
// GET SINGLE AMC
// ========================================
router.get("/:id", verifyToken, async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT *
      FROM amc_site_entry
      WHERE id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "AMC not found" });
    }

    res.json(result.rows[0]);

  } catch (err) {

    console.error("GET AMC ERROR:", err);
    res.status(500).json({ error: err.message });

  }

});

router.get("/ending-soon", verifyToken, async (req, res) => {
  try {
    const { year } = req.query;

    let query = `
      SELECT customer_name, plant_name, amc_end_date
      FROM amc_site_entry
      WHERE amc_end_date BETWEEN CURRENT_DATE
      AND CURRENT_DATE + INTERVAL '30 days'
    `;

    const values = [];

    if (year) {
      query += ` AND EXTRACT(YEAR FROM amc_end_date) = $1`;
      values.push(year);
    }

    query += ` ORDER BY amc_end_date`;

    const result = await pool.query(query, values);
    res.json(result.rows);

  } catch (err) {
    console.error("ENDING AMC ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;