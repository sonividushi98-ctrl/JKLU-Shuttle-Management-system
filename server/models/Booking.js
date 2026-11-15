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
  cancelReason: { type: String, required: false }, // set when an admin cancels the whole shuttle
  bookingCode: { type: String, default: () => 'JKLU-' + Math.floor(100000 + Math.random() * 900000) }
}, { timestamps: true });

// Compound unique index to strictly guarantee at the database engine level that
// only ONE confirmed booking can ever exist for a given slot, date, and seat number.
bookingSchema.index(
  { slot: 1, date: 1, seatNumber: 1 },
  { unique: true, partialFilterExpression: { status: 'Confirmed' } }
);

module.exports = mongoose.model('Booking', bookingSchema);
