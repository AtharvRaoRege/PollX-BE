const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Poll = require('../models/Poll');
const Comment = require('../models/Comment');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected');
        return User.create({
            username: `comment_tester_${Date.now()}`,
            email: `comment_${Date.now()}@test.com`,
            password: 'password123'
        });
    })
    .then((user) => {
        console.log('1. User Created');
        return Poll.create({
            authorId: user._id,
            question: 'Comment Test Poll?',
            category: 'Tech',
            mode: 'standard',
            status: 'approved',
            options: [{ text: 'Yes' }, { text: 'No' }]
        }).then(poll => ({ user, poll }));
    })
    .then(({ user, poll }) => {
        console.log('2. Poll Created:', poll._id);

        // Simulate addComment controller logic
        return Comment.create({
            pollId: poll._id,
            authorId: user._id,
            authorName: user.username,
            text: 'This is a persistent comment test.'
        }).then(comment => {
            console.log('3. Comment Created:', comment._id);
            return { user, poll, comment };
        });
    })
    .then(({ user, poll, comment }) => {
        // Verify it exists in DB
        return Comment.findById(comment._id).then(found => {
            if (!found) throw new Error('Comment NOT found in DB immediately after create!');
            console.log('4. Verified Comment exists in DB');
            return { user, poll };
        });
    })
    .then(({ user, poll }) => {
        // Simulate getPolls logic
        return Poll.find({ _id: poll._id }).lean().then(polls => {
            const pollIds = polls.map(p => p._id);
            return Comment.find({ pollId: { $in: pollIds } }).lean().then(allComments => {
                console.log('5. Fetched Comments count:', allComments.length);

                const commentMap = {};
                allComments.forEach(c => {
                    const pid = c.pollId.toString();
                    if (!commentMap[pid]) commentMap[pid] = [];
                    commentMap[pid].push(c);
                });

                polls.forEach(p => {
                    p.comments = commentMap[p._id.toString()] || [];
                });

                if (polls[0].comments.length > 0) {
                    console.log('6. ✅ SUCCESS: Comment correctly attached to Poll in getPolls logic.');
                    console.log('   Comment Text:', polls[0].comments[0].text);
                } else {
                    console.error('6. ❌ FAILURE: Comment NOT attached to Poll.');
                }

                return { user, poll };
            });
        });
    })
    .then(({ user, poll }) => {
        // Cleanup
        const p1 = User.findByIdAndDelete(user._id);
        const p2 = Poll.findByIdAndDelete(poll._id);
        const p3 = Comment.deleteMany({ authorId: user._id });
        return Promise.all([p1, p2, p3]);
    })
    .then(() => {
        console.log('Cleanup complete');
        process.exit(0);
    })
    .catch(err => {
        console.error('Test Failed:', err);
        process.exit(1);
    });
