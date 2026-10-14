const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const assessmentRoutes = require('./routes/assessmentRoutes');
const engagementRoutes = require('./routes/engagementRoutes');
const riskRoutes = require('./routes/riskRoutes');
const interventionRoutes = require('./routes/interventionRoutes');
const userRoutes = require('./routes/userRoutes');
const errorMiddleware = require('./middleware/errorMiddleware');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/engagement', engagementRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/interventions', interventionRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Student Risk Prediction Backend API is active'
  });
});

// 404 Handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found - ${req.originalUrl}`
  });
});

// Centralized Error Handler
app.use(errorMiddleware);

module.exports = app;
