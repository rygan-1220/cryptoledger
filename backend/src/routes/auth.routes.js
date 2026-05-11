const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  [
    body('username').notEmpty().withMessage('Username is required').trim(),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('role').isIn(['employee', 'dept_manager', 'finance_manager', 'admin', 'ceo']).withMessage('Invalid role'),
    body('public_key_pem').notEmpty().withMessage('RSA Public Key is required')
  ],
  authController.register
);

router.post(
  '/login',
  authLimiter,
  authController.login
);

router.post('/logout', requireAuth, authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
