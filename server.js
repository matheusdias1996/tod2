require('dotenv').config();
var app = require('./app');
var port = process.env.PORT || 3001; //3001

var server = app.listen(port, function() {
  console.log('Express server listening on port ' + port);
});
