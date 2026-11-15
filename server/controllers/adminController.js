const crypto = require('crypto');
const mongoose = require('mongoose');
const Slot = require('../models/Slot');
const Booking = require('../models/Booking');
const Route = require('../models/Route');
const { memoryStore } = require('./bookingController');
const { broadcastScheduleCancelled } = require('../socket');

const isDbConnected = () => mongoose.connection.readyState === 1;

const PERIODS = ['Morning', 'Afternoon', 'Evening', 'Night'];
const DIRECTIONS = ['Campus to City', 'City to Campus'];
const CAMPUS = 'JKLU Campus Main Gate';

// Stops for an extra shuttle, matching Route 1 on the official timetable
const CAMPUS_TO_CITY_DEFAULTS = {
  direction: 'Campus to City',
  origin: CAMPUS,
  destination: 'Mansarovar Metro Station',
  availableStops: ['Elements Mall', 'Mansarovar Metro Station'],
  etaMinutes: { 'Elements Mall': 20, 'Mansarovar Metro Station': 30 },
  durationMinutes: 30
};
const CITY_TO_CAMPUS_DEFAULTS = {
  direction: 'City to Campus',
  origin: 'Mansarovar Metro Station',
  destination: CAMPUS,
  availableStops: ['Mansarovar Metro Station', 'Elements Mall'],
  etaMinutes: { 'Mansarovar Metro Station': 0, 'Elements Mall': 10 },
  durationMinutes: 30
};
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(0?[1-9]|1[0-2]):([0-5]\d)\s*(AM|PM)$/i;

const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const addDays = (date, amount) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().split('T')[0];
};

const isValidDate = (date) => DATE_RE.test(date) && !Number.isNaN(new Date(date + 'T00:00:00Z').getTime());

const weekdayOf = (date) => WEEKDAYS[new Date(date + 'T00:00:00Z').getUTCDay()];

const createdDateOf = (slot) => {
  if (!slot?.createdAt) return null;
  const parsed = new Date(slot.createdAt);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
};

const runsOnDate = (slot, date, weekday) => {
  const matchesWeekday = !Array.isArray(slot.days) || slot.days.length === 0 || slot.days.includes(weekday);
  if (!matchesWeekday) return false;

  // Official timetable slots predate the admin-created schedule and must remain
  // visible for historical dates. Extra shuttles start on their creation date.
  const createdDate = slot.routeName ? null : createdDateOf(slot);
  return !createdDate || date >= createdDate;
};

// "7:05 pm" -> "07:05 PM" (the format the existing slots use)
const normalizeTime = (time) => {
  const match = TIME_RE.exec(String(time || '').trim());
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]} ${match[3].toUpperCase()}`;
};

const minutesOf = (time) => {
  const match = TIME_RE.exec(String(time || '').trim());
  if (!match) return 0;
  let hours = parseInt(match[1], 10) % 12;
  if (match[3].toUpperCase() === 'PM') hours += 12;
  return hours * 60 + parseInt(match[2], 10);
};

const periodFor = (time) => {
  const hours = Math.floor(minutesOf(time) / 60);
  if (hours < 12) return 'Morning';
  if (hours < 17) return 'Afternoon';
  if (hours < 20) return 'Evening';
  return 'Night';
};

const slotIdOf = (booking) => String(booking.slotId || booking.slot?._id || booking.slot);

const slotSummary = (slot) => ({
  _id: slot._id,
  time: slot.time,
  period: slot.period,
  routeName: slot.routeName,
  direction: slot.direction,
  origin: slot.origin,
  destination: slot.destination,
  busNumber: slot.busNumber,
  busType: slot.busType,
  totalSeats: slot.totalSeats,
  days: slot.days,
  createdAt: slot.createdAt
});

// Finds a slot by id in MongoDB or the in-memory store. Returns null if not found.
const findSlot = async (slotId) => {
  if (isDbConnected()) {
    if (!mongoose.isValidObjectId(slotId)) return null;
    return Slot.findById(slotId);
  }
  return memoryStore.slots.find(s => s._id === slotId) || null;
};

// @desc    Seats booked vs total for every slot on a date
// @route   GET /api/admin/slots/load?date=YYYY-MM-DD
exports.getSlotLoad = async (req, res) => {
  try {
    const date = req.query.date || today();
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'date must be in YYYY-MM-DD format' });
    }

    let slots;
    const booked = {};
    const cancelledByAdmin = {};

    if (isDbConnected()) {
      slots = await Slot.find();
      const counts = await Booking.aggregate([
        { $match: { date } },
        {
          $group: {
            _id: '$slot',
            booked: { $sum: { $cond: [{ $eq: ['$status', 'Confirmed'] }, 1, 0] } },
            cancelledByAdmin: {
              $sum: { $cond: [{ $and: [{ $eq: ['$status', 'Cancelled'] }, { $gt: ['$cancelReason', null] }] }, 1, 0] }
            }
          }
        }
      ]);
      counts.forEach(c => {
        booked[String(c._id)] = c.booked;
        cancelledByAdmin[String(c._id)] = c.cancelledByAdmin;
      });
    } else {
      slots = memoryStore.slots;
      memoryStore.bookings
        .filter(b => b.date === date)
        .forEach(b => {
          const id = slotIdOf(b);
          if (b.status === 'Confirmed') booked[id] = (booked[id] || 0) + 1;
          if (b.status === 'Cancelled' && b.cancelReason) cancelledByAdmin[id] = (cancelledByAdmin[id] || 0) + 1;
        });
    }

    const weekday = weekdayOf(date);
    const result = slots
      // Do not show admin-created extras on dates before they existed. Official
      // timetable rows remain visible so admins can see their weekday status.
      .filter(slot => slot.routeName || !createdDateOf(slot) || date >= createdDateOf(slot))
      .map(slot => {
        const id = String(slot._id);
        const bookedSeats = booked[id] || 0;
        const cancellation = (slot.cancelledDates || []).find(c => c.date === date);
        return {
          ...slotSummary(slot),
          cancelled: Boolean(cancellation),
          cancelReason: cancellation ? cancellation.reason : null,
          bookedSeats,
          seatsLeft: Math.max(slot.totalSeats - bookedSeats, 0),
          cancelledByAdmin: cancelledByAdmin[id] || 0,
          runsOnDate: runsOnDate(slot, date, weekday)
        };
      })
      .sort((a, b) => minutesOf(a.time) - minutesOf(b.time));

    return res.json({ date, weekday, slots: result });
  } catch (err) {
    res.status(500).json({ message: 'Error loading shuttle occupancy', error: err.message });
  }
};

// @desc    Create a new slot (extra shuttle)
// @route   POST /api/admin/slots
exports.createSlot = async (req, res) => {
  try {
    const {
      time,
      period,
      busNumber,
      busType,
      totalSeats = 32,
      direction,
      origin,
      destination,
      availableStops,
      days,
      routeId
    } = req.body || {};

    const cleanTime = normalizeTime(time);
    if (!cleanTime) {
      return res.status(400).json({ message: 'time is required, e.g. "05:30 PM"' });
    }

    const cleanBus = String(busNumber || '').trim().toUpperCase();
    if (!cleanBus) {
      return res.status(400).json({ message: 'busNumber is required, e.g. "RJ 14 PA 2024"' });
    }

    const seats = Number(totalSeats);
    if (!Number.isInteger(seats) || seats < 4 || seats > 60) {
      return res.status(400).json({ message: 'totalSeats must be a whole number between 4 and 60' });
    }

    if (period !== undefined && period !== '' && !PERIODS.includes(period)) {
      return res.status(400).json({ message: `period must be one of: ${PERIODS.join(', ')}` });
    }

    if (days !== undefined && (!Array.isArray(days) || days.some(d => !WEEKDAYS.includes(d)))) {
      return res.status(400).json({ message: 'days must be a list of weekday names, e.g. ["Monday", "Friday"]' });
    }

    const slotData = {
      time: cleanTime,
      period: period || periodFor(cleanTime),
      busNumber: cleanBus,
      totalSeats: seats
    };
    if (direction !== undefined && direction !== '' && !DIRECTIONS.includes(direction)) {
      return res.status(400).json({ message: `direction must be one of: ${DIRECTIONS.join(', ')}` });
    }

    // Start from the standard Route 1 stops for the chosen direction; any fields sent override them
    Object.assign(slotData, direction === 'City to Campus' ? CITY_TO_CAMPUS_DEFAULTS : CAMPUS_TO_CITY_DEFAULTS);
    if (routeId) {
      const route = isDbConnected()
        ? (mongoose.isValidObjectId(routeId) ? await Route.findById(routeId) : null)
        : memoryStore.routes.find(item => item._id === routeId);
      if (!route) return res.status(400).json({ message: 'Selected route was not found' });
      slotData.routeId = route._id;
      slotData.routeName = route.name;
      slotData.direction = route.direction;
      slotData.origin = route.origin;
      slotData.destination = route.destination;
      slotData.availableStops = route.availableStops;
      slotData.etaMinutes = route.etaMinutes;
      slotData.durationMinutes = route.durationMinutes;
    }
    if (busType) slotData.busType = String(busType).trim();
    if (origin) slotData.origin = String(origin).trim();
    if (destination) slotData.destination = String(destination).trim();
    if (Array.isArray(availableStops) && availableStops.length > 0) slotData.availableStops = availableStops;
    if (Array.isArray(days) && days.length > 0) slotData.days = days;

    if (isDbConnected()) {
      const slot = await Slot.create(slotData);
      return res.status(201).json({ message: 'Extra shuttle added successfully!', slot });
    }

    // In-memory fallback: same defaults as the Slot model
    const memSlot = {
      _id: crypto.randomBytes(12).toString('hex'),
      busType: 'AC Executive Shuttle',
      days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      createdAt: new Date().toISOString(),
      ...slotData
    };
    memoryStore.slots.push(memSlot);
    return res.status(201).json({ message: 'Extra shuttle added successfully!', slot: memSlot });
  } catch (err) {
    res.status(500).json({ message: 'Server error adding shuttle', error: err.message });
  }
};

// @desc    Cancel a shuttle for one date: every Confirmed booking becomes Cancelled with a reason
// @route   POST /api/admin/slots/:slotId/cancel   body: { date, reason }
exports.cancelSlot = async (req, res) => {
  try {
    const { slotId } = req.params;
    const { date } = req.body || {};
    const reason = String((req.body && req.body.reason) || '').trim();

    if (!date || !isValidDate(date)) {
      return res.status(400).json({ message: 'date is required in YYYY-MM-DD format' });
    }
    if (!reason) {
      return res.status(400).json({ message: 'A reason is required to cancel a shuttle' });
    }
    if (reason.length > 300) {
      return res.status(400).json({ message: 'Reason must be 300 characters or fewer' });
    }

    const slot = await findSlot(slotId);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    let cancelledCount = 0;
    const cancellation = { date, reason, cancelledAt: new Date() };

    if (isDbConnected()) {
      // Remember the cancellation on the slot (replacing an earlier one for the same date)
      await Slot.updateOne({ _id: slotId }, { $pull: { cancelledDates: { date } } });
      await Slot.updateOne({ _id: slotId }, { $push: { cancelledDates: cancellation } });

      const result = await Booking.updateMany(
        { slot: slotId, date, status: 'Confirmed' },
        { $set: { status: 'Cancelled', cancelReason: reason } }
      );
      cancelledCount = result.modifiedCount;
    } else {
      slot.cancelledDates = (slot.cancelledDates || []).filter(c => c.date !== date).concat(cancellation);
      memoryStore.bookings.forEach(b => {
        if (slotIdOf(b) === slotId && b.date === date && b.status === 'Confirmed') {
          b.status = 'Cancelled';
          b.cancelReason = reason;
          cancelledCount += 1;
        }
      });
    }

    // Broadcast schedule cancellation to real-time clients in that schedule room
    broadcastScheduleCancelled({ slotId, date, reason });

    return res.json({
      message: cancelledCount > 0
        ? `Shuttle cancelled for ${date}. ${cancelledCount} booking(s) marked as Cancelled.`
        : `Shuttle cancelled for ${date}. There were no confirmed bookings to cancel.`,
      slotId,
      date,
      reason,
      cancelledCount
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error cancelling shuttle', error: err.message });
  }
};

// @desc    Confirmed passengers for a slot on a date, sorted by seat
// @route   GET /api/admin/slots/:slotId/passengers?date=YYYY-MM-DD
exports.getPassengers = async (req, res) => {
  try {
    const { slotId } = req.params;
    const date = req.query.date || today();
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'date must be in YYYY-MM-DD format' });
    }

    const slot = await findSlot(slotId);
    if (!slot) {
      return res.status(404).json({ message: 'Slot not found' });
    }

    let bookings;
    if (isDbConnected()) {
      bookings = await Booking.find({ slot: slotId, date, status: 'Confirmed' }).sort({ seatNumber: 1 });
    } else {
      bookings = memoryStore.bookings
        .filter(b => slotIdOf(b) === slotId && b.date === date && b.status === 'Confirmed')
        .sort((a, b) => a.seatNumber - b.seatNumber);
    }

    const passengers = bookings.map(b => ({
      _id: b._id,
      passengerName: b.passengerName,
      passengerRoll: b.passengerRoll,
      passengerEmail: b.passengerEmail,
      seatNumber: b.seatNumber,
      stop: b.stop,
      bookingCode: b.bookingCode
    }));

    return res.json({ slot: slotSummary(slot), date, count: passengers.length, passengers });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving passenger list', error: err.message });
  }
};

// @desc    Confirmed passengers across every shuttle on a date
// @route   GET /api/admin/slots/passengers?date=YYYY-MM-DD
exports.getDailyPassengers = async (req, res) => {
  try {
    const date = req.query.date || today();
    if (!isValidDate(date)) {
      return res.status(400).json({ message: 'date must be in YYYY-MM-DD format' });
    }
    if (date > addDays(today(), 2)) {
      return res.status(400).json({ message: 'Passenger reports are available only through the day after tomorrow' });
    }

    let slots;
    let bookings;
    if (isDbConnected()) {
      [slots, bookings] = await Promise.all([
        Slot.find(),
        Booking.find({ date, status: 'Confirmed' }).sort({ seatNumber: 1 })
      ]);
    } else {
      slots = memoryStore.slots;
      bookings = memoryStore.bookings
        .filter(booking => booking.date === date && booking.status === 'Confirmed')
        .sort((a, b) => a.seatNumber - b.seatNumber);
    }

    const slotsById = new Map(slots.map(slot => [String(slot._id), slot]));
    const passengers = bookings
      .map(booking => {
        const slot = slotsById.get(slotIdOf(booking));
        if (!slot) return null;
        return {
          _id: booking._id,
          passengerName: booking.passengerName,
          passengerRoll: booking.passengerRoll,
          passengerEmail: booking.passengerEmail,
          seatNumber: booking.seatNumber,
          stop: booking.stop,
          bookingCode: booking.bookingCode,
          slot: slotSummary(slot)
        };
      })
      .filter(Boolean)
      .sort((a, b) => minutesOf(a.slot.time) - minutesOf(b.slot.time) || a.seatNumber - b.seatNumber);

    return res.json({
      date,
      weekday: weekdayOf(date),
      count: passengers.length,
      passengers
    });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving daily passenger report', error: err.message });
  }
};
