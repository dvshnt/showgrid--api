var db = require('mongoose');
var _ = require('lodash');
var scrapers = require('scrapers');
var eventSchema = new db.Schema({
	name: String,
	platforms: scrapers.platformIds, //Id's for different platforms.
	date: Date,
	tickets: [{
		price: Number,
		soldout: Boolean,
		url: String, 
		sale: {
			start: Date,
			end: Date,
		},
	}],
	private: {type: Boolean, default: false},
	featured: {type:Boolean, default: false},
	age: {type: Number,max: 21, default: 18},
	description: String,
	venue: {type:db.Schema.Types.ObjectId,ref:'Venue'},
	users: [{type:db.Schema.Types.ObjectId, ref: 'User'}],  //users going
	artists: {
		headliners:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
		openers:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}]
	},
	banners: [{
		height: Number,
		width: Number,
		url: String
	}],
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