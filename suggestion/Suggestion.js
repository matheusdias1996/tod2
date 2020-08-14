var mongoose = require('mongoose');
var SuggestionSchema = new mongoose.Schema({
  description: {
    required: true,
    type: String
  },
  name: {
    required: true,
    type: String
  },
  supporters: [{
    ref: 'User',
    type: mongoose.Schema.Types.ObjectId
  }],
});

mongoose.model('Suggestion', SuggestionSchema);

module.exports = mongoose.model('Suggestion');
