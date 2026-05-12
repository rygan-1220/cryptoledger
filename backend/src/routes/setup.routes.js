const express = require('express');
const ctrl = require('../controllers/setup.controller');

const router = express.Router();

router.get('/status', ctrl.getStatus);
router.post('/ignite', ctrl.ignite);

module.exports = router;
