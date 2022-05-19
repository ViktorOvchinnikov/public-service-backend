const mongoose = require('mongoose');

const RateSchema = new mongoose.Schema({
  latinName: { type: String, required: true },
  cyrillicName: { type: String, required: true },
  price: { type: Number, required: true },
});

module.exports = mongoose.model("Rate", RateSchema);
