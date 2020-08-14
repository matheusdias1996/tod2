var express = require('express');
var app = express();
var db = require('./db');
global.__root   = __dirname + '/';

app.use(function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, x-access-token');
  next();
});

var UserController = require(__root + 'user/UserController');
app.use('/api/users', UserController);

var AuthController = require(__root + 'auth/AuthController');
app.use('/api/auth', AuthController);

var SubjectController = require(__root + 'subject/SubjectController');
app.use('/api/subjects', SubjectController);

var ClassController = require(__root + 'class/ClassController');
app.use('/api/classes', ClassController);

var SuggestionController = require(__root + 'suggestion/SuggestionController');
app.use('/api/suggestions', SuggestionController);

module.exports = app;
