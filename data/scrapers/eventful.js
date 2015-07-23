/*

EVENTFUL API

*/


var cfg = require('../config.json').apis.eventful;
var request = require('request');
//var cities = require('cities');
var Promise = require('bluebird');
var qs = require('querystring');
var moment = require('moment');
var _ = require('lodash');

var p = require('../pFactory.js');

//Promise.longStackTraces();


var current_key = cfg.keys[0];


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





	//get items
	var getItems = p.async(function(events){
		this.total = events.length;
		this.data = events;
		_.each(events,function(e,i){
			module.exports.getEvent({key:opt.key,id:e.id}).then(function(e_full){
				if(e_full == null){
					this.checkAsync();
					events[i] = e_full;
					return;
				}
				module.exports.getVenue({key:opt.key,id:e_full.venue_id})
				
				.then(module.exports.parseVenue)
				
				.then(function(venue){
					events[i].venue = venue;
					//console.log('got event venue');
					//console.log(this.count,this.total);
					this.checkAsync();
				}.bind(this));
				
				events[i] = e_full;
			

			}.bind(this));
		}.bind(this));

		return this.promise;
	});




	return new Promise(function(response){
		var got_pages = 0;
		var total_pages = 0;
		for(;page_count<opt.query_size;page_count+=100,q.page_number++){
			total_pages += 1;
			request.get({
				url : url + '?' + qs.stringify(q),
				json: true
			},function(err,res,data){

				//get each event.


				//console.log(data,"============================")
				if(data.events.event != null && data.events.event.length > 0){
					
					events = events.concat(data.events.event)
				}else if(data.events.event != null){
					events = events.concat([data.events.event])
				}
				got_pages++;
				if(got_pages >= total_pages){
					console.log("\nGOT EVENTFUL EVENTS  PARTIAL".green,got_pages,total_pages)
					getItems(events).then(function(events){
						console.log("\nGOT EVENTFUL EVENTS FULL".green,events.length)
						response(events);
					}.bind(this))
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



	var getItems = p.async(function(venues){
		this.total = venues.length;
		this.data = venues;
		_.each(venues,function(e,i){
			module.exports.getVenue({key:opt.key,id:e.id}).then(function(v_full){
				venues[i] = v_full;
				//console.log('got full venue');
				this.checkAsync();
			}.bind(this));
		}.bind(this));

		return this.promise;
	});



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
					console.log("\nGOT EVENTFUL VENUE PAGES".green,got_pages,'/',total_pages)
					getItems(venues).then(function(venues){
						response(venues);
						//console.log("END FIND VENUE...GOT ALL ITEMS.",got_pages,total_pages)
					}.bind(this))
					//console.log("END FIND VENUE...QUERY SIZE REACHED.",venues.length)
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
		banners : event.images != null && _.isArray(artist.images.image) ? _.map(artist.images.image,function(img){
			return img.large || img.medium || img.small
		}) : null,

		links : event.links != null && _.isArray(artist.links.link) ? _.map(artist.links.link,function(link){
			return link.url
		}) : null,
		created : artist.created,

	}

	return parsed;
}

















//FILTER EVENT
module.exports.parseEvent = function(event){

	var n_event =  {
		is: 'event',
		name: event.title,
		platforms:[{name:'eventful',id:event.id}],
		description: event.description,
		date: {
			start: event.start_time != null ? moment(event.start_time).utc().format() : null,
			end: event.end_time != null ? moment(event.end_time).utc().format() : null
		},
		venue: event.venue,
		created: event.created,
		artists: {
			headers: (function(){
			
				if(event.performer == null) return null;

				if(event.performer.length != null){
					var performers = _.each(event.performer,function(artist){
						return {
							platforms:[{name:'eventful',id:artist.id}],
						}
					});
					return performers;
				}else
					return [{
						platforms:[{name:'eventful',id:event.performer.id}],
					}]
				
			})(),
		},

		banners : event.images != null && _.isArray(event.images.image) ? _.map(event.images.image,function(img){
			return img.large || img.medium || img.small
		}) : null,

		links : event.links != null && _.isArray(event.links.link) ? _.map(event.links.link,function(link){
			return link.url
		}) : null,
	}

	return p.pipe(n_event)
}

















//FILTER VENUE DATA
module.exports.parseVenue = function(venue){


//	var lol = 0;
	//console.log(lol++)
	var n_venue = {
		is: 'venue',
		platforms:[{name:'eventful',id:venue.id}],
		name: venue.name,	
		location: {
			address:venue.address,
			city: venue.city,
			zip: venue.postal_code,
			statecode: venue.region_abbr,
			countrycode: venue.country_abbr,
			gps: (venue.latitude != 0 && venue.longitude != 0) ? [venue.latitude,venue.longitude] : null		
		},
		created : venue.created
	};

	//console.log(lol++)
	//get links	
	if(venue.links != null && _.isArray(venue.links.link)){
		n_venue.links = _.map(venue.links.link,function(link){
			return link.url;
		});				
	}else if(venue.links != null && venue.links.link != null ){
		n_venue.links = [venue.links.link.url];
	} 

	//console.log(lol++)
	//get banners
	if(venue.images != null && _.isArray(venue.images.image))
		n_venue.banners = _.map(venue.images.image,function(img){
			return (img.large || img.medium || img.small);
		});
	else if(venue.images != null && venue.images.image != null)
		var img = venue.images.image.large || venue.images.image.medium || venue.images.image.small
		n_venue.banners = [img]

	//console.log(lol++)

	return p.pipe(n_venue)
};