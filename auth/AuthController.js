var bcrypt = require('bcryptjs');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var express = require('express');
var jwt = require('jsonwebtoken');
var router = express.Router();

var User = require('../user/User');
var findUserErrorHandling = require('../user/UserUtils').findUserErrorHandling;
var Token = require('../token/Token');
var VerifyToken = require('./VerifyToken');

var config = require('../config');
var sendMail = require('../email/sendMail');

router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

function createToken(res, user, template, callback) {
  Token.create({
    _userId: user._id,
    token: crypto.randomBytes(16).toString('hex')
  }, function(err, token) {
    if (err) {
      console.error(err);
      return res.status(500).send({ err: { msg: "There was a problem creating the token." } });
    }

    sendMail(user.email, template, {
      token: token.token,
      user: user
    });

    callback();
  });
}

function sendJWTToken(res, userId) {
  var jwtToken = jwt.sign({ id: userId }, config.secret, {
    expiresIn: 86400 // expires in 24 hours
  });

  res.status(200).send({ token: jwtToken });
}

function handleError(err, res, status, msg) {
  console.error(err);
  res.status(status).send({ err: { msg: msg } });
}

router.post('/login', function(req, res) {
  User.findOne({ email: req.body.email }, findUserErrorHandling(res, function (user) {
    if (!user.isVerified) return res.status(401).send({ err: { msg: 'Email not verified.' } });

    bcrypt.compare(req.body.password, user.password, function(err, passwordIsValid) {
      if (!passwordIsValid) return res.status(401).send({ err: { msg: 'Invalid password.' } });

      sendJWTToken(res, user._id);
    });
  }));
});

router.post('/register', function(req, res) {
  if (req.body.password !== req.body.confirmPassword) {
    return res.status(400).send({ err: { msg: "Password and confirm password must be equal." } });
  }
  if (!(/@bain\.com$/.test(req.body.email) || /joao\.(?:(?:fernandesn(?:\+.+)?@gmail)|(?:fneto(?:\+.+)?@outlook))\.com$/.test(req.body.email))) {
    return res.status(400).send({ err: { msg: "Email must end with '@bain.com'." } });
  }
  bcrypt.hash(req.body.password, 10, function(err, hashedPassword) {
    User.create({
      name : req.body.name,
      email : req.body.email,
      password : hashedPassword
    }, function (err, user) {
      if (err) {
        var message = 'There was a problem registering the user.';
        if (err.name === 'ValidationError') {
          message = '';
          for (field in err.errors) {
            message += err.errors[field].message + '\n';
          }
        }
        return handleError(err, res, 500, message);
      }

      createToken(res, user, 'confirmation', function() {
        res.status(200).send({ success: { msg: 'User created! Check your e-mail to verify your account.' } })
      });
    });
  });
});

router.get('/me', VerifyToken, function(req, res, next) {
  User.findById(req.userId, { password: 0 }, findUserErrorHandling(res, function (user) {
    res.status(200).send(user);
  }));
});

router.put('/changePassword/:token', function(req, res, next) {
  if (req.body.password !== req.body.confirmPassword) {
    return res.status(400).send({ err: { msg: "Password and confirm password must be equal." } });
  }
  Token.findOne({ token: req.params.token }, function(err, token) {
    if (err) return handleError(err, res, 500, "There was a problem finding the token.");
    if (!token) {
      // resend token form
      return res.status(404).send({ err: { msg: "No token found." } });
    }

    bcrypt.hash(req.body.password, 10, function(err, hashedPassword) {
      User.findByIdAndUpdate(token._userId, { $set: { password: hashedPassword } }, function(err, user) {
        if (err) return handleError(err, res, 500, "There was a problem finding the user.");

        res.status(200).send({ success: { msg: 'Password updated!' } })
      });
    });
  });
});

router.get('/confirm/:token', function(req, res, next) {
  Token.findOne({ token: req.params.token }, function(err, token) {
    if (err) return handleError(err, res, 500, "There was a problem finding the token.");
    if (!token) {
      // resend token form
      return res.status(404).send({ err: { msg: "No token found." } });
    }

    User.findByIdAndUpdate(token._userId, { $set: { isVerified: true } }, function(err, user) {
      if (err) return handleError(err, res, 500, "There was a problem finding the user.");

      sendJWTToken(res, user._id);
    });
  });
});

router.post('/resendToken', function(req, res, next) {
  User.findOne({ email: req.body.email }, findUserErrorHandling(res, function(user) {
    createToken(res, user,  'confirmation', function() {
      res.status(200).send({ success: { msg: 'Token sent! Check your e-mail to verify your account.' } })
    });
  }));
});

router.post('/resetPassword', function(req, res, next) {
  User.findOne({ email: req.body.email, isVerified: true }, findUserErrorHandling(res, function(user) {
    createToken(res, user, 'resetPassword', function() {
      res.status(200).send({ success: { msg: 'Token sent! Check your e-mail to reset your password.' } })
    });
  }));
});

module.exports = router;
