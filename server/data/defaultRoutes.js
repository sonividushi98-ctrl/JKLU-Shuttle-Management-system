const CAMPUS = 'JKLU Campus Main Gate';

module.exports = [
  {
    name: 'Route 1',
    direction: 'Campus to City',
    origin: CAMPUS,
    destination: 'Mansarovar Metro Station',
    availableStops: ['Elements Mall', 'Mansarovar Metro Station'],
    etaMinutes: { 'Elements Mall': 20, 'Mansarovar Metro Station': 30 },
    durationMinutes: 30
  },
  {
    name: 'Route 2',
    direction: 'Campus to City',
    origin: CAMPUS,
    destination: 'GT Mall, WTP',
    availableStops: [
      'Elements Mall', 'Mansarovar Metro Station', 'Ganga Jamuna Petrol Pump',
      'Gujar ki Thadi', 'Ridhi Sidhi Churaha', 'Triveni Nagar Churaha',
      'Gopalpura Mode', 'GT Mall, WTP'
    ],
    etaMinutes: {
      'Elements Mall': 20, 'Mansarovar Metro Station': 25, 'Ganga Jamuna Petrol Pump': 30,
      'Gujar ki Thadi': 35, 'Ridhi Sidhi Churaha': 40, 'Triveni Nagar Churaha': 45,
      'Gopalpura Mode': 55, 'GT Mall, WTP': 70
    },
    durationMinutes: 70
  }
];
