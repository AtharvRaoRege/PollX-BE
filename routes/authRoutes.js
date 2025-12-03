
const express = require('express');
const router = express.Router();
const { authUser, registerUser, getUserProfile, updateUserProfile, searchUsers } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', registerUser);
router.post('/login', authUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.get('/search', protect, searchUsers);

module.exports = router;
