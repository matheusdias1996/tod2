var jwt = require('jsonwebtoken');

var config = require('../config');
var User = require('../user/User');
var findUserErrorHandling = require('../user/UserUtils').findUserErrorHandling;

function verifyRole(role) {
  return function(req, res, next) {
    // check header or url parameters or post parameters for token
    var token = req.headers['x-access-token'];
    if (!token)
      return res.status(403).send({ err: { msg: 'No token provided.' } });

    // verifies secret and checks exp
    jwt.verify(token, config.secret, function(err, decoded) {
      if (err)
        return res.status(500).send({ err: { msg: 'Failed to authenticate token.' } });

      User.findById(decoded.id, findUserErrorHandling(res, function(user) {
        if (!user.isVerified) return res.status(401).send({ err: { msg: 'Email not verified.' } });
        if (user.role !== role) return res.status(403).send({ err: { msg:  'User not allowed.' } });

        req.userId = decoded.id;
        req.user = user;
        next();
      }));
    });
  }
}

module.exports = verifyRole;
