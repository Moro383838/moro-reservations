const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/config');
const User = require('../models/User');

// Middleware to verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  // Check if token exists in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.header('x-auth-token')) {
    token = req.header('x-auth-token');
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({ message: 'غير مصرح، يرجى تسجيل الدخول' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add user to request object
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'الرمز غير صالح' });
  }
};

// Middleware to check if user is admin
exports.admin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'غير مصرح، يجب أن تكون مسؤولاً' });
    }

    next();
  } catch (error) {
    return res.status(500).json({ message: 'حدث خطأ أثناء التحقق من صلاحيات المستخدم' });
  }
};