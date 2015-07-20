//ticketfly ticketing
var cfg = require('../data_config.json').apis.ticketfly;
var Promise = require('bluebird');
var request = Promise.promisify(require('request').get);
var colors = require('colors');
var qs = require('querystring');
var p = require('../pFactory');
var gps = require('../gps');
var _ = require('lodash');
var util = require('util');
var db = require('../data');











module.exports.findEvents = function(){

}



//fetch all venues from the api
module.exports.getVenues = p.async(function(){
	var totalpages = 0;
	var venues = [];

	function get(page){
		request({
			url: cfg.api+"/venues?pageNum="+page+"&maxResults=200",
			json: true
		}).spread(function(res,dat,err){
			if(err) this.reject(err);
			else if(dat != null){
				console.log(dat.pageNum)
				totalpages = dat.totalPages

				venues = venues.concat(dat.venues);

				
				if(dat.pageNum >= 1 /*totalpages*/){
					this.resolve(venues);
				}else{
					get(dat.pageNum+=1);
				}
			}

		}.bind(this));
	}

	get.bind(this)(1);
	return this.promise;
});





module.exports.parseEvent = function(event){

	var parsed = {
		is: 'event',
		platforms: [{
			name: 'ticketfly',
			id: event.id
		}]
	}
}

module.exports.parseVenue = function(venue){
	//var nameParts = venue.name.split('"');
	//if(nameParts.length == 3) venue.name = nameParts[1];

	var parsed = {
		is: 'venue',
		platforms: [{
			name: 'ticketfly',
			id: venue.id
		}],
		name: venue.name,
		location: {
			address: venue.address1 + ' ' + venue.address2 + ' '+venue.city+ ' '+venue.stateProvince+' '+venue.postalCode,
			gps: [venue.lat,venue.lng]
		},
	}

	console.log(parsed.name);

	return p.pipe(parsed);
}



