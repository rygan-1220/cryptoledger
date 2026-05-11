const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    }

    if (roles.includes(req.session.user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges', code: 'FORBIDDEN' });
    }
  };
};

module.exports = {
  requireRole
};
