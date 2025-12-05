
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
  getComments,
  getMyPolls,
  deletePoll,
  updatePoll,
  getTrendingTopics
} = require('../controllers/pollController');
const { protect, admin, optionalProtect } = require('../middleware/authMiddleware');

router.route('/')
  .get(optionalProtect, getPolls)
  .post(protect, createPoll);

router.get('/trending', getTrendingTopics);

router.route('/me').get(protect, getMyPolls);

// Admin Routes
router.route('/pending').get(protect, admin, getPendingPolls);
router.route('/:id/status').put(protect, admin, updatePollStatus);

router.route('/:id')
  .put(protect, updatePoll)
  .delete(protect, deletePoll);

router.route('/:id/vote').post(protect, votePoll);
router.route('/:id/consciousness').post(protect, addConsciousnessEntry);

router.route('/:id/comments')
  .get(getComments)
  .post(protect, addComment);

module.exports = router;
