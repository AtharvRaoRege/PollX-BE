
const express = require('express');
const router = express.Router();
const { authUser, registerUser, logoutUser, getUserProfile, updateUserProfile, searchUsers, toggleSavePoll } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', registerUser);
router.post('/login', authUser);
router.post('/logout', logoutUser);
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);
router.get('/search', protect, searchUsers);
router.put('/save/:id', protect, toggleSavePoll);

module.exports = router;
