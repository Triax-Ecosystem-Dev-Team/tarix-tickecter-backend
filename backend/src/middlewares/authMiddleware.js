const jwt = require('jsonwebtoken');
const prisma = require('../config/db');
const { sendResponse } = require('../utils/responseFormatter');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Strip any errant quotes from local storage JSON stringification
      token = token.replace(/['"]+/g, '');

      if (!token || token === 'undefined' || token === 'null') {
        return sendResponse(res, 401, null, 'Not authorized, no valid token provided');
      }

      // Verify token using our local JWT_SECRET
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

      const userId = decoded.id;
      
      // Sync with our local User table
      req.user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
        },
      });

      if (!req.user) {
        return sendResponse(res, 401, null, 'User no longer exists in our database');
      }

      next();
    } catch (error) {
      console.error('JWT Verification Error:', error.message);
      return sendResponse(res, 401, null, 'Not authorized, token failed');
    }
  } else {
    return sendResponse(res, 401, null, 'Not authorized, no token provided');
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendResponse(
        res, 
        403, 
        null, 
        'You do not have permission to perform this action'
      );
    }
    next();
  };
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    next();
  } else {
    return sendResponse(res, 403, null, 'Not authorized as an admin');
  }
};

const ticketer = (req, res, next) => {
  if (req.user && (req.user.role === 'Ticketer' || req.user.role === 'Admin')) {
    next();
  } else {
    return sendResponse(res, 403, null, 'Not authorized as a ticketer');
  }
};

module.exports = { protect, admin, ticketer, restrictTo };