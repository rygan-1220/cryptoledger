const express = require('express');
const ctrl = require('../controllers/sessionKeys.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(requireAuth);
router.use(requireRole(['finance_manager', 'admin', 'ceo']));

router.post('/request', ctrl.requestSessionKey);
router.delete('/:session_id', ctrl.revokeSessionKey);

module.exports = router;
