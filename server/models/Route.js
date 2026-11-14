const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, unique: true },
  direction: { type: String, enum: ['Campus to City', 'City to Campus'], required: true },
  origin: { type: String, required: true, trim: true },
  destination: { type: String, required: true, trim: true },
  availableStops: { type: [String], required: true },
  etaMinutes: { type: Map, of: Number, default: {} },
  durationMinutes: { type: Number, required: true, min: 1, max: 240 }
}, { timestamps: true });

module.exports = mongoose.model('Route', routeSchema);
