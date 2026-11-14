// Create or update a local development Admin account.
// Usage:
//   $env:DEV_ADMIN_EMAIL = 'admin@jklu.edu.in'
//   $env:DEV_ADMIN_PASSWORD = 'use-a-local-password'
//   npm run seed-dev-admin

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
  const email = (process.env.DEV_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.DEV_ADMIN_PASSWORD || '';

  if (!email.endsWith('@jklu.edu.in') || !password) {
    console.error('Set DEV_ADMIN_EMAIL and DEV_ADMIN_PASSWORD before running this script.');
    process.exitCode = 1;
    return;
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jklu_shuttle';

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate(
      { email },
      {
        $set: {
          name: 'Rohit',
          password: passwordHash,
          role: 'Admin'
        },
        $setOnInsert: {
          email,
          rollNumber: 'DEVADMIN'
        }
      },
      { upsert: true, new: true, runValidators: true }
    );
    console.log(`Development Admin ready: ${user.email}`);
  } catch (err) {
    console.error(`Could not create the development Admin: ${err.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

run();
