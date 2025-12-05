
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    let mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/pollx';

    // Fix typo in environment variable if present
    if (mongoUrl.includes('majorityBE')) {
      console.warn('Detected typo "majorityBE" in MONGO_URL. Auto-correcting to "majority".');
      mongoUrl = mongoUrl.replace('majorityBE', 'majority');
    }

    const conn = await mongoose.connect(mongoUrl).then(() => console.log("MongoDB Connected"))
      .catch((err) => console.log(err))
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
