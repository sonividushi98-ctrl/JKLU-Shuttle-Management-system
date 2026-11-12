// Official JKLU Shuttle Service timetable (Academic Year 2026-27) as bookable trips.
// The server sends the same trips from /api/bookings/slots; this copy is only the
// offline fallback, so keep it in step with server/data/officialTrips.js.

export const CAMPUS = 'JKLU Campus Main Gate';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEKEND = ['Saturday', 'Sunday'];
const ROUTE_1_BUS = { busNumber: 'RJ 14 PA 2024', busType: 'JKLU AC Electric Shuttle', totalSeats: 32 };
const ROUTE_2_BUS = { busNumber: 'RJ 14 PB 1102', busType: 'Tata Starbus AC', totalSeats: 32 };

export const OFFICIAL_TRIPS = [
  {
    _id: '672000000000000000000011', routeName: 'Route 1', time: '01:30 PM', period: 'Afternoon',
    direction: 'Campus to City', origin: CAMPUS, destination: 'Mansarovar Metro Station',
    availableStops: ['Elements Mall', 'Mansarovar Metro Station'],
    etaMinutes: { 'Elements Mall': 20, 'Mansarovar Metro Station': 30 }, durationMinutes: 30,
    days: WEEKDAYS, ...ROUTE_1_BUS
  },
  {
    _id: '672000000000000000000012', routeName: 'Route 1', time: '03:45 PM', period: 'Afternoon',
    direction: 'City to Campus', origin: 'Mansarovar Metro Station', destination: CAMPUS,
    availableStops: ['Mansarovar Metro Station', 'Elements Mall'],
    etaMinutes: { 'Mansarovar Metro Station': 0, 'Elements Mall': 10 }, durationMinutes: 30,
    days: WEEKDAYS, ...ROUTE_1_BUS
  },
  {
    _id: '672000000000000000000013', routeName: 'Route 2', time: '07:30 PM', period: 'Evening',
    direction: 'City to Campus', origin: 'Mansarovar Metro Station', destination: CAMPUS,
    availableStops: ['Mansarovar Metro Station'],
    etaMinutes: { 'Mansarovar Metro Station': 0 }, durationMinutes: 30,
    days: WEEKDAYS, ...ROUTE_2_BUS
  },
  {
    _id: '672000000000000000000014', routeName: 'Route 2', time: '08:15 PM', period: 'Night',
    direction: 'Campus to City', origin: CAMPUS, destination: 'Mansarovar Metro Station',
    availableStops: ['Elements Mall', 'Mansarovar Metro Station'],
    etaMinutes: { 'Elements Mall': 25, 'Mansarovar Metro Station': 35 }, durationMinutes: 35,
    days: WEEKDAYS, ...ROUTE_2_BUS
  },
  {
    _id: '672000000000000000000015', routeName: 'Route 1', time: '11:30 AM', period: 'Morning',
    direction: 'Campus to City', origin: CAMPUS, destination: 'Mansarovar Metro Station',
    availableStops: ['Elements Mall', 'Mansarovar Metro Station'],
    etaMinutes: { 'Elements Mall': 20, 'Mansarovar Metro Station': 30 }, durationMinutes: 30,
    days: WEEKEND, ...ROUTE_1_BUS
  },
  {
    _id: '672000000000000000000016', routeName: 'Route 1', time: '03:00 PM', period: 'Afternoon',
    direction: 'City to Campus', origin: 'Mansarovar Metro Station', destination: CAMPUS,
    availableStops: ['Mansarovar Metro Station', 'Elements Mall'],
    etaMinutes: { 'Mansarovar Metro Station': 0, 'Elements Mall': 10 }, durationMinutes: 30,
    days: WEEKEND, ...ROUTE_1_BUS
  },
  {
    _id: '672000000000000000000017', routeName: 'Route 2', time: '03:50 PM', period: 'Afternoon',
    direction: 'Campus to City', origin: CAMPUS, destination: 'GT Mall, WTP',
    availableStops: [
      'Elements Mall', 'Mansarovar Metro Station', 'Ganga Jamuna Petrol Pump', 'Gujar ki Thadi',
      'Ridhi Sidhi Churaha', 'Triveni Nagar Churaha', 'Gopalpura Mode', 'GT Mall, WTP'
    ],
    etaMinutes: {
      'Elements Mall': 20, 'Mansarovar Metro Station': 25, 'Ganga Jamuna Petrol Pump': 30, 'Gujar ki Thadi': 35,
      'Ridhi Sidhi Churaha': 40, 'Triveni Nagar Churaha': 45, 'Gopalpura Mode': 55, 'GT Mall, WTP': 70
    },
    durationMinutes: 70,
    days: WEEKEND, ...ROUTE_2_BUS
  },
  {
    _id: '672000000000000000000018', routeName: 'Route 2', time: '08:00 PM', period: 'Night',
    direction: 'City to Campus', origin: 'GT Mall, WTP', destination: CAMPUS,
    availableStops: ['GT Mall, WTP', 'Mansarovar Metro Station'],
    etaMinutes: { 'GT Mall, WTP': 0, 'Mansarovar Metro Station': 40 }, durationMinutes: 60,
    days: WEEKEND, ...ROUTE_2_BUS
  }
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_RE = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

// "03:45 PM" -> minutes after midnight
export const minutesOf = (time) => {
  const m = TIME_RE.exec(String(time || '').trim());
  if (!m) return 0;
  return ((Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)) * 60 + Number(m[2]);
};

// "03:45 PM" + 25 -> "04:10 PM"
export const addMinutes = (time, mins) => {
  const total = (minutesOf(time) + (Number(mins) || 0)) % (24 * 60);
  const h = Math.floor(total / 60);
  return `${String(h % 12 || 12).padStart(2, '0')}:${String(total % 60).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

// Trips that come back to campus (passengers pick a boarding stop instead of a drop stop)
export const isInbound = (slot) =>
  slot?.direction === 'City to Campus' || /jklu/i.test(slot?.destination || '');

export const stopsOf = (slot) => (Array.isArray(slot?.availableStops) ? slot.availableStops : []);

const etaOf = (slot, stop) => {
  const eta = slot?.etaMinutes || {};
  const key = Object.keys(eta).find((k) => k.toLowerCase() === String(stop).toLowerCase());
  return key === undefined ? null : eta[key];
};

// Clock time the bus reaches a stop on this trip, or null when unknown
export const stopTime = (slot, stop) => {
  const eta = etaOf(slot, stop);
  return eta === null ? null : addMinutes(slot.time, eta);
};

// Clock time the bus reaches the end of the trip
export const arrivalTime = (slot) => {
  if (typeof slot?.durationMinutes === 'number') return addMinutes(slot.time, slot.durationMinutes);
  const etas = Object.values(slot?.etaMinutes || {});
  return etas.length ? addMinutes(slot.time, Math.max(...etas)) : null;
};

// Where a booked passenger gets on and off
export const tripEnds = (slot, stop) =>
  isInbound(slot) ? { from: stop, to: 'JKLU Campus' } : { from: 'JKLU Campus', to: stop };

// Weekday name for a 'YYYY-MM-DD' date
export const weekdayOf = (date) => DAY_NAMES[new Date(`${date}T00:00:00Z`).getUTCDay()];

// Whether a trip runs on a date (trips without a day list run every day)
export const runsOn = (slot, date) =>
  !Array.isArray(slot?.days) || slot.days.length === 0 || slot.days.includes(weekdayOf(date));
