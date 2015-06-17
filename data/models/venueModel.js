var db = require('mongoose');
var venueSchema = new db.Schema({
	platform: {
		name: String, //platform name (static)
		id: Number //platform related ID
	},
	location: {
		address: String,
		city: String,
		zip: Number,
		statecode: String,
		countrycode: String,
		gps: {
			lon: Number
			lat: Number
		}
	},
	url: venue.Url,
	banner: {
		sm: String,
		md: String,
		lg: String,
	},
	age: Number,
	shows: [{type:db.Schema.Types.ObjectId, ref: 'Show'}],
	users: [{type:db.Schema.Types.ObjectId, ref: 'User'}],
	artists: [{type:db.Schema.Types.ObjectId, ref: 'Artist'}]
});

venueSchema.methods.scrapeBanner = function(){
	if (this.url == null) return console.error('failed to scrape venue with no url');
}


var venue = db.model('Venue',venueSchema);


module.exports = venue;