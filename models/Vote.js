const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
    optionId: { type: String, required: true }, // The _id of the option within the poll
    votedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Compound index to ensure a user can only vote once per poll
voteSchema.index({ userId: 1, pollId: 1 }, { unique: true });

const Vote = mongoose.model('Vote', voteSchema);
module.exports = Vote;
