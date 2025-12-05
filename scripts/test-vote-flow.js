const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB Connected');
        const testUserEmail = `testuser_${Date.now()}@example.com`;

        // 1. Create User
        return User.create({
            username: `testuser_${Date.now()}`,
            email: testUserEmail,
            password: 'password123'
        });
    })
    .then((user) => {
        console.log('1. User Created:', user.username);

        // 2. Create Poll
        return Poll.create({
            authorId: user._id,
            question: 'Test Poll Question?',
            category: 'Tech',
            mode: 'standard',
            status: 'approved',
            options: [
                { text: 'Option A' },
                { text: 'Option B' }
            ]
        }).then((poll) => {
            console.log('2. Poll Created:', poll._id);
            return { user, poll };
        });
    })
    .then((data) => {
        const { user, poll } = data;
        const optionId = poll.options[0]._id;

        // 3. Vote
        return Vote.create({
            userId: user._id,
            pollId: poll._id,
            optionId: optionId
        }).then(() => {
            console.log('3. Vote Cast successfully');
            return { user, poll };
        });
    })
    .then((data) => {
        const { user, poll } = data;

        // 4. Duplicate Vote
        return Vote.create({
            userId: user._id,
            pollId: poll._id,
            optionId: poll.options[1]._id
        }).then(() => {
            console.error('❌ ERROR: Duplicate vote was allowed!');
            return { user, poll };
        }).catch((error) => {
            if (error.code === 11000) {
                console.log('4. ✅ SUCCESS: Duplicate vote prevented by DB index.');
            } else {
                console.error('❌ ERROR: Unexpected error during duplicate vote:', error);
            }
            return { user, poll };
        });
    })
    .then((data) => {
        const { user, poll } = data;
        // Cleanup
        const p1 = User.findByIdAndDelete(user._id);
        const p2 = Poll.findByIdAndDelete(poll._id);
        const p3 = Vote.deleteMany({ userId: user._id });
        return Promise.all([p1, p2, p3]);
    })
    .then(() => {
        console.log('Cleanup complete');
        process.exit(0);
    })
    .catch((error) => {
        console.error('Test Failed:', error);
        process.exit(1);
    });
