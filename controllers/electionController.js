const Candidate = require('../models/Candidate');
const User = require('../models/User');
const Election = require('../models/Election');

const { evaluateCandidate } = require('../utils/geminiService');

// @desc    Apply for Candidacy
// @route   POST /api/election/apply
// @access  Private
const applyForCandidacy = async (req, res) => {
  try {
    const { partyAffiliation, manifesto, background, contactInfo, reasonForContesting, experience } = req.body;

    const existingCandidate = await Candidate.findOne({ userId: req.user._id });
    if (existingCandidate) {
      return res.status(400).json({ message: 'You have already applied.' });
    }

    // Generate AI Profile
    const aiProfile = await evaluateCandidate(
      req.user.username,
      manifesto,
      background,
      reasonForContesting,
      experience
    );

    const candidate = await Candidate.create({
      userId: req.user._id,
      partyAffiliation,
      manifesto,
      background,
      contactInfo,
      reasonForContesting,
      experience,
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

// @desc    Get all candidates (Admin - includes pending)
// @route   GET /api/election/all
// @access  Private/Admin
const getAllCandidates = async (req, res) => {
  try {
    const candidates = await Candidate.find({})
      .populate('userId', 'username avatarUrl identityTitle')
      .sort({ createdAt: -1 });
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update candidate status
// @route   PUT /api/election/:id/status
// @access  Private/Admin
const updateCandidateStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'approved', 'rejected'
    const candidate = await Candidate.findById(req.params.id);

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    candidate.status = status;
    const updatedCandidate = await candidate.save();

    // Notify User
    // (Assuming Notification model is imported or available, if not we skip for now to avoid crash)
    // const Notification = require('../models/Notification');
    // await Notification.create({ ... });

    res.json(updatedCandidate);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a new Election
// @route   POST /api/election/create
// @access  Private/Admin
const createElection = async (req, res) => {
  try {
    const { title, description, startDate, endDate, regions } = req.body;

    const election = await Election.create({
      title,
      description,
      startDate,
      endDate,
      regions,
      createdBy: req.user._id
    });

    res.status(201).json(election);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get All Elections
// @route   GET /api/election/list
// @access  Public (or Private based on needs, usually public for users to see)
const getElections = async (req, res) => {
  try {
    const elections = await Election.find({}).sort({ createdAt: -1 });
    res.json(elections);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update Election Status
// @route   PUT /api/election/:id/status
// @access  Private/Admin
const updateElectionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const election = await Election.findById(req.params.id);

    if (!election) {
      return res.status(404).json({ message: 'Election not found' });
    }

    election.status = status;
    await election.save();

    res.json(election);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Join Election & Setup Campaign
// @route   POST /api/election/join
// @access  Private (Approved Candidate)
const joinElection = async (req, res) => {
  try {
    const { electionId, symbol, promises, keyIssues } = req.body;
    console.log(`DEBUG: joinElection called by user ${req.user._id} for election ${electionId}`);

    const candidate = await Candidate.findOne({ userId: req.user._id });
    if (!candidate) {
      console.log('DEBUG: Candidate profile not found');
      return res.status(404).json({ message: 'Candidate profile not found' });
    }

    if (candidate.status !== 'approved') {
      console.log(`DEBUG: Candidate status is ${candidate.status}, not approved`);
      return res.status(403).json({ message: 'Only approved candidates can join elections.' });
    }

    const election = await Election.findById(electionId);
    if (!election) {
      console.log('DEBUG: Election not found');
      return res.status(404).json({ message: 'Election not found' });
    }

    // Update Candidate
    candidate.electionId = electionId;
    candidate.symbol = symbol;
    candidate.promises = promises;
    candidate.keyIssues = keyIssues;

    // Backfill missing fields for legacy candidates to pass validation
    if (!candidate.contactInfo) candidate.contactInfo = "Not provided (Legacy)";
    if (!candidate.reasonForContesting) candidate.reasonForContesting = "Not provided (Legacy)";
    if (!candidate.experience) candidate.experience = "Not provided (Legacy)";

    await candidate.save();

    // Add to Election if not already there
    const isCandidateInElection = election.candidates.some(id => id.toString() === candidate._id.toString());
    if (!isCandidateInElection) {
      election.candidates.push(candidate._id);
      await election.save();
    }

    res.json(candidate);
  } catch (error) {
    console.error('ERROR in joinElection:', error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  applyForCandidacy,
  getMyCandidacy,
  getCandidates,
  getAllCandidates,
  updateCandidateStatus,
  createElection,
  getElections,
  updateElectionStatus,
  joinElection
};
