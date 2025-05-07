require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/paradise-getaway',
  JWT_SECRET: process.env.JWT_SECRET || 'paradise-getaway-secret-key',
  JWT_EXPIRE: '7d',
  EMAIL_SERVICE: process.env.EMAIL_SERVICE,
  EMAIL_USERNAME: process.env.EMAIL_USERNAME,
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
  EMAIL_FROM: process.env.EMAIL_FROM || 'info@paradisegetaway.com',
  NODE_ENV: process.env.NODE_ENV || 'development'
};