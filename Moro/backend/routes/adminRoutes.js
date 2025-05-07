const express = require('express');
const router = express.Router();
const { getAllBookings, updateBookingStatus } = require('../controllers/bookingController');
const { protect, admin } = require('../middleware/auth');

// Admin routes - all protected with admin middleware
router.route('/bookings')
  .get(protect, admin, getAllBookings);

router.route('/bookings/:id')
  .put(protect, admin, updateBookingStatus);

module.exports = router;