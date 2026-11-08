const mongoose = require('mongoose');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');

// Official JKLU 3 Shuttle Stops
const JKLU_STOPS = [
  {
    id: 'stop-1',
    name: '200 feet bypass',
    displayName: '200 Feet Bypass (Ajmer Road)',
    landmark: 'Heerapura Flyover / Ring Road Crossing',
    etaMinutes: 15,
    distanceKm: 8.5,
    description: 'Quick drop for Ajmer Expressway, Nirman Nagar, and Vaishali West.'
  },
  {
    id: 'stop-2',
    name: 'Elements Mall',
    displayName: 'Elements Mall',
    landmark: 'DCM, Main Ajmer Road',
    etaMinutes: 25,
    distanceKm: 14.0,
    description: 'Central shopping, dining, and transit hub on Ajmer Road.'
  },
  {
    id: 'stop-3',
    name: 'mansarovar metro station',
    displayName: 'Mansarovar Metro Station',
    landmark: 'Gate No. 1 / Pillar 24 (Jaipur Metro Pink Line)',
    etaMinutes: 35,
    distanceKm: 19.5,
    description: 'Fast direct link to Central Jaipur, Sindhi Camp Bus Stand, and Railway Station.'
  }
];

// Initial seeded slots
const DEFAULT_SLOTS = [
  {
    _id: '672000000000000000000001',
    time: '07:45 AM',
    period: 'Morning',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops',
    busNumber: 'RJ 14 PA 2024',
    busType: 'JKLU AC Electric Shuttle',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  {
    _id: '672000000000000000000002',
    time: '09:30 AM',
    period: 'Morning',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops',
    busNumber: 'RJ 14 PB 1102',
    busType: 'Tata Starbus AC',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  {
    _id: '672000000000000000000003',
    time: '01:30 PM',
    period: 'Afternoon',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops',
    busNumber: 'RJ 14 PA 2024',
    busType: 'JKLU AC Electric Shuttle',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  {
    _id: '672000000000000000000004',
    time: '03:45 PM',
    period: 'Afternoon',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops',
    busNumber: 'RJ 14 PC 4410',
    busType: 'Eicher Skyline Pro AC',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  {
    _id: '672000000000000000000005',
    time: '05:15 PM',
    period: 'Evening',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops (Prime Shift)',
    busNumber: 'RJ 14 PA 2024',
    busType: 'JKLU AC Electric Shuttle',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  {
    _id: '672000000000000000000006',
    time: '06:45 PM',
    period: 'Evening',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops',
    busNumber: 'RJ 14 PB 1102',
    busType: 'Tata Starbus AC',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  {
    _id: '672000000000000000000007',
    time: '08:30 PM',
    period: 'Night',
    origin: 'JKLU Campus (Main Gate)',
    destination: 'Mansarovar Metro Station',
    direction: 'Campus ➔ Metro & Stops (Night Service)',
    busNumber: 'RJ 14 PC 4410',
    busType: 'Eicher Skyline Pro AC',
    totalSeats: 32,
    availableStops: ['200 feet bypass', 'Elements Mall', 'mansarovar metro station'],
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  }
];

// In-memory fallback stores when MongoDB is offline
let memoryBookings = [
  {
    _id: 'mem-bk-1',
    user: '654321098765432109876543',
    passengerName: 'Aarav Sharma',
    passengerRoll: '2023BTECH042',
    passengerEmail: 'aarav.sharma@jklu.edu.in',
    slot: DEFAULT_SLOTS[0],
    slotId: DEFAULT_SLOTS[0]._id,
    stop: 'mansarovar metro station',
    seatNumber: 4,
    date: new Date().toISOString().split('T')[0],
    status: 'Confirmed',
    bookingCode: 'JKLU-481923',
    createdAt: new Date().toISOString()
  },
  {
    _id: 'mem-bk-2',
    user: '654321098765432109876543',
    passengerName: 'Aarav Sharma',
    passengerRoll: '2023BTECH042',
    passengerEmail: 'aarav.sharma@jklu.edu.in',
    slot: DEFAULT_SLOTS[4],
    slotId: DEFAULT_SLOTS[4]._id,
    stop: 'Elements Mall',
    seatNumber: 12,
    date: new Date().toISOString().split('T')[0],
    status: 'Confirmed',
    bookingCode: 'JKLU-719302',
    createdAt: new Date().toISOString()
  }
];

const isDbConnected = () => mongoose.connection.readyState === 1;

exports.getStops = (req, res) => {
  res.json({
    origin: 'JKLU Campus (Near Saraswati Statue / Gate 1)',
    stops: JKLU_STOPS
  });
};

exports.getSlots = async (req, res) => {
  try {
    if (isDbConnected()) {
      let slots = await Slot.find();
      if (!slots || slots.length === 0) {
        // Seed default slots into DB
        slots = await Slot.insertMany(DEFAULT_SLOTS.map(({ _id, ...s }) => s));
      }
      return res.json(slots);
    }
    // Return memory slots
    return res.json(DEFAULT_SLOTS);
  } catch (err) {
    console.error('getSlots fallback error:', err.message);
    return res.json(DEFAULT_SLOTS);
  }
};

exports.getBookedSeats = async (req, res) => {
  try {
    const { slotId } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    if (isDbConnected()) {
      const bookings = await Booking.find({
        slot: slotId,
        date: date,
        status: 'Confirmed'
      }).select('seatNumber stop');

      const bookedSeats = bookings.map(b => b.seatNumber);
      return res.json({ slotId, date, bookedSeats, count: bookedSeats.length });
    }

    // In-memory filter
    const booked = memoryBookings
      .filter(b => (b.slotId === slotId || b.slot?._id === slotId) && b.date === date && b.status === 'Confirmed')
      .map(b => b.seatNumber);

    return res.json({ slotId, date, bookedSeats: booked, count: booked.length });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving booked seats', error: err.message });
  }
};

exports.createBooking = async (req, res) => {
  try {
    const {
      userId,
      slotId,
      stop,
      seatNumber,
      date,
      passengerName = 'JKLU Student',
      passengerRoll = '2023BTECH001',
      passengerEmail = 'student@jklu.edu.in'
    } = req.body;

    const bookingDate = date || new Date().toISOString().split('T')[0];
    const parsedSeat = parseInt(seatNumber, 10);

    if (isDbConnected()) {
      // Check existing booking
      const existing = await Booking.findOne({
        slot: slotId,
        seatNumber: parsedSeat,
        date: bookingDate,
        status: 'Confirmed'
      });

      if (existing) {
        return res.status(400).json({ message: `Seat ${parsedSeat} is already booked for this schedule.` });
      }

      const newBooking = new Booking({
        user: mongoose.isValidObjectId(userId) ? userId : undefined,
        passengerName,
        passengerRoll,
        passengerEmail,
        slot: slotId,
        stop,
        seatNumber: parsedSeat,
        date: bookingDate,
        status: 'Confirmed'
      });

      await newBooking.save();
      const populated = await Booking.findById(newBooking._id).populate('slot');
      return res.status(201).json({ message: 'Shuttle seat booked successfully!', booking: populated });
    }

    // Fallback in-memory
    const memExisting = memoryBookings.find(
      b => (b.slotId === slotId || b.slot?._id === slotId) &&
           b.seatNumber === parsedSeat &&
           b.date === bookingDate &&
           b.status === 'Confirmed'
    );

    if (memExisting) {
      return res.status(400).json({ message: `Seat ${parsedSeat} is already booked for this schedule.` });
    }

    const targetSlot = DEFAULT_SLOTS.find(s => s._id === slotId) || DEFAULT_SLOTS[0];
    const code = 'JKLU-' + Math.floor(100000 + Math.random() * 900000);

    const memBooking = {
      _id: 'mem-bk-' + Date.now(),
      user: userId || '654321098765432109876543',
      passengerName,
      passengerRoll,
      passengerEmail,
      slot: targetSlot,
      slotId: targetSlot._id,
      stop,
      seatNumber: parsedSeat,
      date: bookingDate,
      status: 'Confirmed',
      bookingCode: code,
      createdAt: new Date().toISOString()
    };

    memoryBookings.unshift(memBooking);
    return res.status(201).json({ message: 'Shuttle seat booked successfully!', booking: memBooking });
  } catch (err) {
    console.error('createBooking error:', err);
    res.status(500).json({ message: 'Server error booking seat', error: err.message });
  }
};

exports.getMyTrips = async (req, res) => {
  try {
    const { userId } = req.params;

    if (isDbConnected()) {
      const query = mongoose.isValidObjectId(userId) ? { user: userId } : {};
      const bookings = await Booking.find(query).populate('slot').sort({ createdAt: -1 });
      return res.json(bookings);
    }

    // In-memory trips
    const trips = memoryBookings.filter(b => !userId || b.user === userId || userId === 'all');
    return res.json(trips.length > 0 ? trips : memoryBookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error retrieving trips', error: err.message });
  }
};

exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (isDbConnected() && mongoose.isValidObjectId(bookingId)) {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        return res.status(404).json({ message: 'Booking not found' });
      }
      booking.status = 'Cancelled';
      await booking.save();
      return res.json({ message: 'Booking cancelled successfully', booking });
    }

    const idx = memoryBookings.findIndex(b => b._id === bookingId);
    if (idx !== -1) {
      memoryBookings[idx].status = 'Cancelled';
      return res.json({ message: 'Booking cancelled successfully', booking: memoryBookings[idx] });
    }

    return res.status(404).json({ message: 'Booking not found' });
  } catch (err) {
    res.status(500).json({ message: 'Error cancelling booking', error: err.message });
  }
};

exports.getLiveTracking = async (req, res) => {
  try {
    const { busNumber } = req.params;
    const cleanBus = decodeURIComponent(busNumber || 'RJ 14 PA 2024');

    // Live driver info based on bus
    const drivers = {
      'RJ 14 PA 2024': { name: 'Rajesh Kumar Singh', phone: '+91 98290 41203', id: 'JKLU-DRV-08', exp: '9 Yrs' },
      'RJ 14 PB 1102': { name: 'Mukesh Choudhary', phone: '+91 94140 88219', id: 'JKLU-DRV-12', exp: '12 Yrs' },
      'RJ 14 PC 4410': { name: 'Vikram Shekhawat', phone: '+91 97850 55182', id: 'JKLU-DRV-03', exp: '7 Yrs' }
    };

    const driver = drivers[cleanBus] || {
      name: 'Rajesh Kumar Singh',
      phone: '+91 98290 41203',
      id: 'JKLU-DRV-08',
      exp: '9 Yrs'
    };

    // Realistic GPS snapshot
    const trackingData = {
      busNumber: cleanBus,
      busType: 'JKLU AC Executive Shuttle',
      driver,
      status: 'En Route',
      speedKmH: 42,
      currentLocation: 'Ajmer Expressway, approaching DCM Junction',
      currentStageIndex: 1, // 0: Origin, 1: Stop 1 to 2, 2: Stop 2 to 3, 3: Arrived
      progressPercent: 55,
      nextStop: 'Elements Mall',
      etaNextStopMinutes: 4,
      totalDistanceKm: 19.5,
      distanceCoveredKm: 10.8,
      lastGpsPing: new Date().toISOString(),
      trafficCondition: 'Moderate - On Schedule',
      stopsTimeline: [
        { name: 'JKLU Campus (Gate 1)', status: 'Departed', time: 'Departed Gate 1 on schedule' },
        { name: '200 feet bypass', status: 'Passed', time: 'Completed boarding/drop (~8 min ago)' },
        { name: 'Elements Mall', status: 'Next Stop', time: 'ETA in ~4 mins (Next Stop)' },
        { name: 'mansarovar metro station', status: 'Upcoming', time: 'ETA ~14 mins (Terminal Stop)' }
      ]
    };

    return res.json(trackingData);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving live tracking data', error: err.message });
  }
};
