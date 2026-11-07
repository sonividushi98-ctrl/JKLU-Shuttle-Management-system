const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  time: { type: String, required: true }, // e.g., "01:30 PM"
  days: { type: [String], default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
  availableStops: {
    type: [String],
    default: ['Stop 1', 'Stop 2', 'Stop 3'] // The 3 available stops you mentioned
  },
  totalSeats: { type: Number, default: 40 },
  busNumber: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Slot', slotSchema);
