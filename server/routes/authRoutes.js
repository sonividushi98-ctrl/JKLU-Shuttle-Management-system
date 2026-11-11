const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'jklu_shuttle_secret_key_123';
const isDbConnected = () => mongoose.connection.readyState === 1;

// In-memory fallback users for offline / standalone resilience
let memoryUsers = [
  {
    id: 'user-jklu-default',
    name: 'Aarav Sharma',
    email: 'student@jklu.edu.in',
    passwordHash: bcrypt.hashSync('jklu2026', 10),
    rollNumber: '2023BTECH042',
    role: 'Student'
  }
];

// @desc    Register new user
// @route   POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, rollNumber = '', rememberMe = true } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, @jklu.edu.in email, and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Validate JKLU email domain
    if (!cleanEmail.endsWith('@jklu.edu.in')) {
      return res.status(400).json({
        message: 'Access Restricted: Please use your official university email ending with @jklu.edu.in'
      });
    }

    if (isDbConnected()) {
      const userExists = await User.findOne({ email: cleanEmail });
      if (userExists) {
        return res.status(400).json({ message: 'An account with this JKLU email already exists. Please Sign In.' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        rollNumber: rollNumber.trim().toUpperCase() || '2023BTECH001',
        role: 'Student'
      });

      const expiresIn = rememberMe ? '30d' : '24h';
      const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn });

      return res.status(201).json({
        message: 'Account created successfully!',
        token,
        rememberMe,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          rollNumber: user.rollNumber,
          role: user.role
        }
      });
    }

    // Memory Fallback
    const memUserExists = memoryUsers.find(u => u.email === cleanEmail);
    if (memUserExists) {
      return res.status(400).json({ message: 'An account with this JKLU email already exists. Please Sign In.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newMemUser = {
      id: 'mem-user-' + Date.now(),
      name: name.trim(),
      email: cleanEmail,
      passwordHash: hashedPassword,
      rollNumber: rollNumber.trim().toUpperCase() || '2023BTECH001',
      role: 'Student'
    };
    memoryUsers.push(newMemUser);

    const expiresIn = rememberMe ? '30d' : '24h';
    const token = jwt.sign({ id: newMemUser.id, email: newMemUser.email, role: newMemUser.role }, JWT_SECRET, { expiresIn });

    return res.status(201).json({
      message: 'Account created successfully!',
      token,
      rememberMe,
      user: {
        id: newMemUser.id,
        name: newMemUser.name,
        email: newMemUser.email,
        rollNumber: newMemUser.rollNumber,
        role: newMemUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during sign up', error: error.message });
  }
});

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, rememberMe = true } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Validate domain
    if (!cleanEmail.endsWith('@jklu.edu.in')) {
      return res.status(400).json({
        message: 'Access Restricted: Only @jklu.edu.in university accounts are authorized.'
      });
    }

    if (isDbConnected()) {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.status(400).json({ message: 'No account found with this JKLU email. Please Sign Up.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Incorrect password. Please try again.' });
      }

      const expiresIn = rememberMe ? '30d' : '24h';
      const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn });

      return res.json({
        message: 'Login successful!',
        token,
        rememberMe,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          rollNumber: user.rollNumber || '2023BTECH001',
          role: user.role
        }
      });
    }

    // Memory Fallback
    const memUser = memoryUsers.find(u => u.email === cleanEmail);
    if (!memUser) {
      return res.status(400).json({ message: 'No account found with this JKLU email. Please Sign Up.' });
    }

    const isMatch = await bcrypt.compare(password, memUser.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect password. Please try again.' });
    }

    const expiresIn = rememberMe ? '30d' : '24h';
    const token = jwt.sign({ id: memUser.id, email: memUser.email, role: memUser.role }, JWT_SECRET, { expiresIn });

    return res.json({
      message: 'Login successful!',
      token,
      rememberMe,
      user: {
        id: memUser.id,
        name: memUser.name,
        email: memUser.email,
        rollNumber: memUser.rollNumber,
        role: memUser.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// @desc    Get current user profile (Session Check)
// @route   GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (isDbConnected()) {
      const user = await User.findById(decoded.id).select('-password');
      if (user) {
        return res.json({
          id: user._id,
          name: user.name,
          email: user.email,
          rollNumber: user.rollNumber,
          role: user.role
        });
      }
    }

    // Memory check
    const memUser = memoryUsers.find(u => u.id === decoded.id || u.email === decoded.email);
    if (memUser) {
      return res.json({
        id: memUser.id,
        name: memUser.name,
        email: memUser.email,
        rollNumber: memUser.rollNumber,
        role: memUser.role
      });
    }

    return res.status(404).json({ message: 'User not found' });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired session token', error: error.message });
  }
});

module.exports = router;
