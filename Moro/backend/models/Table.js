const mongoose = require('mongoose');

const tableSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['indoor', 'outdoor', 'vip', 'family'], 
    required: true 
  },
  totalCount: { 
    type: Number, 
    required: true 
  },
  // سجل الحجوزات الحالية للطاولات
  reservations: [{
    bookingId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'Booking' 
    },
    date: { 
      type: String, 
      required: true 
    },
    timeStart: { 
      type: String, 
      required: true 
    },
    timeEnd: { 
      type: String, 
      required: true 
    },
    count: { 
      type: Number, 
      required: true, 
      default: 1 
    }
  }]
});

// دالة للتحقق من توفر الطاولات
tableSchema.statics.checkAvailability = async function(type, date, timeStart, hours, count = 1) {
  // البحث عن نوع الطاولة
  const tableType = await this.findOne({ type });
  if (!tableType) {
    throw new Error(`نوع الطاولة ${type} غير موجود`);
  }
  
  // تحويل وقت البدء إلى ساعة للمقارنة
  const startHour = parseInt(timeStart.split(':')[0]);
  const endHour = startHour + hours;
  
  // حساب عدد الطاولات المحجوزة في نفس الوقت
  let reservedTables = 0;
  
  for (const reservation of tableType.reservations) {
    if (reservation.date === date) {
      const reservationStart = parseInt(reservation.timeStart.split(':')[0]);
      const reservationEnd = parseInt(reservation.timeEnd.split(':')[0]);
      
      // التحقق من وجود تداخل في الأوقات
      if (
        (startHour >= reservationStart && startHour < reservationEnd) ||
        (endHour > reservationStart && endHour <= reservationEnd) ||
        (startHour <= reservationStart && endHour >= reservationEnd)
      ) {
        reservedTables += reservation.count;
      }
    }
  }
  
  // التحقق من توفر العدد المطلوب من الطاولات
  const availableTables = tableType.totalCount - reservedTables;
  
  // تسجيل معلومات التوفر للتصحيح
  console.log(`معلومات توفر الطاولات - النوع: ${type}, العدد الإجمالي: ${tableType.totalCount}, المحجوز: ${reservedTables}, المتاح: ${availableTables}`);
  
  return {
    available: availableTables >= count,
    availableCount: availableTables,
    totalCount: tableType.totalCount
  };
};

// دالة لحجز الطاولات
tableSchema.statics.reserveTables = async function(type, bookingId, date, timeStart, hours, count = 1) {
  // البحث عن نوع الطاولة
  const tableType = await this.findOne({ type });
  if (!tableType) {
    throw new Error(`نوع الطاولة ${type} غير موجود`);
  }
  
  // التحقق من توفر الطاولات
  const availability = await this.checkAvailability(type, date, timeStart, hours, count);
  if (!availability.available) {
    throw new Error(`لا يوجد عدد كافٍ من الطاولات المتاحة من نوع ${type}`);
  }
  
  // إضافة الحجز إلى سجل الحجوزات
  const endHour = parseInt(timeStart.split(':')[0]) + hours;
  tableType.reservations.push({
    bookingId,
    date,
    timeStart,
    timeEnd: `${endHour}:00`,
    count
  });
  
  await tableType.save();
  return true;
};

// دالة لإلغاء حجز الطاولات
tableSchema.statics.cancelReservation = async function(bookingId) {
  // البحث عن جميع أنواع الطاولات التي تحتوي على هذا الحجز
  const tableTypes = await this.find({
    'reservations.bookingId': bookingId
  });
  
  for (const tableType of tableTypes) {
    // إزالة الحجز من سجل الحجوزات
    tableType.reservations = tableType.reservations.filter(
      reservation => reservation.bookingId.toString() !== bookingId.toString()
    );
    await tableType.save();
  }
  
  return true;
};

// دالة للتحقق من توفر صالة الأفراح في يوم معين
tableSchema.statics.checkWeddingHallAvailability = async function(date) {
  try {
    // البحث عن حجوزات صالة الأفراح في هذا اليوم
    const weddingBookings = await mongoose.model('Booking').find({
      type: 'wedding',
      date,
      status: { $ne: 'cancelled' } // استبعاد الحجوزات الملغاة
    });
    
    // إذا كان هناك أي حجز مؤكد، فإن الصالة غير متاحة
    const confirmedBookings = weddingBookings.filter(booking => booking.status === 'confirmed');
    
    // تصحيح: الصالة متاحة إذا لم يكن هناك حجوزات مؤكدة
    return {
      available: confirmedBookings.length === 0,
      pendingBookings: weddingBookings.filter(booking => booking.status === 'pending').length,
      confirmedBookings: confirmedBookings.length
    };
  } catch (error) {
    console.error('خطأ في التحقق من توفر صالة الأفراح:', error);
    // في حالة حدوث خطأ، نفترض أن الصالة متاحة
    return {
      available: true,
      pendingBookings: 0,
      confirmedBookings: 0,
      error: error.message
    };
  }
};

// دالة للحصول على جميع الطاولات المتاحة
tableSchema.statics.getAllTablesAvailability = async function() {
  try {
    // التأكد من تهيئة أنواع الطاولات
    await this.initializeTableTypes().catch(err => {
      console.warn("تحذير: فشل تهيئة أنواع الطاولات:", err);
    });
    
    // الحصول على جميع أنواع الطاولات
    const tableTypes = await this.find({});
    
    // إنشاء كائن يحتوي على معلومات توفر كل نوع من الطاولات
    const availability = {};
    
    // الحصول على التاريخ الحالي بتنسيق YYYY-MM-DD
    const currentDate = new Date().toISOString().split('T')[0];
    // الحصول على الوقت الحالي بتنسيق HH:00
    const currentHour = new Date().getHours();
    const currentTime = `${currentHour}:00`;
    
    for (const tableType of tableTypes) {
      // حساب عدد الطاولات المحجوزة في الوقت الحالي
      let reservedTables = 0;
      
      for (const reservation of tableType.reservations) {
        if (reservation.date === currentDate) {
          const reservationStart = parseInt(reservation.timeStart.split(':')[0]);
          const reservationEnd = parseInt(reservation.timeEnd.split(':')[0]);
          
          // التحقق من وجود تداخل في الأوقات
          if (
            (currentHour >= reservationStart && currentHour < reservationEnd) ||
            (currentHour + 2 > reservationStart && currentHour + 2 <= reservationEnd) ||
            (currentHour <= reservationStart && currentHour + 2 >= reservationEnd)
          ) {
            reservedTables += reservation.count;
          }
        }
      }
      
      // حساب عدد الطاولات المتاحة
      const availableCount = Math.max(0, tableType.totalCount - reservedTables);
      
      availability[tableType.type] = {
        totalCount: tableType.totalCount,
        availableCount: availableCount,
        available: availableCount > 0, // إضافة حالة التوفر
        reservations: tableType.reservations.length
      };
      
      // تسجيل معلومات التوفر للتصحيح
      console.log(`معلومات توفر الطاولات - النوع: ${tableType.type}, العدد الإجمالي: ${tableType.totalCount}, المحجوز: ${reservedTables}, المتاح: ${availableCount}`);
    }
    
    return availability;
  } catch (error) {
    console.error("خطأ في الحصول على توفر الطاولات:", error);
    // في حالة حدوث خطأ، نعيد قيم افتراضية
    return {
      indoor: { totalCount: 15, availableCount: 15, available: true, reservations: 0 },
      outdoor: { totalCount: 20, availableCount: 20, available: true, reservations: 0 },
      vip: { totalCount: 5, availableCount: 5, available: true, reservations: 0 },
      family: { totalCount: 10, availableCount: 10, available: true, reservations: 0 }
    };
  }
}


// دالة لتحديث حالة حجز صالة الأفراح
tableSchema.statics.updateWeddingBookingStatus = async function(bookingId, newStatus) {
  // إذا تم تأكيد الحجز، نتحقق من عدم وجود حجوزات أخرى مؤكدة في نفس اليوم
  if (newStatus === 'confirmed') {
    const booking = await mongoose.model('Booking').findById(bookingId);
    if (!booking || booking.type !== 'wedding') {
      throw new Error('الحجز غير موجود أو ليس لصالة الأفراح');
    }
    
    // التحقق من عدم وجود حجوزات أخرى مؤكدة في نفس اليوم
    const otherConfirmedBookings = await mongoose.model('Booking').find({
      _id: { $ne: bookingId },
      type: 'wedding',
      date: booking.date,
      status: 'confirmed'
    });
    
    if (otherConfirmedBookings.length > 0) {
      throw new Error('يوجد حجز آخر مؤكد لصالة الأفراح في نفس اليوم');
    }
  }
  
  return true;
};

const Table = mongoose.model('Table', tableSchema);

// إنشاء أنواع الطاولات الافتراضية إذا لم تكن موجودة
Table.initializeTableTypes = async function() {
  const tableTypes = ['indoor', 'outdoor', 'vip', 'family'];
  const counts = [15, 20, 5, 10]; // مجموع 50 طاولة
  
  for (let i = 0; i < tableTypes.length; i++) {
    const exists = await Table.findOne({ type: tableTypes[i] });
    if (!exists) {
      await new Table({
        type: tableTypes[i],
        totalCount: counts[i],
        reservations: []
      }).save();
      console.log(`تم إنشاء نوع الطاولة: ${tableTypes[i]} بعدد ${counts[i]}`);
    }
  }
};

module.exports = Table;