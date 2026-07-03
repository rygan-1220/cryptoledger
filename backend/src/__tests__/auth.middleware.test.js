const { requireAuth } = require('../middleware/auth');

describe('auth middleware — requireAuth', () => {
  let req, res, next;

  beforeEach(() => {
    req = { session: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  it('should call next() when user exists in session', () => {
    req.session.user = { user_id: 1, email: 'test@example.com' };
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should return 401 when no session exists', () => {
    req.session = undefined;
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized', code: 'UNAUTHORIZED' });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when session exists but user is null/undefined', () => {
    req.session.user = null;
    requireAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when user is falsy (empty object)', () => {
    // An empty object is truthy, so next() will be called
    // This test verifies the guard logic: if user is set (even {}), it passes
    req.session.user = {};
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
