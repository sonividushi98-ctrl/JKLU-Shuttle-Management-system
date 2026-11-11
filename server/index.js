const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Optional: DNS servers for Node to use, e.g. DNS_SERVERS=8.8.8.8,1.1.1.1
// Needed on machines where Node cannot resolve the MongoDB Atlas SRV record.
// When unset, Node's default DNS is used (no change in behaviour).
if (process.env.DNS_SERVERS) {
  require('dns').setServers(process.env.DNS_SERVERS.split(',').map(s => s.trim()).filter(Boolean));
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/bookings', bookingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

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
