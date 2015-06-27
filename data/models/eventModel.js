var db = require('mongoose');
var _ = require('lodash');

var eventSchema = new db.Schema({
	name: {type:String, index: 'text', required: true},
	platforms: scrapers.platformIds, //Id's for different platforms.
	date: {type: Date, index: 'text', required: true},
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
	venue: {type:db.Schema.Types.ObjectId,ref:'Venue', required: true},
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
},{autoIndex: false}); 



var event = db.model('Event',eventSchema);

event.create

module.exports = event;