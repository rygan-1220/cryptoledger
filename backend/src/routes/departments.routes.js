const express = require('express');
const departmentsController = require('../controllers/departments.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();

router.get('/', departmentsController.getDepartments);
router.post('/', requireAuth, requireRole(['admin', 'ceo']), departmentsController.createDepartment);
router.delete('/:id', requireAuth, requireRole(['admin', 'ceo']), departmentsController.deleteDepartment);

module.exports = router;
