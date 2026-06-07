const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI সেট করা নেই');
  }

  await mongoose.connect(uri);
  console.log('মঙ্গোডিবি সংযুক্ত হয়েছে');
}

module.exports = connectDB;
