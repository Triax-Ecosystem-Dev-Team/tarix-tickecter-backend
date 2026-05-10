require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const morgan = require('morgan');

const { notFound, errorHandler } = require('./middlewares/errorMiddleware');
const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const busRoutes = require('./routes/busRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const userRoutes = require('./routes/userRoutes');
const fleetRoutes = require('./routes/fleetRoutes');
const driverRoutes = require('./routes/driverRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Middlewares
app.use(helmet());
app.use(morgan('common'));
app.use(cors({
  origin: ['https://tarix-ticketer.netlify.app'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Route
app.get('/', (req, res) => {
  res.send('Tarix Ticketer API is running...');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;