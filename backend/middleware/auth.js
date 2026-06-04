import jwt from 'jsonwebtoken';

const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_session_token_key_123');
    
    req.user = decoded; // Contains id, username, email
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is invalid or has expired.' });
  }
};

export default authMiddleware;
