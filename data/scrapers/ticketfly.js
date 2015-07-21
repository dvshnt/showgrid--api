//ticketfly ticketing
var cfg = require('../config.json').apis.ticketfly;
var Promise = require('bluebird');
var request = Promise.promisify(require('request').get);
var colors = require('colors');
var qs = require('querystring');
var p = require('../pFactory');
var gps = require('../gps');
var _ = require('lodash');
var util = require('util');

var getter = require('../data');





/*

Get all ticketfly events in a sepcific radius.

max_query only applies to how many venues to search for.

*/



module.exports.findEvents = p.sync(function(opt){
	console.log('asd');
	getter.find['venue']({
		zip: opt.zip,
		radius: opt.radius,
		limit: opt.query_size,
	}).spread(function(docs,err){
		if(err){
			console.log('TICKEFLY FETCH EVENTS ERROR IN FIND VENUES');
			return Promise.reject(err);
		}else if(dat.length == 0){
			console.log('NOTHING FOUND'.bgRed);
			return p.pipe(docs);
		}else return p.pipe(docs);
	}).then(function(venues){
		var done = 0;
		var total = venues.length;
		//venues
		_.each(venues,function(venue){
			module.exports.getEvents({
				id: venue.venueId
			}).then(function(events){
				done++;
				venue.events = events;
				if(done >= total) this.resolve(venues);
			}.bind(this));
		}.bind(this));
	}.bind(this));

	return this.promise;
});


















//get 
var getVenueEvents = p.sync(function(opt){
	var maxpages = opt.max || null;
	var totalpages = 0;
	var events = [];


	function get(page){
		request({
			url: cfg.api+"/events/upcoming?pageNum="+page+"&maxResults=200&venueId="+opt.id,
			json: true
		}).spread(function(res,dat,err){
			if(err) this.reject(err);
			else if(dat != null){
				console.log(dat.pageNum)
				totalpages = dat.totalPages
				events = events.concat(dat.events);
				if(dat.pageNum >= (maxpages || totalpages)){
					this.resolve(events);
				}else{
					get(dat.pageNum+=1);
				}
			}

		}.bind(this));
	}

	get.bind(this)(1);
	return this.promise;
});















//fetch all venues from the api
module.exports.getVenues = p.async(function(){
	var totalpages = 0;
	var venues = [];

	console.log('FETCH VENUES')
	function get(page){
		request({
			url: cfg.api+"/venues?pageNum="+page+"&maxResults=10",
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
	console.log(event);
	var parsed = {
		is: 'event',
		platforms: [{
			name: 'ticketfly',
			id: event.id
		}]
	}

	return parsed;
}













module.exports.parseVenue = function(venue){
	//var nameParts = venue.name.split('"');
	//if(nameParts.length == 3) venue.name = nameParts[1];


	//parse any nested events.
	_.each(venue.events,function(event,i){
		venues.events[i] = module.exports.parseEvent(event);
	});

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

	

	return p.pipe(parsed);
}



