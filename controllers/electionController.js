
const Candidate = require('../models/Candidate');
const User = require('../models/User');

// @desc    Apply for Candidacy
// @route   POST /api/election/apply
// @access  Private
const applyForCandidacy = async (req, res) => {
  try {
    const { partyAffiliation, manifesto, background, aiProfile } = req.body;

    const existingCandidate = await Candidate.findOne({ userId: req.user._id });
    if (existingCandidate) {
      return res.status(400).json({ message: 'You have already applied.' });
    }

    const candidate = await Candidate.create({
      userId: req.user._id,
      partyAffiliation,
      manifesto,
      background,
      aiProfile, 
      status: 'pending_review'
    });

    res.status(201).json(candidate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current user candidate status
// @route   GET /api/election/me
// @access  Private
const getMyCandidacy = async (req, res) => {
  try {
    const candidate = await Candidate.findOne({ userId: req.user._id });
    if (!candidate) {
        return res.json(null); // Not applied yet
    }
    res.json(candidate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all candidates
// @route   GET /api/election/candidates
// @access  Private
const getCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find({ status: 'approved' })
      .populate('userId', 'username avatarUrl identityTitle');
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { applyForCandidacy, getMyCandidacy, getCandidates };
