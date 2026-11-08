const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.get('/slots', bookingController.getSlots);
router.get('/slots/:slotId/booked-seats', bookingController.getBookedSeats);
router.post('/book', bookingController.createBooking);
router.get('/my-trips/:userId', bookingController.getMyTrips);
router.post('/cancel/:bookingId', bookingController.cancelBooking);
router.delete('/:bookingId', bookingController.cancelBooking);
router.get('/stops', bookingController.getStops);
router.get('/track/:busNumber', bookingController.getLiveTracking);

module.exports = router;
