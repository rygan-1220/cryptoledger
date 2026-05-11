const express = require('express');
const ctrl = require('../controllers/integrity.controller');
const { requireAuth } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(requireAuth);
router.use(requireRole(['admin', 'ceo']));

router.post('/verify-chain',             ctrl.verifyChain);
router.post('/create-merkle-checkpoint', ctrl.createMerkleCheckpoint);
router.get('/merkle-roots',              ctrl.getMerkleRoots);
router.post('/verify-merkle/:root_id',   ctrl.verifyMerkle);

module.exports = router;
