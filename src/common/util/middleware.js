const jwt = require('express-jwt');
const { validationResult } = require('express-validator');
const logger = require('./logger');

// See if this middleware can be clubbed with errorHandler middleware.
const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) { return res.status(400).json({ errors: errors.array() }); }
  return next();
};

const authorize = (roles = []) => {
  // roles param can be a single role string (e.g. Role.User or 'User')
  // or an array of roles (e.g. [Role.Admin, Role.User] or ['Admin', 'User'])
  if (typeof roles === 'string') {
    // eslint-disable-next-line no-param-reassign
    roles = [roles];
  }
  const secret = process.env.SECRET;
  return [
    // authenticate JWT token and attach user to request object (req.user) using express-jwt
    jwt({ secret, algorithms: ['HS256'] }),

    // authorize based on user role
    (req, res, next) => {
      if (roles.length && !roles.includes(req.user.role)) {
        // user's role is not authorized
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return next();
    },
  ];
};

const tokenExtractor = async (req, res, next) => {
  const authorization = req.get('authorization');
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    req.token = authorization.substring(7);
    return next();
  }
  req.token = null;
  return next();
};

const unknownEndpoint = (req, res) => {
  res.status(404).send({ error: 'unknown endpoint' });
};

const errorHandler = (error, req, res, next) => {
  logger.error(error.message);

  if (error.name === 'CastError') {
    return res.status(400).send({ error: 'malformatted id' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message });
  }
  if (error.name === 'TypeError') {
    return res.status(400).json({ TypeError: error.message });
  }
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'invalid token',
    });
  }
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'token expired',
    });
  }
  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'token missing or not authorized to access',
    });
  }

  return next(error);
};

module.exports = {
  validationMiddleware,
  authorize,
  tokenExtractor,
  unknownEndpoint,
  errorHandler,
};
