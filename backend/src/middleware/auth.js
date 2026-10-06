const jwt = require('jsonwebtoken');

function parse(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) return null;
  try { return jwt.verify(token, process.env.JWT_ACCESS_SECRET); } catch { return null; }
}

// Blocks the request unless a valid access token is sent.
function auth(req, res, next) {
  if (!(req.headers.authorization || '').startsWith('Bearer ')) return res.status(401).json({ error: 'Login required' });
  const user = parse(req);
  if (!user) return res.status(401).json({ error: 'Token expired or invalid' });
  req.user = user;
  next();
}

// Lets everyone through, but sets req.user when a valid token is present (used to show drafts to the admin).
auth.optional = (req, res, next) => { req.user = parse(req); next(); };

module.exports = auth;
