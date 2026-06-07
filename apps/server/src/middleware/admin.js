const { AppError } = require('../utils/errors');

function adminMiddleware(req, res, next) {
  if (!req.account?.isAdmin) {
    return next(new AppError('এডমিন অ্যাক্সেস প্রয়োজন', 403));
  }
  next();
}

module.exports = adminMiddleware;
