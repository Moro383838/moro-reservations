const Booking = require("../models/Booking");
const User = require("../models/User");
const Table = require("../models/Table");

// تهيئة أنواع الطاولات عند بدء التطبيق
Table.initializeTableTypes().catch(err => {
  console.error('خطأ في تهيئة أنواع الطاولات:', err);
});
// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res) => {
  try {
    const { type, date, timeStart, hours, guests, notes, contactPhone, tableType, tableCount } =
      req.body;
    const userId = req.user.id;

    // التحقق من توفر صالة الأفراح (يمكن حجزها لشخص واحد فقط في اليوم)
    if (type === "wedding") {
      const weddingAvailability = await Table.checkWeddingHallAvailability(date);
      
      // إذا كان هناك حجز مؤكد بالفعل، فلا يمكن إضافة حجز جديد
      if (!weddingAvailability.available) {
        return res
          .status(400)
          .json({ message: "صالة الأفراح محجوزة بالفعل في هذا اليوم، يرجى اختيار يوم آخر" });
      }
    }

    // التحقق من تعارض الأوقات (للمطعم وصالة الأفراح)
    if (type === "restaurant" || type === "wedding") {
      const hasConflict = await Booking.checkTimeConflict(
        type,
        date,
        timeStart,
        hours
      );

      if (hasConflict) {
        return res
          .status(400)
          .json({ message: "هذا الوقت محجوز بالفعل، يرجى اختيار وقت آخر" });
      }
      
      // التحقق من توفر الطاولات للمطعم
      if (type === "restaurant" && tableType) {
        const count = tableCount || 1;
        const tableAvailability = await Table.checkAvailability(
          tableType,
          date,
          timeStart,
          hours,
          count
        );
        
        if (!tableAvailability.available) {
          return res.status(400).json({ 
            message: `لا يوجد عدد كافٍ من الطاولات المتاحة من نوع ${tableType}. المتاح حالياً: ${tableAvailability.availableCount} من أصل ${tableAvailability.totalCount}` 
          });
        }
      }
    }

    // إنشاء حجز جديد
    const newBooking = new Booking({
      userId,
      type,
      date,
      timeStart,
      hours,
      guests,
      notes,
      contactPhone,
      status: "pending",
    });

    await newBooking.save();
    
    // حجز الطاولات إذا كان الحجز للمطعم
    if (type === "restaurant" && tableType) {
      const count = tableCount || 1;
      await Table.reserveTables(
        tableType,
        newBooking._id,
        date,
        timeStart,
        hours,
        count
      );
    }

    res.status(201).json(newBooking);
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({ message: "حدث خطأ أثناء إنشاء الحجز" });
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings
// @access  Private
exports.getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(bookings);
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب الحجوزات" });
  }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
// @access  Private
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "الحجز غير موجود" });
    }

    // Check if user owns this booking or is admin
    const user = await User.findById(req.user.id);
    if (booking.userId.toString() !== req.user.id && user.role !== "admin") {
      return res.status(403).json({ message: "غير مصرح لك بعرض هذا الحجز" });
    }

    res.json(booking);
  } catch (error) {
    console.error("Get booking error:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب الحجز" });
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "الحجز غير موجود" });
    }

    // Check if user owns this booking
    if (booking.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: "غير مصرح لك بإلغاء هذا الحجز" });
    }

    booking.status = "cancelled";
    await booking.save();
    
    // إلغاء حجز الطاولات إذا كان الحجز للمطعم أو صالة الأفراح
    if (booking.type === "restaurant" || booking.type === "wedding") {
      await Table.cancelReservation(booking._id);
    }

    res.json(booking);
  } catch (error) {
    console.error("Cancel booking error:", error);
    res.status(500).json({ message: "حدث خطأ أثناء إلغاء الحجز" });
  }
};

// @desc    Check availability for a specific date and type
// @route   GET /api/availability
// @access  Public
exports.checkAvailability = async (req, res) => {
  try {
    const { type, date, timeStart, hours, tableType, tableCount } = req.query;

    if (!type || !date) {
      return res.status(400).json({ message: "يرجى تحديد النوع والتاريخ" });
    }

    // Get all bookings for the specified date and type
    const bookings = await Booking.find({
      type,
      date,
      status: { $ne: "cancelled" }, // Exclude cancelled bookings
    });

    // للتحقق من توفر صالة الأفراح
    if (type === "wedding") {
      const weddingAvailability = await Table.checkWeddingHallAvailability(date);
      
      if (!weddingAvailability.available) {
        return res.json({
          available: false,
          message: "صالة الأفراح محجوزة بالفعل في هذا اليوم، يرجى اختيار يوم آخر"
        });
      }
    }

    // For restaurant and wedding, check time availability if timeStart and hours are provided
    if ((type === "restaurant" || type === "wedding") && timeStart && hours) {
      // Check for time conflicts using the model method
      const hasConflict = await Booking.checkTimeConflict(
        type,
        date,
        timeStart,
        parseInt(hours)
      );
      
      // للمطعم، تحقق أيضًا من توفر الطاولات
      if (type === "restaurant" && tableType && !hasConflict) {
        const count = tableCount || 1;
        const tableAvailability = await Table.checkAvailability(
          tableType,
          date,
          timeStart,
          parseInt(hours),
          parseInt(count)
        );
        
        if (!tableAvailability.available) {
          return res.json({
            available: false,
            availableCount: tableAvailability.availableCount,
            totalCount: tableAvailability.totalCount,
            message: `لا يوجد عدد كافٍ من الطاولات المتاحة من نوع ${tableType}. المتاح حالياً: ${tableAvailability.availableCount} من أصل ${tableAvailability.totalCount}`
          });
        }
      }

      return res.json({
        available: !hasConflict,
        message: hasConflict
          ? "هذا الوقت محجوز بالفعل، يرجى اختيار وقت آخر"
          : "الوقت متاح للحجز",
      });
    }

    // For restaurant and wedding without specific time, return occupied time slots
    if (type === "restaurant" || type === "wedding") {
      const occupiedTimeSlots = bookings.map((booking) => {
        const startHour = parseInt(booking.timeStart.split(":")[0]);
        const endHour = startHour + booking.hours;

        return {
          startTime: booking.timeStart,
          endTime: `${endHour}:00`,
          hours: booking.hours,
        };
      });

      return res.json({ occupiedTimeSlots });
    }

    // For hotel, just return the number of bookings
    res.json({ bookingsCount: bookings.length });
  } catch (error) {
    console.error("Availability check error:", error);
    res.status(500).json({ message: "حدث خطأ أثناء التحقق من التوفر" });
  }
};

// @desc    Get all bookings (admin only)
// @route   GET /api/admin/bookings
// @access  Private/Admin
exports.getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .sort({ createdAt: -1 })
      .populate("userId", "firstName lastName email");
    res.json(bookings);
  } catch (error) {
    console.error("Get all bookings error:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب جميع الحجوزات" });
  }
};

// @desc    Update booking status (admin only)
// @route   PUT /api/admin/bookings/:id
// @access  Private/Admin
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "يرجى تحديد حالة صحيحة" });
    }
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "الحجز غير موجود" });
    }
    
    // إذا كان الحجز لصالة الأفراح وتم تأكيده، تحقق من عدم وجود حجز مؤكد آخر في نفس اليوم
    if (booking.type === "wedding" && status === "confirmed") {
      try {
        await Table.updateWeddingBookingStatus(booking._id, status);
      } catch (error) {
        return res.status(400).json({ message: error.message });
      }
    }
    
    // إذا تم إلغاء الحجز، قم بإلغاء حجز الطاولات
    if (status === "cancelled") {
      if (booking.type === "restaurant") {
        await Table.cancelReservation(booking._id);
      }
    }

    booking.status = status;
    await booking.save();

    res.json(booking);
  } catch (error) {
    console.error("Update booking status error:", error);
    res.status(500).json({ message: "حدث خطأ أثناء تحديث حالة الحجز" });
  }
};
// @desc    Check table availability
// @route   POST /api/availability/tables
// @access  Public
exports.checkTableAvailability = async (req, res) => {
  const { tableType, date, timeStart, hours } = req.body;
  try {
    if (!tableType || !date || !timeStart || !hours) {
      return res.status(400).json({ message: "يرجى توفير جميع البيانات المطلوبة" });
    }
    
    // التأكد من تهيئة أنواع الطاولات قبل التحقق من التوفر
    await Table.initializeTableTypes().catch(err => {
      console.warn("تحذير: فشل تهيئة أنواع الطاولات:", err);
    });
    
    // الحصول على معلومات الطاولة المحددة
    const tableInfo = await Table.findOne({ type: tableType });
    if (!tableInfo) {
      return res.status(404).json({ 
        message: `نوع الطاولة ${tableType} غير موجود`,
        available: false,
        availableCount: 0,
        totalCount: 0
      });
    }
    
    // التحقق من توفر الطاولات
    const availability = await Table.checkAvailability(tableType, date, timeStart, parseInt(hours));
    
    // إذا لم تكن الطاولات متاحة، قم بجلب الأوقات المتاحة
    if (!availability.available) {
      const availableTimes = await getAvailableTimesForTable(tableType, date, parseInt(hours));
      
      return res.json({
        available: availability.available,
        availableCount: availability.availableCount,
        totalCount: tableInfo.totalCount, // استخدام العدد الإجمالي من قاعدة البيانات
        availableTimes: availableTimes,
        message: `لا يوجد عدد كافٍ من الطاولات المتاحة من نوع ${tableType}. المتاح حالياً: ${availability.availableCount} من أصل ${tableInfo.totalCount}`
      });
    }
    
    res.json({
      available: availability.available,
      availableCount: availability.availableCount,
      totalCount: tableInfo.totalCount, // استخدام العدد الإجمالي من قاعدة البيانات
      message: `يوجد ${availability.availableCount} طاولة متاحة من نوع ${tableType} من أصل ${tableInfo.totalCount}`
    });
  } catch (err) {
    console.error("Table availability check error:", err);
    res.status(500).json({ message: "حدث خطأ أثناء التحقق من توفر الطاولات" });
  }
};

// دالة مساعدة للحصول على الأوقات المتاحة لنوع طاولة معين في يوم معين
async function getAvailableTimesForTable(tableType, date, hours) {
  try {
    // الأوقات المتاحة للمطعم
    const availableTimeSlots = [
      "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
      "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
      "21:00", "21:30"
    ];
    
    // الحصول على جميع حجوزات المطعم في هذا اليوم
    const bookings = await Booking.find({
      type: "restaurant",
      date,
      status: { $ne: "cancelled" }
    });
    
    // فلترة الأوقات المتاحة بناءً على توفر الطاولات
    const availableTimes = [];
    
    for (const timeSlot of availableTimeSlots) {
      const availability = await Table.checkAvailability(tableType, date, timeSlot, hours);
      if (availability.available) {
        availableTimes.push(timeSlot);
      }
    }
    
    return availableTimes;
  } catch (error) {
    console.error("Error getting available times for table:", error);
    return [];
  }
}

// @desc    Get available time slots for a specific date and type
// @route   GET /api/bookings/available-slots
// @access  Public
exports.getAvailableTimeSlots = async (req, res) => {
  try {
    const { type, date, hours } = req.query;

    if (!type || !date || !hours) {
      return res.status(400).json({ message: "يرجى تحديد النوع والتاريخ وعدد الساعات" });
    }

    // الأوقات المتاحة حسب نوع الحجز
    let availableTimeSlots = [];
    
    if (type === "wedding") {
      availableTimeSlots = [
        "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", 
        "16:00", "17:00", "18:00", "19:00", "20:00"
      ];
    } else if (type === "restaurant") {
      availableTimeSlots = [
        "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
        "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
        "21:00", "21:30"
      ];
    }

    // Get all bookings for the specified date and type
    const bookings = await Booking.find({
      type,
      date,
      status: { $ne: "cancelled" }, // Exclude cancelled bookings
    });

    // Filter out time slots that conflict with existing bookings
    const parsedHours = parseInt(hours);
    const availableSlots = availableTimeSlots.filter(timeSlot => {
      // Check if this time slot conflicts with any existing booking
      return !bookings.some(booking => {
        const bookingStart = booking.timeStart;
        const bookingHours = booking.hours;
        
        // Convert time strings to comparable values (minutes since midnight)
        const slotStartMinutes = convertTimeToMinutes(timeSlot);
        const slotEndMinutes = slotStartMinutes + (parsedHours * 60);
        
        const bookingStartMinutes = convertTimeToMinutes(bookingStart);
        const bookingEndMinutes = bookingStartMinutes + (bookingHours * 60);
        
        // Check for overlap
        return (slotStartMinutes < bookingEndMinutes && slotEndMinutes > bookingStartMinutes);
      });
    });

    res.json({ availableSlots });
  } catch (error) {
    console.error("Available time slots error:", error);
    res.status(500).json({ message: "حدث خطأ أثناء جلب الأوقات المتاحة" });
  }
};

// Helper function to convert time string (HH:MM) to minutes since midnight
function convertTimeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return (hours * 60) + (minutes || 0);
}
