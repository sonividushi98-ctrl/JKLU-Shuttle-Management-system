const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Runs protect first, then only lets Admins through (403 for everyone else).
// With MongoDB connected, the role is read from the database so a promotion or
// demotion takes effect immediately; in memory mode the role in the JWT is used.
const adminOnly = (req, res, next) => {
  protect(req, res, async () => {
    try {
      let role = req.user && req.user.role;

      if (mongoose.connection.readyState === 1 && mongoose.isValidObjectId(req.user.id)) {
        const user = await User.findById(req.user.id).select('role');
        if (!user) {
          return res.status(401).json({ message: 'Not authorized, account not found' });
        }
        role = user.role;
      }

      if (role !== 'Admin') {
        return res.status(403).json({ message: 'Access denied: Admins only' });
      }

      req.user.role = role;
      next();
    } catch (error) {
      res.status(500).json({ message: 'Server error checking admin access', error: error.message });
    }
  });
};

module.exports = { protect, adminOnly };
