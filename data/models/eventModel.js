var db = require('mongoose');
var _ = require('lodash');

var eventSchema = new db.Schema({
	platforms: [{tag:String,id:String}], //Id's for different platforms.
	date: Date,
	ticket: {type:db.Schema.Types.ObjectId,ref:'Ticket'},
	private: {type: Boolean, default: false},
	featured: {type:Boolean, default: false},
	age: {type: Number,max: 21, default: 21},
	name: String,
	description: String,
	venue: {type:db.Schema.Types.ObjectId,ref:'Venue'},
	users: [{type:db.Schema.Types.ObjectId, ref: 'User'}],  //users going
	artists: {
		headers:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
		openers:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}]
	},
	banners: [{type:String}]
}); 


var scrapers = require('../scrapers.js');


//FILL IN LINKS SECONDARY UPDATE.
eventSchema.pre('save',function(next){
 	//get artists.

 	//find if artists already exist in database, if not scrape them.


	_.each(this.artists.headers,function(artist){
		scrapers.get()
	})
})



var event = db.model('Event',eventSchema);


module.exports = event;