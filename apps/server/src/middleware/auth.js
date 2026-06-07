const jwt = require('jsonwebtoken');
const { AppError } = require('../utils/errors');
const Account = require('../models/Account');

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new AppError('লগইন প্রয়োজন', 401);
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const account = await Account.findById(decoded.id).select('-pinHash');

    if (!account) {
      throw new AppError('অ্যাকাউন্ট পাওয়া যায়নি', 401);
    }

    req.account = account;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('সেশন শেষ হয়েছে, আবার লগইন করুন', 401));
    }
    next(err);
  }
}

module.exports = authMiddleware;
