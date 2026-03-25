const express = require('express');
const router = express.Router();
const { saveTaps } = require('../controllers/tapController');

router.post('/saveTaps', saveTaps);

module.exports = router;