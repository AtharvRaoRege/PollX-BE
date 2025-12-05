const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Poll = require('../models/Poll');
const Vote = require('../models/Vote');
const Comment = require('../models/Comment');
const User = require('../models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('MongoDB Connected');

        console.log('Deleting all Polls...');
        await Poll.deleteMany({});

        console.log('Deleting all Votes...');
        await Vote.deleteMany({});

        console.log('Deleting all Comments...');
        await Comment.deleteMany({});

        console.log('Deleting all Users (optional, keeping for now)...');
        // await User.deleteMany({}); // Keep users for convenience

        console.log('✅ Database Wiped Clean. Ready for fresh testing.');
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
