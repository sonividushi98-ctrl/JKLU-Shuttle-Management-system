// Promote one registered user to Admin.
// Usage (from the server folder):  npm run make-admin -- someone@jklu.edu.in
// The account must already be registered through the app's Register form.
// Needs MongoDB: in-memory users only live inside the running server process.
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (process.env.DNS_SERVERS) {
  require('dns').setServers(process.env.DNS_SERVERS.split(',').map(s => s.trim()).filter(Boolean));
}

const mongoose = require('mongoose');
const User = require('../models/User');

const run = async () => {
  const email = (process.argv[2] || '').trim().toLowerCase();

  if (!email || !email.endsWith('@jklu.edu.in')) {
    console.error('Usage: npm run make-admin -- someone@jklu.edu.in');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jklu_shuttle';

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  } catch (err) {
    console.error('Could not connect to MongoDB: ' + err.message);
    console.error('If the error mentions querySrv, add DNS_SERVERS=8.8.8.8,1.1.1.1 to server/.env and try again.');
    process.exit(1);
  }

  try {
    const user = await User.findOneAndUpdate({ email }, { role: 'Admin' }, { returnDocument: 'after' });

    if (!user) {
      console.error(`No registered account found for ${email}. Register it in the app first, then run this again.`);
      process.exitCode = 1;
    } else {
      console.log(`${user.name} (${user.email}) is now an Admin.`);
      console.log('Sign out and sign in again in the app to see the Admin dashboard.');
    }
  } finally {
    await mongoose.disconnect();
  }
};

run();
