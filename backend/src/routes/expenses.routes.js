const express = require('express');
const { body } = require('express-validator');
const expensesController = require('../controllers/expenses.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// All expense routes require authentication
router.use(requireAuth);

router.post(
  '/',
  [
    body('layer1_ciphertext').isObject().withMessage('Layer 1 ciphertext is required'),
    body('pattern').isObject().withMessage('Pattern object is required'),
    body('pattern.amount').isNumeric(),
    body('pattern.dept_id').isUUID(),
    body('digital_signature').notEmpty().withMessage('Digital signature is required')
  ],
  expensesController.submitExpense
);

module.exports = router;
