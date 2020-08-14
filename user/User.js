var mongoose = require('mongoose');
var UserSchema = new mongoose.Schema({
  email: {
    required: true,
    type: String,
    unique: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  name: {
    required: true,
    type: String
  },
  password: {
    required: true,
    type: String
  },
  role: {
    default: 'student/teacher',
    enum: ['admin', 'student/teacher'],
    required: true,
    type: String
  },
});

UserSchema.path('email').validate(function(value) {
  return new Promise(function(resolve, reject) {
    mongoose.model('User').count({ email: value }, function(err, count) {
      if (err) {
          return reject(err);
      } 
      resolve(!count); // If `count` is greater than zero, "invalidate"
    });
  });
}, 'Email already exists.');

mongoose.model('User', UserSchema);

module.exports = mongoose.model('User');
