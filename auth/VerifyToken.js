var jwt = require('jsonwebtoken');
var config = require('../config');

var User = require('../user/User');
var findUserErrorHandling = require('../user/UserUtils').findUserErrorHandling;

function verifyToken(req, res, next) {
  var token = req.headers['x-access-token'];
  if (!token) 
    return res.status(403).send({ err: { msg:  'No token provided.' } });

  jwt.verify(token, config.secret, function(err, decoded) {      
    if (err) {
      return res.status(500).send({ err: { msg:  'Failed to authenticate token.', originalError: err } });
    }

    User.findById(decoded.id, findUserErrorHandling(res, function(user) {
      if (!user.isVerified) return res.status(401).send({ err: { msg: 'Email not verified.' } });

      req.userId = decoded.id;
      next();
    }));
  });
}

module.exports = verifyToken;
