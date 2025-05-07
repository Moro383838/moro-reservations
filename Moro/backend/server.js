require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const { PORT, MONGODB_URI } = require('./config/config');

// Import routes
const userRoutes = require('./routes/userRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // السماح بالوصول من أي مصدر (للتطوير والاختبار)
    // في بيئة الإنتاج، يجب تحديد المصادر المسموح بها بدقة
    callback(null, true);
  },
  credentials: true, // السماح بإرسال الكوكيز
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // الطرق المسموح بها
  allowedHeaders: ['Content-Type', 'Authorization'] // الرؤوس المسموح بها
}));

// إضافة معلومات عن عنوان IP للخادم عند بدء التشغيل
const os = require('os');
const networkInterfaces = os.networkInterfaces();
const getNetworkAddresses = () => {
  const addresses = [];
  Object.keys(networkInterfaces).forEach(interfaceName => {
    const interfaces = networkInterfaces[interfaceName];
    interfaces.forEach(iface => {
      // تجاهل عناوين IPv6 وعناوين loopback
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    });
  });
  return addresses;
};

app.use(express.json());
app.use(morgan('dev'));

// MongoDB Connection
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('MongoDB Connected');
  
  // تهيئة أنواع الطاولات عند بدء الخادم
  const Table = require('./models/Table');
  Table.initializeTableTypes()
    .then(() => console.log('تم تهيئة أنواع الطاولات بنجاح'))
    .catch(err => console.error('خطأ في تهيئة أنواع الطاولات:', err));
})
.catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', userRoutes);
app.use('/api/bookings', bookingRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Error handling middleware
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} and accessible from network`);
});