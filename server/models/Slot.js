const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  time: { type: String, required: true }, // e.g., "01:30 PM"
  routeName: { type: String, default: '' }, // e.g. "Route 1" on the official timetable
  durationMinutes: { type: Number }, // departure to final arrival
  period: { type: String, enum: ['Morning', 'Afternoon', 'Evening', 'Night'], default: 'Morning' },
  direction: { type: String, default: 'Campus to City' }, // or 'City to Campus'
  origin: { type: String, default: 'JKLU Campus Main Gate' },
  destination: { type: String, default: 'Mansarovar Metro Station' },
  // Campus to City: drop stops. City to Campus: boarding stops. In route order.
  availableStops: {
    type: [String],
    default: ['Elements Mall', 'Mansarovar Metro Station']
  },
  totalSeats: { type: Number, default: 32 },
  busNumber: { type: String, required: true }, // e.g. "RJ 14 PA 2024"
  busType: { type: String, default: 'AC Executive Shuttle' },
  // Minutes after departure that the bus reaches each stop
  etaMinutes: {
    type: Map,
    of: Number,
    default: {
      'Elements Mall': 20,
      'Mansarovar Metro Station': 30
    }
  },
  days: { type: [String], default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] },
  // Dates an admin cancelled this shuttle on; no bookings are accepted for these dates
  cancelledDates: {
    type: [{
      _id: false,
      date: { type: String, required: true }, // 'YYYY-MM-DD'
      reason: { type: String, required: true },
      cancelledAt: { type: Date, default: Date.now }
    }],
    default: []
  }
}, { timestamps: true });

module.exports = mongoose.model('Slot', slotSchema);
