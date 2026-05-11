const express = require('express');
const ctrl = require('../controllers/auditLogs.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(requireAuth);
router.use(requireRole(['admin', 'ceo', 'finance_manager']));

router.get('/', ctrl.getAuditLogs);

module.exports = router;
