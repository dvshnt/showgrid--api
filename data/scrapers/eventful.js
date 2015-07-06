/*

EVENTFUL API

*/


var cfg = require('../data_config.json').apis.eventful;
var request = require('request');
//var cities = require('cities');
var Promise = require('bluebird');
var qs = require('querystring');
var moment = require('moment');
var _ = require('lodash');


var Venue = require('../models/venueModel');
//Promise.longStackTraces();


var current_key = null;


module.exports.findEvents = function(opt){

	var url = cfg.api+'/events/search';
	
	var q = {
		app_key:opt.key || current_key,
		page_number:0,
		page_size: opt.query_size || 4,
		units: 'miles',
		category: 'music'
	};

	if(opt.sort != null) q.sort_order = opt.sort;
	if(opt.zip != null) q.location = opt.zip;
	if(opt.radius != null) q.within = opt.radius;


	var page_count = 0;
	var events = [];

	if(opt.query_size < 100){
		q.page_size = opt.query_size;
	}

	return new Promise(function(response){
		var got_pages = 0;
		var total_pages = 0;
		for(;page_count<opt.query_size;page_count+=100,q.page_number++){
			total_pages += 1;
			request.get({
				url : url + '?' + qs.stringify(q),
				json: true
			},function(err,res,data){
				//console.log(data,"============================")
				if(data.events.event != null && data.events.event.length > 0){
					events = events.concat(data.events.event)
				}else if(data.events.event != null){
					events = events.concat([data.events.event])
				}
				got_pages++;
				if(got_pages >= total_pages){
					//console.log("END FIND...QUERY SIZE REACHED.",got_pages,total_pages)
					response(events)
				}
			});
		}
	});
}





module.exports.findVenues = function(opt){
	current_key = opt.key;
	var url = cfg.api+'/venues/search';
	opt.query_size = opt.query_size || 4;

	var q = {
		app_key:opt.key,
		page_number:0,
		page_size:100,
		units: 'miles',
		category: 'music'
	};


	if(opt.zip != null) q.location = opt.zip;
	if(opt.radius != null) q.within = opt.radius;
	if(opt.sort != null) q.sort_order = opt.sort;

	var page_count = 0;
	var venues = [];

	if(opt.query_size < 100){
		q.page_size = opt.query_size;
	}

	return new Promise(function(response){
		var got_pages = 0;
		var total_pages = 0;
		for(;page_count<opt.query_size;page_count+=100,q.page_number++){
			total_pages += 1;
			request.get({
				url : url + '?' + qs.stringify(q),
				json: true
			},function(err,res,data){
				if(data.venues == null) response([]);
				//console.log(data,"============================")
				if(data.venues.venue != null && data.venues.venue.length > 0){
					venues = venues.concat(data.venues.venue)
				}else if(data.venues.venue != null){
					venues = venues.concat([data.venues.venue])
				}
				got_pages++;
				if(got_pages >= total_pages){
					console.log("END FIND...QUERY SIZE REACHED.",got_pages,total_pages)
					response(venues)
				}
			});
		}
	});
}

//GET
function get(uri,opt){
	var url = cfg.api+uri;
	var q = {
		app_key: opt.key || current_key,
		id: opt.id,
		image_sizes: 'large',
	};
	function get(resolve,reject){
		request.get({
			url : url + '?' + qs.stringify(q),
			json: true
		},function(err,res,data){
			resolve(data);
		});
	};
	return new Promise(get);
}

//GET ARTIST
module.exports.getArtist = function(opt){
	return get('/performers/get',opt);
}

//GET EVENT
module.exports.getEvent = function(opt){
	return get('/events/get',opt);
}

//GET VENUE
module.exports.getVenue = function(opt){
	return get('/venues/get',opt);
}




//PARSE ARTIST
module.exports.parseArtist = function(artist){
	var parsed =  {
		name: artist.name,
		platforms:[{name:'eventful',id:artist.id}],
		demand: artist.demand_count,
	}

	if(artist.images != null) parsed.banners = artist.images.image.length != null ? artist.images.image : [artist.images.image];
	if(artist.links != null) parsed.links = artist.links.link.length != null ? artist.links.link : [artist.links.link];

	return parsed;
}



//FILTER EVENT
module.exports.parseEvent = function(event){
	var event =  {
		is: 'event',
		name: event.title,
		platforms:[{name:'eventful',id:event.id}],
		description: event.description,
		date: moment(event.start_time,moment.ISO_8601).utc().format(),
		venue: {
			platforms:[{name:'eventful',id:event.venue_id}],
			location: {
				address: event.venue_address
			}
		},
		artists: {
			headers: (function(){
			
				if(event.performer == null) return;

				if(event.performer.length != null){
					var performers = _.each(event.performer,function(artist){
						return {
							platforms:[{name:'eventful',id:artist.id}],
						}
					});
					return performers;
				}else if(event.performer != null){
					return [{
						platforms:[{name:'eventful',id:event.performer.id}],
					}]
				}
			})(),
		},
		banners: (function(){
			if(event.image != null ){
				if(event.image.medium != null){
					return event.image.medium.url;
				}else if(event.image.small != null){
					return event.image.small.url;
				}
			}
		})(),
	}

	return new Promise(function(res,rej){
		module.exports.getEvent({id:event.platforms[0].id}).then(function(raw_event){
			if(raw_event.images != null) event.banners = raw_event.images.image.length != null ? raw_event.images.image : [raw_event.images.image];
			if(raw_event.links != null) event.links = raw_event.links.link.length != null ? raw_event.links.link : [raw_event.links.link];

			//console.log(event);
			res(event);
		});
	});	
}







//FILTER VENUE DATA
module.exports.parseVenue = function(venue){
	//console.log('PARSE')
	var venue = {
		is: 'venue',
		platforms:[{name:'eventful',id:venue.id}],
		name: venue.name,	
		location: {
			address:venue.venue_address,
			city: venue.city_name,
			zip: venue.postal_code,
			statecode: venue.region_abbr,
			countrycode: venue.country_abbr,
			gps: [venue.latitude,venue.longitude]		
		}
	}


	//get link
	return new Promise(function(res,rej){
		module.exports.getVenue({id:venue.platforms[0].id}).then(function(raw_venue){
			if(raw_venue == null) return res(venue);

			var getlink = function(){
				if(raw_venue.links != null && raw_venue.links.link.length != null){
					venue.links = _.map(raw_venue.links.link,function(link){
						return link.url;
					});				
				}else if(raw_venue.links != null && raw_venue.links.link.url != null){
					venue.links = [raw_venue.links.link.url];
				} 
			}

			var getbanner = function(){
				venue.banners = raw_venue.images.image;
			}

			venue.address = raw_venue.address;
			venue.banners = raw_venue.images != null ? raw_venue.images.image : [];
			venue.tags = raw_venue.tags != null ? raw_venue.tags.tag : [];

			res(venue);
		});
	})
}