var mongoose = require('mongoose');
var ClassSchema = new mongoose.Schema({
  closed: {
    default: false,
    required: true,
    type: Boolean,
  },
  date: {
    required: true,
    type: Date
  },
  room: {
    type: String,
  },
  duration: {
    type: Number,
  },
  students: [{
    ref: 'User',
    type: mongoose.Schema.Types.ObjectId
  }],
  subject: {
    ref: 'Subject',
    required: true,
    type: mongoose.Schema.Types.ObjectId
  },
  teachers: [{
    ref: 'User',
    type: mongoose.Schema.Types.ObjectId
  }],
  sequence: {
    required: true,
    type: Number,
  }
});

mongoose.model('Class', ClassSchema);

module.exports = mongoose.model('Class');
