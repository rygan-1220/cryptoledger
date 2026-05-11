const express = require('express');
const ctrl = require('../controllers/sessionKeys.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { sessionKeyLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
router.use(requireAuth);

router.post('/request', sessionKeyLimiter, requireRole(['dept_manager', 'finance_manager', 'admin', 'ceo']), ctrl.requestSessionKey);
router.delete('/:session_id', requireRole(['finance_manager', 'admin', 'ceo']), ctrl.revokeSessionKey);

module.exports = router;
