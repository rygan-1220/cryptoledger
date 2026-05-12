const express = require('express');
const ctrl = require('../controllers/users.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

// Public: Validate and Complete Setup
router.get('/invite/:token', ctrl.validateInvite);
router.post('/setup-account', ctrl.setupAccount);

// Protected: Management
router.use(requireAuth);

router.get('/', requireRole(['admin', 'ceo', 'dept_manager']), ctrl.listUsers);
router.post('/invite', requireRole(['admin', 'ceo', 'dept_manager']), ctrl.inviteUser);
router.patch('/:id/status', requireRole(['admin', 'ceo', 'dept_manager']), ctrl.toggleActive);

module.exports = router;
