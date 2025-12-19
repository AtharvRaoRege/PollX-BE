const mongoose = require('mongoose');

const systemStateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g., 'collective_mood'
  value: { type: mongoose.Schema.Types.Mixed }, // Flexible payload
  lastUpdated: { type: Date, default: Date.now }
});

const SystemState = mongoose.model('SystemState', systemStateSchema);

module.exports = SystemState;
