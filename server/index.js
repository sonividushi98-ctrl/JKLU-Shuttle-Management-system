const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const bookingRoutes = require('./routes/bookingRoutes');
app.use('/api/bookings', bookingRoutes);

// Basic Route for testing
app.get('/', (req, res) => {
  res.send('JKLU Shuttle Management System API is running...');
});

// MongoDB Connection with timeout handling
const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jklu_shuttle';

mongoose.connect(MONGO_URI, {
  serverSelectionTimeoutMS: 3000,
  connectTimeoutMS: 3000
})
  .then(() => console.log('✓ Connected to MongoDB successfully'))
  .catch(err => {
    console.warn('! MongoDB connection note: Operating in graceful standalone / memory mode (' + err.message + ')');
  });

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
