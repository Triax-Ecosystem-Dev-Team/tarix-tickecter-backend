const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

const documentAuth = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header or as a query parameter (useful for direct links)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized: No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    
    // Find user
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, role: true }
    });

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: User not found' });
    }

    // Role check: Only Admin can access bus documents
    if (user.role !== 'Admin') {
      return res.status(403).json({ message: 'Forbidden: Admin access required for sensitive documents' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Document Auth Error:', error);
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};

module.exports = documentAuth;
