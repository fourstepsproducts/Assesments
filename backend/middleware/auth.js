import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallbacksecret');

      // Check if user exists in DB or is the env Admin
      if (decoded.email === process.env.ADMIN_EMAIL) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          role: 'admin',
        };
      } else {
        const user = await User.findById(decoded.id).select('-password');
        if (user) {
          req.user = {
            id: user._id,
            email: user.email,
            role: user.role,
          };
        } else {
          // If user deleted from DB but token valid
          req.user = decoded;
        }
      }

      return next();
    } catch (error) {
      console.error('JWT Auth Error:', error.message);
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};
