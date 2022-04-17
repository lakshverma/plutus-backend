const jwt = require("express-jwt");
const { validationResult } = require("express-validator");

// See if this middleware can be clubbed with errorHandler middleware.
const validationMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array() });
  next();
};

const authorize = (roles = []) => {
  // roles param can be a single role string (e.g. Role.User or 'User')
  // or an array of roles (e.g. [Role.Admin, Role.User] or ['Admin', 'User'])
  if (typeof roles === "string") {
    roles = [roles];
  }
  const secret = process.env.SECRET;
  return [
    // authenticate JWT token and attach user to request object (req.user) using express-jwt
    jwt({ secret, algorithms: ["HS256"] }),

    // authorize based on user role
    (req, res, next) => {
      if (roles.length && !roles.includes(req.user.role)) {
        // user's role is not authorized
        return res.status(401).json({ error: "Unauthorized" });
      }
      next();
    },
  ];
};

const tokenExtractor = async (request, response, next) => {
  const authorization = request.get("authorization");
  if (authorization && authorization.toLowerCase().startsWith("bearer ")) {
    request.token = authorization.substring(7);
    return next();
  }
  request.token = null;
  next();
};

const unknownEndpoint = (request, response) => {
  response.status(404).send({ error: "unknown endpoint" });
};

const errorHandler = (error, request, response, next) => {
  // logger.error(error.message);

  if (error.name === "CastError") {
    return response.status(400).send({ error: "malformatted id" });
  }
  if (error.name === "ValidationError") {
    return response.status(400).json({ error: error.message });
  }
  if (error.name === "TypeError") {
    return response.status(400).json({ TypeError: error.message });
  }
  if (error.name === "JsonWebTokenError") {
    return response.status(401).json({
      error: "invalid token",
    });
  }
  if (error.name === "UnauthorizedError") {
    return response.status(401).json({
      error: "token missing or not authorized to access",
    });
  }

  next(error);
};

module.exports = {
  validationMiddleware,
  authorize,
  tokenExtractor,
  unknownEndpoint,
  errorHandler,
};
