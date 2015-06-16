//database setup
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/test');
mongoose.connection.on('error',console.error.bind(console,'connection error'));
/*mongoose.connection.on('open',function(callback){
	//console.log('connected to database!',mongoose.connection);
});*/


//export our models to the controllers
module.exports = {
	venue : require('./models/venue').profile,
}