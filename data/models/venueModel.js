var db = require('mongoose');
var venueSchema = new db.Schema({
	
})

venueSchema.methods.test = function(){
	console.log('test')
}


var venue = db.model('User',venueSchema);


module.exports = venue;