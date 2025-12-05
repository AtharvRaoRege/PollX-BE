
const mongoose = require('mongoose');

const leadershipProfileSchema = new mongoose.Schema({
  personalitySummary: String,
  strengths: [String],
  weaknesses: [String],
  leadershipStyle: {
    type: String,
    enum: ['Visionary', 'Strategic', 'Aggressive', 'Diplomatic', 'Servant']
  },
  agendaScore: Number
});

const candidateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  partyAffiliation: { type: String, default: 'Independent' },
  manifesto: { type: String, required: true },
  background: { type: String, required: true },

  // New Fields for Module 1
  contactInfo: { type: String, required: true },
  reasonForContesting: { type: String, required: true },
  experience: { type: String, required: true },

  // Module 2: Campaign Data
  electionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Election' },
  symbol: { type: String }, // Emoji or URL
  promises: [{ type: String }],
  keyIssues: [{ type: String }],

  // AI Generated Data
  aiProfile: leadershipProfileSchema,

  status: {
    type: String,
    enum: ['pending_review', 'approved', 'rejected'],
    default: 'pending_review'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Candidate', candidateSchema);
