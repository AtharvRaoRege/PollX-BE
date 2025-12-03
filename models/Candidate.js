
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
