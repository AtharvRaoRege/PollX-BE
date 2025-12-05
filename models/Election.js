const mongoose = require('mongoose');

const electionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['upcoming', 'active', 'ended', 'paused'],
        default: 'upcoming'
    },
    regions: [{ type: String }], // e.g., ["North", "South", "East", "West"]
    candidates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Candidate' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
    timestamps: true
});

module.exports = mongoose.model('Election', electionSchema);
