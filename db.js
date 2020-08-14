var mongoose = require('mongoose');

var userPass = '';
if (process.env.DB_USER && process.env.DB_PASS) {
  userPass = process.env.DB_USER + ':' + process.env.DB_PASS + '@';
}

console.log('mongodb+srv://' + userPass + process.env.DB_HOST + '')
mongoose.connect('mongodb+srv://' + userPass + process.env.DB_HOST + '', {dbName: 'cursos-bain-server', useNewUrlParser:true})
.then( () => {
  console.log('Connection to the Atlas Cluster is successful!')
})
.catch( (err) => console.error(err));;
