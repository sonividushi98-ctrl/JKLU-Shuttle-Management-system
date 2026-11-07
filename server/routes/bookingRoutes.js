const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

router.get('/slots', bookingController.getSlots);
router.post('/book', bookingController.createBooking);
router.get('/my-trips/:userId', bookingController.getMyTrips);

module.exports = router;
