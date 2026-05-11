const requireAuth = (req, res, next) => {
  if (req.session && req.session.user) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
  }
};

module.exports = {
  requireAuth
};
