// utils.js
function generateInvoiceSchedule(startDate, endDate, timing, monthsIncrement) {
  const invoices = [];
  let current = new Date(startDate);
  let period = 1;

  while (current < new Date(endDate)) {
    let dueDate;

    if (timing === "START") {
      dueDate = new Date(current);
    } else {
      const temp = new Date(current);
      temp.setMonth(temp.getMonth() + monthsIncrement);
      temp.setDate(temp.getDate() - 1);
      dueDate = temp;
    }

    invoices.push({
      period_number: period,
      due_date: dueDate
    });

    current.setMonth(current.getMonth() + monthsIncrement);
    period++;
  }

  return invoices;
}

module.exports = { generateInvoiceSchedule };