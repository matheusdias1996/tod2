var mongoose = require('mongoose');
var TokenSchema = new mongoose.Schema({
  _userId: {
    ref: 'User',
    required: true,
    type: mongoose.Schema.Types.ObjectId
  },
  token: {
    required: true,
    type: String
  },
  createdAt: {
    default: Date.now,
    expires: 43200, // 12 hours
    required: true,
    type: Date
  }
});

mongoose.model('Token', TokenSchema);

module.exports = mongoose.model('Token');
