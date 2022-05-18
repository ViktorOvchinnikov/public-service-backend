const mongoose = require('mongoose');

const InvoiceSchema = new mongoose.Schema({
  email: { type: String, required: true },
  type: { type: String, required: true },
  address: { type: String, required: true },
  value: { type: Number, required: true },
});

module.exports = mongoose.model('Invoice', InvoiceSchema);