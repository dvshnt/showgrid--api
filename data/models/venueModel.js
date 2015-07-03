var db = require('mongoose');
var _ = require('lodash');
var scrapers = require('../scrapers.js')


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
	}]
});



var venueSchema = new db.Schema({
	name: {type:String, required: true, index: 'text'},
	platforms: scrapers.platformIds,
	location: {
		address: String,
		city: String,
		zip: {type: Number,required: true},
		statecode: {type: String,required: true},
		countrycode: {type: String,required: true},
		gps: [{type:Number, required: true, index: '2dsphere'}]
	},
	links: [{type:String, required: true}],
	tags: [{type: String}],
	phone: {type: String, index: 'text'},
	banners: Array,
	colors: {
		primary: String,
		secondary: String,
	},
	age: Number,
	events: [{type:db.Schema.Types.ObjectId, ref: 'Event'}], //events at this venue (past and present)
	users: [{type:db.Schema.Types.ObjectId, ref: 'User'}], //users that are going to this venue
	//artists: [{type:db.Schema.Types.ObjectId, ref: 'Artist'}] //artists that are performing at this venue
},{autoIndex: false});

venueSchema.methods.scrapeBanner = function(){
	if (this.url == null) return console.error('failed to scrape venue with no url');
	else console.log('scraping banner for "',this.name,'"')
}





var venue = db.model('Venue',venueSchema);


module.exports = venue;