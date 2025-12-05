
const express = require('express');
const router = express.Router();
const {
    applyForCandidacy,
    getMyCandidacy,
    getCandidates,
    getAllCandidates,
    updateCandidateStatus,
    createElection,
    getElections,
    updateElectionStatus,
    joinElection
} = require('../controllers/electionController');
const { protect, admin } = require('../middleware/authMiddleware');

router.post('/apply', protect, applyForCandidacy);
router.get('/me', protect, getMyCandidacy);
router.get('/candidates', protect, getCandidates);
router.post('/join', protect, joinElection); // Module 2

// Admin Routes
router.get('/all', protect, admin, getAllCandidates);
router.put('/:id/status', protect, admin, updateCandidateStatus);

// Election Management (Module 3)
router.post('/create', protect, admin, createElection);
router.get('/list', protect, getElections); // Publicly visible list
router.put('/election/:id/status', protect, admin, updateElectionStatus);

module.exports = router;
