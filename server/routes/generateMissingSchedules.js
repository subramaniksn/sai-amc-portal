// File: generateMissingSchedules.js
const pool = require("../db");// adjust path if needed
const { generateInvoiceSchedule } = require("./utils"); // you can use your updated generate function

async function generateMissingSchedules() {
  try {
    // Get AMC sites that do NOT have invoice_schedule entries yet
    const amcs = await pool.query(`
      SELECT * FROM amc_site_entry
      WHERE id NOT IN (
        SELECT DISTINCT amc_id FROM invoice_schedule
      )
    `);

    for (const amc of amcs.rows) {

      let schedule = [];
      const cycle = (amc.billing_cycle || "").toLowerCase();

      // Decide frequency in months
      let monthsIncrement = 0;
      if (cycle.includes("month")) monthsIncrement = 1;
      else if (cycle.includes("quarter")) monthsIncrement = 3;
      else if (cycle.includes("half")) monthsIncrement = 6;
      else if (cycle.includes("year")) monthsIncrement = 12;

      if (monthsIncrement === 0) continue; // skip unknown cycles

      schedule = generateInvoiceSchedule(
        amc.amc_start_date,
        amc.amc_end_date,
        amc.invoice_raise_timing,
        monthsIncrement
      );

      const amountPerPeriod = schedule.length > 0
        ? Number(amc.total_amount_without_gst || 0) / schedule.length
        : 0;

      for (const s of schedule) {
        await pool.query(`
          INSERT INTO invoice_schedule (
            amc_id,
            period_number,
            due_date,
            amount,
            invoice_amount
          )
          VALUES ($1,$2,$3,$4,$5)
        `, [
          amc.id,
          s.period_number,
          s.due_date,
          amountPerPeriod,
          amountPerPeriod
        ]);
      }

      console.log(`✅ Invoice schedule generated for AMC ID: ${amc.id} (${amc.billing_cycle})`);
    }

    console.log("🎉 All missing invoice schedules generated!");
    process.exit(0);

  } catch (err) {
    console.error("Error generating missing schedules:", err);
    process.exit(1);
  }
}

// Run the function
generateMissingSchedules();