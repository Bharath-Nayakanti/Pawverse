const jwt = require('jsonwebtoken');

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32 || secret === 'your_super_secret_jwt_key_here_change_in_production') {
    throw new Error('JWT_SECRET must be set to a strong value of at least 32 characters');
  }

  return secret;
};

const generateAccessToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRE || '15m' }
  );
};

const parseDurationToMs = (duration) => {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000;
  }

  const value = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000
  };

  return value * multipliers[unit];
};

const getRefreshTokenExpiry = () => {
  const duration = process.env.REFRESH_TOKEN_EXPIRE || '7d';
  return new Date(Date.now() + parseDurationToMs(duration));
};

const verifyToken = (token) => {
  return jwt.verify(token, getJwtSecret());
};

module.exports = {
  generateAccessToken,
  getRefreshTokenExpiry,
  verifyToken,
};
