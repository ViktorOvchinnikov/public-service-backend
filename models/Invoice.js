const mongoose = require("mongoose");

const InvoiceSchema = new mongoose.Schema({
  email: { type: String, required: true },
  firstname: { type: String, required: true },
  lastname: { type: String, required: true },
  type: { type: String, required: true },
  address: { type: String, required: true },
  value: { type: Number, required: true },
  cost: { type: Number, required: true },
  created_at: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Invoice", InvoiceSchema);
