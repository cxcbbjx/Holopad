const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/holopad', {
      serverSelectionTimeoutMS: 5000, 
    });
    isConnected = true;
    console.log('📦 MongoDB Connected');
  } catch (err) {
    isConnected = false;
    console.warn('⚠️ MongoDB Connection Failed - Running in Offline Mode');
    console.error(err.message);
  }
};

// Schema for tracking uploaded images (Training Data)
const ImageLogSchema = new mongoose.Schema({
  originalName: String,
  path: String,
  status: { type: String, enum: ['success', 'failed', 'pending', 'fallback'], default: 'pending' },
  error: String,
  metadata: Object,
  timestamp: { type: Date, default: Date.now }
});

// Schema for Users (Tokens & Roles)
const UserSchema = new mongoose.Schema({
  deviceId: { type: String, unique: true, required: true }, // Simple device-based auth
  role: { type: String, enum: ['user', 'developer'], default: 'user' },
  tokens: { type: Number, default: 10 }, // Start with 10 free tokens
  walletBalance: { type: Number, default: 0 }, // Virtual currency for marketplace
  createdAt: { type: Date, default: Date.now }
});

// Schema for Transactions
const TransactionSchema = new mongoose.Schema({
  userId: String,
  type: { type: String, enum: ['buy_token', 'buy_asset', 'sell_asset', 'use_meg'], required: true },
  amount: Number, // Cost or Value
  details: String,
  timestamp: { type: Date, default: Date.now }
});

const ImageLog = mongoose.model('ImageLog', ImageLogSchema);
const User = mongoose.model('User', UserSchema);
const Transaction = mongoose.model('Transaction', TransactionSchema);

module.exports = {
  connectDB,
  isConnected: () => isConnected,
  ImageLog,
  User,
  Transaction
};
