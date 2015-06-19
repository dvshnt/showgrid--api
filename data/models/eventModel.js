var db = require('mongoose');
var eventSchema = new db.Schema({
	platforms: [{tag:String,id:String}], //Id's for different platforms.
	date: Date,
	ticket: {type:db.Schema.Types.ObjectId,ref:'Ticket'},
	private: {type: Boolean, default: false},
	featured: {type:Boolean, default: false},
	age: {type: Number,max: 21, default: 21},
	name: String,
	venue: {type:db.Schema.Types.ObjectId,ref:'Venue'},
	users: [{type:db.Schema.Types.ObjectId, ref: 'User'}],  //users going
	artists: {
		headers:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
		openers:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}]
	}
}); 






var event = db.model('Event',eventSchema);


module.exports = event;