const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { adminOnly } = require('../middleware/authMiddleware');

// Every admin route requires a valid token for an Admin account
router.use(adminOnly);

router.get('/slots/load', adminController.getSlotLoad);
router.post('/slots', adminController.createSlot);
router.post('/slots/:slotId/cancel', adminController.cancelSlot);
router.get('/slots/:slotId/passengers', adminController.getPassengers);

const routeController = require('../controllers/routeController');
router.get('/routes', routeController.listRoutes);
router.post('/routes', routeController.createRoute);
router.put('/routes/:routeId', routeController.updateRoute);
router.delete('/routes/:routeId', routeController.deleteRoute);

module.exports = router;
