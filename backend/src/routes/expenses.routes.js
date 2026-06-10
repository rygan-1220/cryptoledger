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

// Log plaintext view (client calls after successful Layer 1 decryption)
router.post('/:id/log-plaintext-view', ctrl.logPlaintextView);

// Single expense detail (server decrypts layer 2, returns layer1_ciphertext to client)
router.get('/:id', ctrl.getExpenseById);

// Soft delete (owner, pending only)
router.delete('/:id', ctrl.softDeleteExpense);

// Approve / Reject (stage 1: dept_manager, stage 2: finance_manager only)
router.patch('/:id/status', requireRole(['dept_manager', 'finance_manager']), ctrl.updateStatus);

// Verify expense integrity (signature + hash chain) for payout
router.post('/:id/verify', requireRole(['finance_manager', 'admin', 'ceo']), ctrl.verifyExpense);

// Cancel payout (revert approved → dept_approved)
router.post('/:id/cancel-payout', requireRole(['finance_manager', 'admin', 'ceo']), ctrl.cancelPayout);

// Payout success (finance_approved → paid)
router.post('/:id/payout-success', requireRole(['finance_manager', 'admin', 'ceo']), ctrl.payoutSuccess);

// Fail payout (finance_approved → payout_failed — retryable, not terminal)
router.post('/:id/fail-payout', requireRole(['finance_manager', 'admin', 'ceo']), ctrl.failPayout);

module.exports = router;

