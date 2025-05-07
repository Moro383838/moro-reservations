const express = require("express");
const router = express.Router();
const {
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
  checkAvailability,
} = require("../controllers/bookingController");
const { protect } = require("../middleware/auth");
const bookingController = require("../controllers/bookingController");
// Public routes
router.get("/availability", checkAvailability);
router.get("/available-slots", bookingController.getAvailableTimeSlots);
router.post("/availability/tables", bookingController.checkTableAvailability);

// Protected routes
router.route("/").post(protect, createBooking).get(protect, getUserBookings);

router.route("/:id").get(protect, getBookingById);

router.put("/:id/cancel", protect, cancelBooking);
router.post("/availability", bookingController.checkAvailability);

module.exports = router;
