const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../User');
const { generateAccessToken, getRefreshTokenExpiry } = require('../utils/jwt');
const { validate, registerSchema, loginSchema, refreshTokenSchema } = require('../utils/validation');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const serializeUser = (user) => ({
  id: user.id,
  email: user.email,
  firstName: user.first_name,
  lastName: user.last_name,
  createdAt: user.created_at,
  lastLogin: user.last_login,
  emailVerified: user.email_verified
});

const createSession = async (user) => {
  const accessToken = generateAccessToken(user.id, user.email);
  const refreshToken = await User.createRefreshToken(user.id, getRefreshTokenExpiry());

  return {
    accessToken,
    refreshToken: refreshToken.token,
    refreshTokenExpiresAt: refreshToken.expires_at
  };
};

// Register new user
router.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName
    });

    // Generate tokens
    const tokens = await createSession(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: serializeUser(user),
      tokens
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await User.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    const lastLogin = await User.updateLastLogin(user.id);

    const tokens = await createSession(user);

    res.json({
      message: 'Login successful',
      user: serializeUser({ ...user, last_login: lastLogin }),
      tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Refresh access token
router.post('/refresh', generalLimiter, validate(refreshTokenSchema), async (req, res) => {
  try {
    const { refreshToken } = req.body;

    const tokenRecord = await User.findRefreshToken(refreshToken);
    if (!tokenRecord || !tokenRecord.is_active) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    const user = await User.findById(tokenRecord.user_id);
    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    await User.revokeRefreshToken(tokenRecord.id);
    const tokens = await createSession(user);

    res.json({
      message: 'Token refreshed successfully',
      user: serializeUser(user),
      tokens
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    res.json({ user: serializeUser(req.user) });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Logout user (revoke refresh token)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await User.revokeRefreshTokenByToken(refreshToken);
    } else {
      await User.revokeAllUserTokens(req.user.id);
    }

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
