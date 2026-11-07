const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  passengerName: { type: String, default: 'JKLU Student' },
  passengerRoll: { type: String, default: '2023BTECH001' },
  passengerEmail: { type: String, default: 'student@jklu.edu.in' },
  slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  stop: { type: String, required: true },
  seatNumber: { type: Number, required: true },
  date: { type: String, required: true }, // 'YYYY-MM-DD'
  status: { type: String, enum: ['Confirmed', 'Cancelled'], default: 'Confirmed' },
  bookingCode: { type: String, default: () => 'JKLU-' + Math.floor(100000 + Math.random() * 900000) }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
