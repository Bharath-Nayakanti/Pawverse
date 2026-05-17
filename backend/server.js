require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

const authRoutes = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const feedingRoutes = require('./routes/feeding');
const healthRecordRoutes = require('./routes/healthRecords');
const insightRoutes = require('./routes/insights');
const petRoutes = require('./routes/pets');
const scheduleRoutes = require('./routes/schedules');
const uploadRoutes = require('./routes/uploads');
const vaccineRoutes = require('./routes/vaccines');
const { authenticateToken } = require('./middleware/auth');
const { startReminderLifecycleJob } = require('./jobs/reminderLifecycleJob');

const app = express();
const PORT = process.env.PORT || 8001;
const allowedOrigins = new Set([
  ...(process.env.FRONTEND_URL || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  'http://127.0.0.1:5173',
  'http://localhost:5173'
]);

const isLocalDevOrigin = (origin) => {
  if (process.env.NODE_ENV === 'production') return false;
  return /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
};

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin) || isLocalDevOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'pawverse-backend',
    version: '1.0.0'
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Pet care platform routes
app.use('/api/pets', authenticateToken, petRoutes);
app.use('/api/schedules', authenticateToken, scheduleRoutes);
app.use('/api/reminders', authenticateToken, scheduleRoutes);
app.use('/api/vaccines', authenticateToken, vaccineRoutes);
app.use('/api/feeding', authenticateToken, feedingRoutes);
app.use('/api/health-records', authenticateToken, healthRecordRoutes);
app.use('/api/appointments', authenticateToken, appointmentRoutes);
app.use('/api/insights', authenticateToken, insightRoutes);
app.use('/api/uploads', authenticateToken, uploadRoutes);

// Proxy ML service requests
const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';

const mlProxy = createProxyMiddleware({
  target: mlServiceUrl,
  changeOrigin: true,
  pathRewrite: {
    '^/api/ml': '', // Remove /api/ml prefix when forwarding to ML service
  },
  onError: (err, req, res) => {
    console.error('ML Service Proxy Error:', err);
    res.status(503).json({ 
      error: 'ML service temporarily unavailable',
      message: 'Please try again later' 
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    // Log ML service requests
    console.log(`Proxying to ML service: ${req.method} ${req.path}`);
  }
});

// ML service routes (proxied to ML service)
// Breed detection endpoint doesn't require authentication
app.use('/api/ml/predict/breed', mlProxy);
app.use('/api/ml/predict/species', mlProxy);
// Other ML endpoints require authentication
app.use('/api/ml', authenticateToken, mlProxy);

// Direct ML endpoints for backward compatibility
app.use('/predict', authenticateToken, mlProxy);
app.use('/symptom', authenticateToken, mlProxy);
app.use('/diagnosis', authenticateToken, mlProxy);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
  console.log(`🤖 ML proxy: http://localhost:${PORT}/api/ml`);
  console.log(`🔗 ML service: ${mlServiceUrl}`);
  startReminderLifecycleJob();
});

module.exports = app;
