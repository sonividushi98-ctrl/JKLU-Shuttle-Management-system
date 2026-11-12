// Official JKLU Shuttle Service timetable, Academic Year 2026-27, as bookable trips.
//
// Each trip is one bus run in one direction:
// - "Campus to City": passengers board at JKLU and choose a drop stop from availableStops.
// - "City to Campus": passengers choose a boarding stop from availableStops and get off at JKLU.
// etaMinutes = minutes after the departure time that the bus reaches each stop.
// durationMinutes = minutes from departure to the final arrival.
// Bus numbers are not on the official sheet; the app's existing buses are used.

const CAMPUS = 'JKLU Campus Main Gate';
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const WEEKEND = ['Saturday', 'Sunday'];

const ROUTE_1_BUS = { busNumber: 'RJ 14 PA 2024', busType: 'JKLU AC Electric Shuttle', totalSeats: 32 };
const ROUTE_2_BUS = { busNumber: 'RJ 14 PB 1102', busType: 'Tata Starbus AC', totalSeats: 32 };

const OFFICIAL_TRIPS = [
  // ---------- Monday to Friday ----------
  {
    _id: '672000000000000000000011',
    routeName: 'Route 1',
    time: '01:30 PM',
    period: 'Afternoon',
    direction: 'Campus to City',
    origin: CAMPUS,
    destination: 'Mansarovar Metro Station',
    availableStops: ['Elements Mall', 'Mansarovar Metro Station'],
    etaMinutes: { 'Elements Mall': 20, 'Mansarovar Metro Station': 30 },
    durationMinutes: 30,
    days: WEEKDAYS,
    ...ROUTE_1_BUS
  },
  {
    _id: '672000000000000000000012',
    routeName: 'Route 1',
    time: '03:45 PM',
    period: 'Afternoon',
    direction: 'City to Campus',
    origin: 'Mansarovar Metro Station',
    destination: CAMPUS,
    availableStops: ['Mansarovar Metro Station', 'Elements Mall'],
    etaMinutes: { 'Mansarovar Metro Station': 0, 'Elements Mall': 10 },
    durationMinutes: 30,
    days: WEEKDAYS,
    ...ROUTE_1_BUS
  },
  {
    _id: '672000000000000000000013',
    routeName: 'Route 2',
    time: '07:30 PM',
    period: 'Evening',
    direction: 'City to Campus',
    origin: 'Mansarovar Metro Station',
    destination: CAMPUS,
    availableStops: ['Mansarovar Metro Station'],
    etaMinutes: { 'Mansarovar Metro Station': 0 },
    durationMinutes: 30,
    days: WEEKDAYS,
    ...ROUTE_2_BUS
  },
  {
    _id: '672000000000000000000014',
    routeName: 'Route 2',
    time: '08:15 PM',
    period: 'Night',
    direction: 'Campus to City',
    origin: CAMPUS,
    destination: 'Mansarovar Metro Station',
    availableStops: ['Elements Mall', 'Mansarovar Metro Station'],
    etaMinutes: { 'Elements Mall': 25, 'Mansarovar Metro Station': 35 },
    durationMinutes: 35,
    days: WEEKDAYS,
    ...ROUTE_2_BUS
  },

  // ---------- Saturday, Sunday & holidays ----------
  {
    _id: '672000000000000000000015',
    routeName: 'Route 1',
    time: '11:30 AM',
    period: 'Morning',
    direction: 'Campus to City',
    origin: CAMPUS,
    destination: 'Mansarovar Metro Station',
    availableStops: ['Elements Mall', 'Mansarovar Metro Station'],
    etaMinutes: { 'Elements Mall': 20, 'Mansarovar Metro Station': 30 },
    durationMinutes: 30,
    days: WEEKEND,
    ...ROUTE_1_BUS
  },
  {
    _id: '672000000000000000000016',
    routeName: 'Route 1',
    time: '03:00 PM',
    period: 'Afternoon',
    direction: 'City to Campus',
    origin: 'Mansarovar Metro Station',
    destination: CAMPUS,
    availableStops: ['Mansarovar Metro Station', 'Elements Mall'],
    etaMinutes: { 'Mansarovar Metro Station': 0, 'Elements Mall': 10 },
    durationMinutes: 30,
    days: WEEKEND,
    ...ROUTE_1_BUS
  },
  {
    _id: '672000000000000000000017',
    routeName: 'Route 2',
    time: '03:50 PM',
    period: 'Afternoon',
    direction: 'Campus to City',
    origin: CAMPUS,
    destination: 'GT Mall, WTP',
    availableStops: [
      'Elements Mall',
      'Mansarovar Metro Station',
      'Ganga Jamuna Petrol Pump',
      'Gujar ki Thadi',
      'Ridhi Sidhi Churaha',
      'Triveni Nagar Churaha',
      'Gopalpura Mode',
      'GT Mall, WTP'
    ],
    etaMinutes: {
      'Elements Mall': 20,
      'Mansarovar Metro Station': 25,
      'Ganga Jamuna Petrol Pump': 30,
      'Gujar ki Thadi': 35,
      'Ridhi Sidhi Churaha': 40,
      'Triveni Nagar Churaha': 45,
      'Gopalpura Mode': 55,
      'GT Mall, WTP': 70
    },
    durationMinutes: 70,
    days: WEEKEND,
    ...ROUTE_2_BUS
  },
  {
    _id: '672000000000000000000018',
    routeName: 'Route 2',
    time: '08:00 PM',
    period: 'Night',
    direction: 'City to Campus',
    origin: 'GT Mall, WTP',
    destination: CAMPUS,
    availableStops: ['GT Mall, WTP', 'Mansarovar Metro Station'],
    etaMinutes: { 'GT Mall, WTP': 0, 'Mansarovar Metro Station': 40 },
    durationMinutes: 60,
    days: WEEKEND,
    ...ROUTE_2_BUS
  }
];

module.exports = { OFFICIAL_TRIPS, CAMPUS };
