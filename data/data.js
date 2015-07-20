//database setup
var cfg = require('./data_config.json');
var mongoose = require('mongoose');
if(process.env.NODE_ENV == 'development'){
	mongoose.connect(cfg.dev_db);
}else{
	mongoose.connect(cfg.live_db);
}

mongoose.connection.on('error',console.error.bind(console,'connection error'));
/*mongoose.connection.on('open',function(callback){
	//console.log('connected to database!',mongoose.connection);
});*/



function postVenue(json){

}




//export our models to the controllers
module.exports = {
	venue: require('./models/venue-event'),
	user: require('./models/user'),
	artist: require('./models/artist'),
}