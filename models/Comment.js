
const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  pollId: { type: mongoose.Schema.Types.ObjectId, ref: 'Poll', required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  authorName: { type: String, required: true }, // Cached for display speed
  text: { type: String, required: true },
  
  // Threading
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  dislikedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

}, {
  timestamps: true
});

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;
