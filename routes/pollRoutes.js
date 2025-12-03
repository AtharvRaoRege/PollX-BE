
const express = require('express');
const router = express.Router();
const { 
  getPolls, 
  getPendingPolls,
  updatePollStatus,
  createPoll, 
  votePoll, 
  addConsciousnessEntry, 
  addComment,
  getComments 
} = require('../controllers/pollController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(getPolls)
  .post(protect, createPoll);

// Admin Routes
router.route('/pending').get(protect, admin, getPendingPolls);
router.route('/:id/status').put(protect, admin, updatePollStatus);

router.route('/:id/vote').post(protect, votePoll);
router.route('/:id/consciousness').post(protect, addConsciousnessEntry);

router.route('/:id/comments')
  .get(getComments)
  .post(protect, addComment);

module.exports = router;
