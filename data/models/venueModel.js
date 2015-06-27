var db = require('mongoose');
var _ = require('lodash');
var scrapers = require('scrapers');
var venueSchema = new db.Schema({
	name: String,
	platforms: scrapers.platformIds,
	location: {
		address: String,
		city: String,
		zip: Number,
		statecode: String,
		countrycode: String,
		gps: {
			lon: Number,
			lat: Number
		}
	},
	url: String,
	tags: [{type: String}],
	links: [{type:String}], //link to venue site.
	phone: String,
	banners: Array,
	colors: {
		primary: String,
		secondary: String,
	},
	age: Number,
	events: [{type:db.Schema.Types.ObjectId, ref: 'Event'}], //events at this venue (past and present)
	users: [{type:db.Schema.Types.ObjectId, ref: 'User'}], //users that are going to this venue
	//artists: [{type:db.Schema.Types.ObjectId, ref: 'Artist'}] //artists that are performing at this venue
});

venueSchema.methods.scrapeBanner = function(){
	if (this.url == null) return console.error('failed to scrape venue with no url');
	else console.log('scraping banner for "',this.name,'"')
}


venueSchema.methods.fillLinks = function(){
	_.find(this,function(obj){
		return obj.platforms != null
	});
}




var venue = db.model('Venue',venueSchema);


module.exports = venue;