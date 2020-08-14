var mongoose = require('mongoose');
var SubjectSchema = new mongoose.Schema({
  description: {
    default: '',
    type: String
  },
  name: {
    required: true,
    type: String
  },
  students: [{
    ref: 'User',
    type: mongoose.Schema.Types.ObjectId
  }],
  teachers: [{
    ref: 'User',
    type: mongoose.Schema.Types.ObjectId
  }],
  trained: [{
    ref: 'User',
    type: mongoose.Schema.Types.ObjectId
  }],
  untrained: [{
    ref: 'User',
    type: mongoose.Schema.Types.ObjectId
  }],
});

mongoose.model('Subject', SubjectSchema);

module.exports = mongoose.model('Subject');
