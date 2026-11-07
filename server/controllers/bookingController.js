const Slot = require('../models/Slot');
const Booking = require('../models/Booking');

exports.getSlots = async (req, res) => {
  try {
    const slots = await Slot.find();
    res.json(slots);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const { userId, slotId, stop, seatNumber, date } = req.body;

    // Check if seat is already taken for this slot and date
    const existingBooking = await Booking.findOne({ slot: slotId, seatNumber, date });
    if (existingBooking) {
      return res.status(400).json({ message: 'Seat already booked for this time and date' });
    }

    const booking = new Booking({
      user: userId,
      slot: slotId,
      stop,
      seatNumber,
      date
    });

    await booking.save();
    res.status(201).json({ message: 'Booking confirmed!', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

exports.getMyTrips = async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await Booking.find({ user: userId }).populate('slot');
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
