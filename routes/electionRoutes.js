
const express = require('express');
const router = express.Router();
const { applyForCandidacy, getMyCandidacy, getCandidates } = require('../controllers/electionController');
const { protect } = require('../middleware/authMiddleware');

router.post('/apply', protect, applyForCandidacy);
router.get('/me', protect, getMyCandidacy);
router.get('/candidates', protect, getCandidates);

module.exports = router;
