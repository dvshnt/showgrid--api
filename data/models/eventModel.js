var db = require('mongoose');
var eventSchema = new db.Schema({
	name: String,
	users: [{type:db.Schema.Types.ObjectId, ref: 'User'}],  //users going
	artists: [{type:db.Schema.Types.ObjectId, ref: 'Artist'}] //artists performing
}); 

venueSchema.methods.scrapeBanner = function(){
	if (this.url == null) return console.error('failed to scrape venue with no url');
	else console.log('scraping banner for "',this.name,'"')
}


var venue = db.model('Venue',venueSchema);


module.exports = venue;