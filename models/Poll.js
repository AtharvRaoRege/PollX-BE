
const mongoose = require('mongoose');

const pollOptionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  votes: { type: Number, default: 0 },
  // Map to store counts of different archetypes who voted for this option
  // e.g. { "Realist": 5, "Dreamer": 2 }
  archetypes: {
    type: Map,
    of: Number,
    default: {}
  }
});

const consciousnessEntrySchema = new mongoose.Schema({
  text: { type: String, required: true },
  intensity: { type: Number, required: true }, // 0-100
  layer: {
    type: String,
    enum: ['real', 'hidden', 'desired'],
    default: 'real'
  },
  emoji: { type: String },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Optional (anon)
  createdAt: { type: Date, default: Date.now }
});

const pollSchema = new mongoose.Schema({
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question: { type: String, required: true },
  description: { type: String },
  category: {
    type: String,
    enum: ['Moral', 'Social', 'Politics', 'Tech', 'Hypothetical', 'Relationships', 'Consciousness'],
    required: true
  },
  mode: {
    type: String,
    enum: ['standard', 'consciousness'],
    default: 'standard'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },

  // Standard Mode Data
  options: [pollOptionSchema],

  // Consciousness Mode Data
  consciousnessEntries: [consciousnessEntrySchema],

  // Meta
  totalVotes: { type: Number, default: 0 },
  totalVotes: { type: Number, default: 0 },
  isHot: { type: Boolean, default: false },
  isEdited: { type: Boolean, default: false },
  tags: [{ type: String }],
  isAnonymous: { type: Boolean, default: false }


}, {
  timestamps: true
});

const Poll = mongoose.model('Poll', pollSchema);
module.exports = Poll;
