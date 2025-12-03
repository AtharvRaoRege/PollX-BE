
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSettingsSchema = new mongoose.Schema({
  ghostMode: { type: Boolean, default: false },
  anonymousDefault: { type: Boolean, default: false },
  neonIntensity: { type: Number, default: 80 },
  reduceMotion: { type: Boolean, default: false },
  notifications: { type: Boolean, default: true },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatarUrl: { type: String, default: 'https://picsum.photos/200/200' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  
  // Gamification & Stats
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  votesCast: { type: Number, default: 0 },
  
  // Identity Profile (AI Generated)
  identityTitle: { type: String, default: 'The Unanalyzed' },
  identityDescription: { type: String, default: 'Data insufficient for analysis.' },
  tags: [{ type: String }],
  
  savedPollIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Poll' }],
  settings: { type: userSettingsSchema, default: () => ({}) }
}, {
  timestamps: true
});

// Method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);
module.exports = User;
