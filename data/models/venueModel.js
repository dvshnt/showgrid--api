var db = require('mongoose');
var venueSchema = new db.Schema({
	
})

venueSchema.methods.test = function(){
	
}


var venue = db.model('User',venueSchema);


module.exports = venue;