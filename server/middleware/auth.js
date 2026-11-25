const jwt = require('jsonwebtoken');

/**
 * Authentication middleware for verifying JWT tokens.
 * Extracts the Bearer token from the Authorization header and validates it.
 */
const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

module.exports = auth;
module.exports.auth = auth;
module.exports.authMiddleware = auth;
