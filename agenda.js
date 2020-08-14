var Agenda = require('agenda');

var userPass = '';
if (process.env.DB_USER && process.env.DB_PASS) {
  userPass = process.env.DB_USER + ':' + process.env.DB_PASS + '@';
}

var agenda = new Agenda({
  db: {address: 'mongodb+srv://' + userPass + process.env.DB_HOST + '/cursos-bain-server'},
  processEvery: '30 seconds'
});

agenda.start();

module.exports = agenda;
