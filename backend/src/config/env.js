require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nutrisemana',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  authEmail: process.env.AUTH_EMAIL,
  authPasswordHash: process.env.AUTH_PASSWORD_HASH,
};
