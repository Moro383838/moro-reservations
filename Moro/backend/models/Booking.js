const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['hotel', 'restaurant', 'wedding'], required: true },
  date: { type: String, required: true },
  timeStart: { type: String }, // For restaurant and wedding
  hours: { type: Number }, // For restaurant and wedding
  guests: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'confirmed', 'cancelled'], default: 'pending' },
  notes: { type: String },
  contactPhone: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Method to check for time conflicts
bookingSchema.statics.checkTimeConflict = async function(type, date, timeStart, hours) {
  if (type !== 'restaurant' && type !== 'wedding') return false;
  
  // Convert timeStart to hours for easier comparison (e.g., "14:00" -> 14)
  const bookingStartHour = parseInt(timeStart.split(':')[0]);
  const bookingEndHour = bookingStartHour + hours;

  // Find bookings on the same date and type
  const existingBookings = await this.find({
    type,
    date,
    status: { $ne: 'cancelled' } // Exclude cancelled bookings
  });

  // Check for time conflicts
  return existingBookings.some(booking => {
    const existingStartHour = parseInt(booking.timeStart.split(':')[0]);
    const existingEndHour = existingStartHour + booking.hours;

    // Check if there's an overlap
    return (
      (bookingStartHour >= existingStartHour && bookingStartHour < existingEndHour) ||
      (bookingEndHour > existingStartHour && bookingEndHour <= existingEndHour) ||
      (bookingStartHour <= existingStartHour && bookingEndHour >= existingEndHour)
    );
  });
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;