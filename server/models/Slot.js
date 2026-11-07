const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  time: { type: String, required: true }, // e.g., "01:30 PM"
  period: { type: String, enum: ['Morning', 'Afternoon', 'Evening', 'Night'], default: 'Morning' },
  direction: { type: String, default: 'JKLU Campus to Mansarovar Metro' },
  origin: { type: String, default: 'JKLU Campus (Main Gate)' },
  destination: { type: String, default: 'Mansarovar Metro Station' },
  availableStops: {
    type: [String],
    default: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station']
  },
  totalSeats: { type: Number, default: 32 },
  busNumber: { type: String, required: true }, // e.g. "RJ 14 PA 2024"
  busType: { type: String, default: 'AC Executive Shuttle' },
  etaMinutes: {
    type: Map,
    of: Number,
    default: {
      '200 feet bypass': 15,
      'Elements Mall': 25,
      'mansarovar metro station': 35
    }
  },
  days: { type: [String], default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] }
}, { timestamps: true });

module.exports = mongoose.model('Slot', slotSchema);
