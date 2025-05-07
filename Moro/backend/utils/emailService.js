const nodemailer = require('nodemailer');
const { EMAIL_SERVICE, EMAIL_USERNAME, EMAIL_PASSWORD, EMAIL_FROM, NODE_ENV } = require('../config/config');

// Create transporter
const createTransporter = () => {
  // For development, log emails instead of sending them
  if (NODE_ENV === 'development' && !EMAIL_SERVICE) {
    return {
      sendMail: (mailOptions) => {
        console.log('Email would be sent in production:');
        console.log('To:', mailOptions.to);
        console.log('Subject:', mailOptions.subject);
        console.log('Text:', mailOptions.text);
        console.log('HTML:', mailOptions.html);
        return Promise.resolve({ success: true, message: 'Email logged in development mode' });
      }
    };
  }

  // For production, use actual email service
  return nodemailer.createTransport({
    service: EMAIL_SERVICE,
    auth: {
      user: EMAIL_USERNAME,
      pass: EMAIL_PASSWORD
    }
  });
};

// Send booking confirmation email
exports.sendBookingConfirmation = async (user, booking) => {
  try {
    const transporter = createTransporter();
    
    // Format booking type in Arabic
    let bookingTypeAr = '';
    switch(booking.type) {
      case 'hotel':
        bookingTypeAr = 'فندق';
        break;
      case 'restaurant':
        bookingTypeAr = 'مطعم';
        break;
      case 'wedding':
        bookingTypeAr = 'حفل زفاف';
        break;
      default:
        bookingTypeAr = booking.type;
    }

    // Format booking status in Arabic
    let statusAr = '';
    switch(booking.status) {
      case 'pending':
        statusAr = 'قيد الانتظار';
        break;
      case 'confirmed':
        statusAr = 'مؤكد';
        break;
      case 'cancelled':
        statusAr = 'ملغي';
        break;
      default:
        statusAr = booking.status;
    }

    // Create email content
    const mailOptions = {
      from: EMAIL_FROM,
      to: user.email,
      subject: `تأكيد حجز ${bookingTypeAr} - Paradise Getaway`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>مرحباً ${user.firstName} ${user.lastName}،</h2>
          <p>نشكرك على حجزك في Paradise Getaway. فيما يلي تفاصيل حجزك:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>نوع الحجز:</strong> ${bookingTypeAr}</p>
            <p><strong>التاريخ:</strong> ${booking.date}</p>
            ${booking.timeStart ? `<p><strong>وقت البدء:</strong> ${booking.timeStart}</p>` : ''}
            ${booking.hours ? `<p><strong>عدد الساعات:</strong> ${booking.hours}</p>` : ''}
            <p><strong>عدد الضيوف:</strong> ${booking.guests}</p>
            <p><strong>حالة الحجز:</strong> ${statusAr}</p>
          </div>
          
          <p>إذا كان لديك أي استفسارات أو ترغب في تعديل حجزك، يرجى التواصل معنا.</p>
          
          <p>مع أطيب التحيات،<br>فريق Paradise Getaway</p>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'تم إرسال بريد التأكيد بنجاح' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, message: 'فشل في إرسال بريد التأكيد' };
  }
};

// Send booking status update email
exports.sendBookingStatusUpdate = async (user, booking) => {
  try {
    const transporter = createTransporter();
    
    // Format booking type in Arabic
    let bookingTypeAr = '';
    switch(booking.type) {
      case 'hotel':
        bookingTypeAr = 'فندق';
        break;
      case 'restaurant':
        bookingTypeAr = 'مطعم';
        break;
      case 'wedding':
        bookingTypeAr = 'حفل زفاف';
        break;
      default:
        bookingTypeAr = booking.type;
    }

    // Format booking status in Arabic
    let statusAr = '';
    switch(booking.status) {
      case 'pending':
        statusAr = 'قيد الانتظار';
        break;
      case 'confirmed':
        statusAr = 'مؤكد';
        break;
      case 'cancelled':
        statusAr = 'ملغي';
        break;
      default:
        statusAr = booking.status;
    }

    // Create email content
    const mailOptions = {
      from: EMAIL_FROM,
      to: user.email,
      subject: `تحديث حالة الحجز - Paradise Getaway`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>مرحباً ${user.firstName} ${user.lastName}،</h2>
          <p>نود إعلامك بأن حالة حجزك قد تم تحديثها:</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>نوع الحجز:</strong> ${bookingTypeAr}</p>
            <p><strong>التاريخ:</strong> ${booking.date}</p>
            ${booking.timeStart ? `<p><strong>وقت البدء:</strong> ${booking.timeStart}</p>` : ''}
            ${booking.hours ? `<p><strong>عدد الساعات:</strong> ${booking.hours}</p>` : ''}
            <p><strong>عدد الضيوف:</strong> ${booking.guests}</p>
            <p><strong>حالة الحجز الجديدة:</strong> <span style="color: ${booking.status === 'confirmed' ? 'green' : (booking.status === 'cancelled' ? 'red' : 'orange')}">${statusAr}</span></p>
          </div>
          
          <p>إذا كان لديك أي استفسارات، يرجى التواصل معنا.</p>
          
          <p>مع أطيب التحيات،<br>فريق Paradise Getaway</p>
        </div>
      `
    };

    // Send email
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'تم إرسال بريد تحديث الحالة بنجاح' };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, message: 'فشل في إرسال بريد تحديث الحالة' };
  }
};