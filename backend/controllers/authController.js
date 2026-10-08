import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const generateToken = (id, email, role) => {
  return jwt.sign(
    { id, email, role },
    process.env.JWT_SECRET || 'fallbacksecret',
    { expiresIn: '7d' }
  );
};

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
export const signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    if (password.length < 5) {
      return res.status(400).json({ message: 'Password must be at least 5 characters long' });
    }

    // Check if trying to signup with admin email
    if (email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase()) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const user = await User.create({
      email: email.toLowerCase(),
      password,
      role: 'user',
    });

    const token = generateToken(user._id, user.email, user.role);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during signup' });
  }
};

// @desc    Login user or admin
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check if admin login via env variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (
      adminEmail &&
      adminPassword &&
      email.toLowerCase() === adminEmail.toLowerCase()
    ) {
      if (password === adminPassword) {
        // Admin authenticated - create/find admin user for consistent ID
        let adminUser = await User.findOne({ email: adminEmail.toLowerCase() });
        if (!adminUser) {
          adminUser = await User.create({
            email: adminEmail.toLowerCase(),
            password: adminPassword,
            role: 'admin',
          });
        } else if (adminUser.role !== 'admin') {
          adminUser.role = 'admin';
          await adminUser.save({ validateBeforeSave: false });
        }

        const token = generateToken(adminUser._id, adminUser.email, 'admin');
        return res.json({
          token,
          user: {
            id: adminUser._id,
            email: adminUser.email,
            role: 'admin',
          },
        });
      } else {
        return res.status(401).json({ message: 'Invalid email or password' });
      }
    }

    // Normal user login
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id, user.email, user.role);

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};
