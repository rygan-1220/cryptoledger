const { requireRole } = require('../middleware/rbac');

describe('rbac middleware — requireRole', () => {
  let req, res, next;

  beforeEach(() => {
    req = { session: { user: { user_id: 1, role: 'employee' } } };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  describe('when user has the required role', () => {
    it('should call next() for a matching single role', () => {
      const middleware = requireRole(['employee']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should call next() when role is in a list', () => {
      const middleware = requireRole(['employee', 'dept_manager', 'admin']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should call next() for admin role', () => {
      req.session.user.role = 'admin';
      const middleware = requireRole(['admin']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should call next() for ceo role', () => {
      req.session.user.role = 'ceo';
      const middleware = requireRole(['ceo']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('when user does NOT have the required role', () => {
    it('should return 403 for a non-matching role', () => {
      const middleware = requireRole(['admin']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden: Insufficient privileges',
        code: 'FORBIDDEN',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when role list is empty', () => {
      const middleware = requireRole([]);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('when user is not authenticated', () => {
    it('should return 401 when session is missing', () => {
      req.session = undefined;
      const middleware = requireRole(['employee']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user is missing from session', () => {
      req.session.user = null;
      const middleware = requireRole(['employee']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('cross-role isolation', () => {
    it('should block employee from dept_manager-only routes', () => {
      req.session.user.role = 'employee';
      const middleware = requireRole(['dept_manager']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should block dept_manager from admin-only routes', () => {
      req.session.user.role = 'dept_manager';
      const middleware = requireRole(['admin']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should block employee from finance_manager-only routes', () => {
      req.session.user.role = 'employee';
      const middleware = requireRole(['finance_manager']);
      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should allow admin to access employee-scoped routes', () => {
      req.session.user.role = 'admin';
      const middleware = requireRole(['employee', 'dept_manager', 'admin']);
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
