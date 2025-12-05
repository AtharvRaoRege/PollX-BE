
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// Helper to set cookie
const setCookie = (res, token) => {
  res.cookie('jwt', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id);
      setCookie(res, token);

      res.json({
        _id: user._id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        settings: user.settings,
        role: user.role,
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
const registerUser = async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Auto-admin for usernames starting with "admin" (Demo purpose)
    const role = username.toLowerCase().startsWith('admin') ? 'admin' : 'user';

    const user = await User.create({
      username,
      email,
      password,
      role
    });

    if (user) {
      const token = generateToken(user._id);
      setCookie(res, token);

      res.status(201).json({
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error("Register Error:", error); // Added log
    res.status(500).json({ message: error.message });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Public
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0),
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.username = req.body.username || user.username;
      user.avatarUrl = req.body.avatarUrl || user.avatarUrl;

      if (req.body.identityTitle) user.identityTitle = req.body.identityTitle;
      if (req.body.identityDescription) user.identityDescription = req.body.identityDescription;
      if (req.body.tags) user.tags = req.body.tags;
      if (req.body.settings) user.settings = { ...user.settings, ...req.body.settings };

      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      // Refresh token/cookie if needed (optional, usually not needed unless claims change)
      // const token = generateToken(updatedUser._id);
      // setCookie(res, token);

      res.json({
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatarUrl: updatedUser.avatarUrl,
        settings: updatedUser.settings,
        role: updatedUser.role,
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Search users for mentions
// @route   GET /api/auth/search
// @access  Private
const searchUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
        username: {
          $regex: req.query.search,
          $options: 'i',
        },
      }
      : {};

    const users = await User.find(keyword).select('username avatarUrl').limit(5);
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Toggle save poll
// @route   PUT /api/auth/save/:id
// @access  Private
const toggleSavePoll = async (req, res) => {
  try {
    console.log('DEBUG: toggleSavePoll called');
    console.log('DEBUG: req.user:', req.user);
    console.log('DEBUG: req.params.id:', req.params.id);

    const user = await User.findById(req.user._id);
    const pollId = req.params.id;

    if (!user) {
      console.log('DEBUG: User not found');
      return res.status(404).json({ message: 'User not found' });
    }

    // Initialize if undefined
    if (!user.savedPollIds) user.savedPollIds = [];

    const index = user.savedPollIds.indexOf(pollId);
    console.log('DEBUG: Current savedPollIds:', user.savedPollIds);
    console.log('DEBUG: Index of pollId:', index);

    if (index === -1) {
      // Add
      user.savedPollIds.push(pollId);
    } else {
      // Remove
      user.savedPollIds.splice(index, 1);
    }

    await user.save();
    console.log('DEBUG: User saved successfully. New savedPollIds:', user.savedPollIds);
    res.json(user.savedPollIds);
  } catch (error) {
    console.error('DEBUG: toggleSavePoll Error:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { authUser, registerUser, logoutUser, getUserProfile, updateUserProfile, searchUsers, toggleSavePoll };
