const express = require('express');
const ctrl = require('../controllers/dashboard.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(requireAuth);
router.use(requireRole(['finance_manager', 'admin', 'ceo']));

router.get('/summary',        ctrl.getSummary);
router.get('/by-department',  ctrl.getByDepartment);
router.get('/by-category',    ctrl.getByCategory);
router.get('/by-project',     ctrl.getByProject);
router.get('/monthly-trends', ctrl.getMonthlyTrends);
router.get('/export',         ctrl.exportReport);

module.exports = router;
