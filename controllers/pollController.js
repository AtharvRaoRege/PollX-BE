
const Poll = require('../models/Poll');
const User = require('../models/User');
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');

// @desc    Get approved polls (Feed)
// @route   GET /api/polls
// @access  Public
const getPolls = async (req, res) => {
  try {
    const polls = await Poll.find({ status: 'approved' }).sort({ createdAt: -1 });
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
    const { question, category, description, options, mode } = req.body;

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
      status: 'pending', // Default to pending
      options: options || [],
      consciousnessEntries: []
    });

    const createdPoll = await poll.save();
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
    const poll = await Poll.findById(req.params.id);

    if (!poll) {
      return res.status(404).json({ message: 'Poll not found' });
    }
    
    if (poll.mode !== 'standard') {
        return res.status(400).json({ message: 'Cannot vote standard on this poll mode' });
    }

    // Find the option
    const option = poll.options.id(optionId);
    if (!option) {
      return res.status(404).json({ message: 'Option not found' });
    }

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

    // Create Notification for Author (if not self vote)
    if (poll.authorId.toString() !== req.user._id.toString()) {
        await Notification.create({
            recipient: poll.authorId,
            sender: req.user._id,
            type: 'vote',
            pollId: poll._id,
            message: `voted on your poll: "${poll.question.substring(0, 20)}..."`
        });
    }

    res.json(poll);
  } catch (error) {
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

module.exports = { 
  getPolls, 
  getPendingPolls, 
  updatePollStatus, 
  createPoll, 
  votePoll, 
  addConsciousnessEntry, 
  addComment, 
  getComments 
};
