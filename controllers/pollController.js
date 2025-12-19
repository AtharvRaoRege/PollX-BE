
const Poll = require('../models/Poll');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const Vote = require('../models/Vote');

// @desc    Get approved polls (Feed)
// @route   GET /api/polls
// @access  Public (Optional Auth)
const getPolls = async (req, res) => {
  try {
    const { sort } = req.query;
    let sortQuery = { createdAt: -1 };

    if (sort === 'trending') {
      sortQuery = { totalVotes: -1, createdAt: -1 };
    }

    const polls = await Poll.find({ status: 'approved' })
      .sort(sortQuery)
      .populate('authorId', 'username avatarUrl')
      .lean(); // Use lean for performance and modification

    // If user is logged in, fetch their votes
    if (req.user) {
      const votes = await Vote.find({ userId: req.user._id, pollId: { $in: polls.map(p => p._id) } });
      const voteMap = new Map(votes.map(v => [v.pollId.toString(), v.optionId]));

      polls.forEach(poll => {
        poll.userVoteId = voteMap.get(poll._id.toString());
      });
    }

    // Fetch comments for all polls
    const pollIds = polls.map(p => p._id);
    const allComments = await Comment.find({ pollId: { $in: pollIds } }).sort({ createdAt: -1 }).lean();

    // Group comments by pollId
    const commentMap = {};
    allComments.forEach(c => {
      const pid = c.pollId.toString();
      if (!commentMap[pid]) commentMap[pid] = [];
      commentMap[pid].push(c);
    });

    // Attach to polls & Mask Identity if Anonymous
    polls.forEach(poll => {
      const pid = poll._id.toString();
      poll.comments = commentMap[pid] || [];

      // Privacy Masking
      if (poll.isAnonymous) {
        // Only show identity if viewer is the author or admin
        const viewerId = req.user ? req.user._id.toString() : null;
        const authorId = poll.authorId._id ? poll.authorId._id.toString() : poll.authorId.toString();

        if (req.user?.role !== 'admin' && viewerId !== authorId) {
          poll.authorId = {
            _id: 'anon',
            username: 'Anonymous',
            avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=anon'
          };
        }
      }
    });

    res.json(polls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get pending polls (Admin)
// @route   GET /api/polls/pending
// @access  Private/Admin
const getPendingPolls = async (req, res) => {
  try {
    const polls = await Poll.find({ status: 'pending' }).sort({ createdAt: 1 });
    res.json(polls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update poll status (Admin)
// @route   PUT /api/polls/:id/status
// @access  Private/Admin
const updatePollStatus = async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    const poll = await Poll.findById(req.params.id);

    if (poll) {
      poll.status = status;
      const updatedPoll = await poll.save();

      // Notify Author
      if (status === 'approved' || status === 'rejected') {
        await Notification.create({
          recipient: poll.authorId,
          type: 'system',
          pollId: poll._id,
          message: `Your poll "${poll.question.substring(0, 30)}..." was ${status}.`
        });
      }

      res.json(updatedPoll);
    } else {
      res.status(404).json({ message: 'Poll not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a poll
// @route   POST /api/polls
// @access  Private
const createPoll = async (req, res) => {
  try {
    const { question, category, description, options, mode, tags, isAnonymous } = req.body; // Added isAnonymous

    // Validate options for standard mode
    if (mode === 'standard' && (!options || options.length < 2)) {
      return res.status(400).json({ message: 'Standard polls require at least 2 options' });
    }

    const poll = new Poll({
      authorId: req.user._id,
      question,
      description,
      category,
      mode: mode || 'standard',
      status: 'approved', // Auto-approve
      options: options ? options.map(opt => ({ text: opt, votes: 0 })) : [],
      consciousnessEntries: [],
      tags: tags || [],
      isAnonymous: isAnonymous !== undefined ? isAnonymous : (req.user.settings?.anonymousDefault || false)
    });

    const createdPoll = await poll.save();
    // Populate author info before returning
    await createdPoll.populate('authorId', 'username avatarUrl');

    res.status(201).json(createdPoll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Vote on a poll (Standard Mode)
// @route   POST /api/polls/:id/vote
// @access  Private
const votePoll = async (req, res) => {
  try {
    const { optionId } = req.body;
    const pollId = req.params.id;
    const userId = req.user._id;

    const poll = await Poll.findById(pollId);

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    if (poll.mode !== 'standard') {
      return res.status(400).json({ message: 'Cannot vote standard on this poll mode' });
    }

    // Check if user already voted
    const existingVote = await Vote.findOne({ userId, pollId });
    if (existingVote) {
      return res.status(400).json({ message: 'You have already voted on this poll' });
    }

    // Find the option
    const option = poll.options.id(optionId);
    if (!option) {
      return res.status(404).json({ message: 'Option not found' });
    }

    // Create Vote Record
    await Vote.create({
      userId,
      pollId,
      optionId
    });

    // Update Vote Count
    option.votes += 1;
    poll.totalVotes += 1;

    // Simulate or Add Archetype Data (if user has archetype)
    const userArchetype = req.user.identityTitle || 'Anonymous';
    // Mongoose Map manipulation
    const currentCount = option.archetypes.get(userArchetype) || 0;
    option.archetypes.set(userArchetype, currentCount + 1);

    await poll.save();

    // Update User Stats
    req.user.votesCast += 1;
    req.user.xp += 10;
    await req.user.save();

    // Emit Socket Event
    if (req.io) {
      req.io.to(`poll_${pollId}`).emit('vote_updated', {
        pollId,
        optionId,
        newVoteCount: option.votes,
        totalVotes: poll.totalVotes
      });
    }

    // Create Notification for Author (if not self vote)
    // CHECK GHOST MODE: Only notify if Ghost Mode is OFF
    if (poll.authorId.toString() !== req.user._id.toString()) {
      // Check if Ghost Mode is enabled in user settings
      // Note: req.user is a Mongoose document, so we can access .settings
      const isGhost = req.user.settings?.ghostMode;

      if (!isGhost) {
        await Notification.create({
          recipient: poll.authorId,
          sender: req.user._id,
          type: 'vote',
          pollId: poll._id,
          message: `voted on your poll: "${poll.question.substring(0, 20)}..."`
        });
      }
    }

    res.json(poll);
  } catch (error) {
    // Handle duplicate key error specifically if race condition occurs
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already voted on this poll' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add entry to Consciousness Poll
// @route   POST /api/polls/:id/consciousness
// @access  Private
const addConsciousnessEntry = async (req, res) => {
  try {
    const { text, intensity, layer, emoji } = req.body;
    const poll = await Poll.findById(req.params.id);

    if (!poll || poll.mode !== 'consciousness') {
      return res.status(400).json({ message: 'Invalid poll or mode' });
    }

    const entry = {
      text,
      intensity,
      layer,
      emoji,
      userId: req.user._id
    };

    poll.consciousnessEntries.push(entry);
    poll.totalVotes += 1;
    await poll.save();

    res.json(poll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a comment
// @route   POST /api/polls/:id/comments
// @access  Private
const addComment = async (req, res) => {
  try {
    const { text, parentId } = req.body;
    const poll = await Poll.findById(req.params.id);

    if (!poll) return res.status(404).json({ message: 'Poll not found' });

    const comment = await Comment.create({
      pollId: req.params.id,
      authorId: req.user._id,
      authorName: req.user.username,
      text,
      parentId: parentId || null
    });

    console.log('DEBUG: Comment Created:', {
      id: comment._id,
      pollId: comment.pollId,
      text: comment.text
    });

    // Notify Logic: Reply or Poll Author
    if (parentId) {
      // Reply: Notify parent comment author
      const parentComment = await Comment.findById(parentId);
      if (parentComment && parentComment.authorId.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: parentComment.authorId,
          sender: req.user._id,
          type: 'reply',
          pollId: poll._id,
          message: `replied to your comment: "${text.substring(0, 30)}..."`
        });
      }
    } else {
      // Root comment: Notify poll author
      if (poll.authorId.toString() !== req.user._id.toString()) {
        await Notification.create({
          recipient: poll.authorId,
          sender: req.user._id,
          type: 'comment',
          pollId: poll._id,
          message: `commented on your poll: "${text.substring(0, 30)}..."`
        });
      }
    }

    // Mention Notifications
    // Regex to find @username patterns
    const mentionRegex = /@(\w+)/g;
    const matches = [...text.matchAll(mentionRegex)];
    const mentionedUsernames = matches.map(match => match[1]);

    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } });

      for (const mUser of mentionedUsers) {
        // Don't notify if user mentioned themselves
        if (mUser._id.toString() !== req.user._id.toString()) {
          await Notification.create({
            recipient: mUser._id,
            sender: req.user._id,
            type: 'mention',
            pollId: poll._id,
            message: `mentioned you in a comment: "${text.substring(0, 20)}..."`
          });
        }
      }
    }

    res.status(201).json(comment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get comments for a poll
// @route   GET /api/polls/:id/comments
// @access  Public
const getComments = async (req, res) => {
  try {
    // Fetch all comments for poll
    const comments = await Comment.find({ pollId: req.params.id }).sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user's own polls
// @route   GET /api/polls/me
// @access  Private
const getMyPolls = async (req, res) => {
  try {
    const polls = await Poll.find({ authorId: req.user._id }).sort({ createdAt: -1 });

    // Fetch comments for these polls to keep structure consistent
    const pollIds = polls.map(p => p._id);
    const allComments = await Comment.find({ pollId: { $in: pollIds } }).sort({ createdAt: -1 }).lean();

    const commentMap = {};
    allComments.forEach(c => {
      const pid = c.pollId.toString();
      if (!commentMap[pid]) commentMap[pid] = [];
      commentMap[pid].push(c);
    });

    polls.forEach(poll => {
      poll.comments = commentMap[poll._id.toString()] || [];
    });

    res.json(polls);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a poll
// @route   DELETE /api/polls/:id
// @access  Private
const deletePoll = async (req, res) => {
  try {
    console.log('DEBUG: deletePoll called for ID:', req.params.id);
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      console.log('DEBUG: Poll not found');
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Check ownership
    if (poll.authorId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      console.log('DEBUG: Not authorized to delete');
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Use deleteOne instead of remove() which is deprecated in newer Mongoose versions
    await Poll.deleteOne({ _id: poll._id });
    await Vote.deleteMany({ pollId: poll._id });
    await Comment.deleteMany({ pollId: poll._id });

    console.log('DEBUG: Poll deleted successfully');
    res.json({ message: 'Poll removed' });
  } catch (error) {
    console.error('DEBUG: deletePoll Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a poll
// @route   PUT /api/polls/:id
// @access  Private
const updatePoll = async (req, res) => {
  try {
    const { question, options } = req.body;
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }

    // Check ownership
    if (poll.authorId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Update fields
    if (question) poll.question = question;

    // Update options logic
    // We need to be careful not to lose vote counts if options are just renamed.
    // For now, assuming simple replacement or addition. 
    // If an option is removed, its votes are technically "lost" or orphaned in Vote model unless we handle it.
    // For simplicity in this MVP: Re-map options. 
    // If the text matches an existing option, keep its votes.
    if (options) {
      const newOptions = options.map(optText => {
        const existing = poll.options.find(o => o.text === optText);
        return existing ? existing : { text: optText, votes: 0 };
      });
      poll.options = newOptions;
    }

    poll.isEdited = true;
    const updatedPoll = await poll.save();
    res.json(updatedPoll);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get trending topics (hashtags)
// @route   GET /api/polls/trending
// @access  Public
const getTrendingTopics = async (req, res) => {
  try {
    const trending = await Poll.aggregate([
      { $unwind: "$tags" },
      {
        $group: {
          _id: "$tags",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Format for frontend: { tag: "#Tag", count: 10 }
    const formatted = trending.map(t => ({
      tag: t._id,
      count: t.count
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPolls,
  getPendingPolls,
  updatePollStatus,
  createPoll,
  votePoll,
  addConsciousnessEntry,
  addComment,
  getComments,
  getMyPolls,
  deletePoll,
  updatePoll,
  getTrendingTopics
};
