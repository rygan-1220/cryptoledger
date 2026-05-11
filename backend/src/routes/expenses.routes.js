const express = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/expenses.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const { submissionLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
router.use(requireAuth);

// Submit expense
router.post('/', submissionLimiter,
  [
    body('layer1_ciphertext').isObject(),
    body('pattern').isObject(),
    body('pattern.amount').isNumeric(),
    body('pattern.dept_id').isUUID(),
    body('digital_signature').notEmpty()
  ],
  ctrl.submitExpense
);

// My expenses (employee)
router.get('/', ctrl.getMyExpenses);

// Department expenses (manager+)
router.get('/department', requireRole(['dept_manager','finance_manager','admin','ceo']), ctrl.getDeptExpenses);

// All expenses (finance/admin/ceo)
router.get('/all', requireRole(['finance_manager','admin','ceo']), ctrl.getAllExpenses);

// Single expense detail (server decrypts layer 2, returns layer1_ciphertext to client)
router.get('/:id', ctrl.getExpenseById);

// Soft delete (owner, pending only)
router.delete('/:id', ctrl.softDeleteExpense);

// Approve / Reject
router.patch('/:id/status', requireRole(['dept_manager', 'finance_manager']), ctrl.updateStatus);

module.exports = router;

