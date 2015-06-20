/*

EVENTFUL API

*/


var cfg = require('../data_config.json').apis.eventful;
var request = require('request');
//var cities = require('cities');
var Promise = require('bluebird');
var qs = require('querystring');
var moment = require('moment');


var Venue = require('../models/venueModel');
//Promise.longStackTraces();





module.exports.findEvents = function(opt){

	var url = cfg.api+'/events/search';
	
	var q = {
		app_key:opt.key,
		page_number:0,
		page_size:100,
		units: 'miles',
		category: 'music'
	};


	if(opt.zip != null) q.location = opt.zip;
	if(opt.radius != null) q.within = opt.radius;

	function get(resolve,reject){
		request.get({
			url : url + '?' + qs.stringify(q),
			json: true
		},function(err,res,data){
			console.log('got raw eventful events data !');
			console.log(data.events.event.length)
			if(data.events.event != null && data.events.event.length > 0){
				resolve(data.events.event);
			}else if(data.events.event != null){
				resolve([data.events.event]);
			}else{
				resolve([]);
			}
		});
	}
	return new Promise(get);
}





module.exports.findVenues = function(opt){
	var url = cfg.api+'/venues/search';
	
	var q = {
		app_key:opt.key,
		page_number:0,
		page_size:1,
		units: 'miles',
		category: 'music'
	};


	if(opt.zip != null) q.location = opt.zip;
	if(opt.radius != null) q.within = opt.radius;


	function get(resolve,reject){
		request.get({
			url : url + '?' + qs.stringify(q),
			json: true
		},function(err,res,data){
			
			resolve(data.venues);
		});
	}
	return new Promise(get);
}





module.exports.getArtist = function(id){

	var url = cfg.api+'/performers/get';

	var q = {
		id: id,
		show_events: true,
		image_sizes: 'large'
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

module.exports.getArtist = function(id){

	var url = cfg.api+'/performers/get';

	var q = {
		id: id,
		show_events: true,
		image_sizes: 'large'
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


//ONLY FIND ARTISTS FROM AN AREA...

// module.exports.getArtists = function(opt){
// 	var url = cfg.api+'/performers/search';
	
// 	var q = {
// 		app_key:key,
// 		page_number:0,
// 		page_size:1,
// 		units: 'miles',
// 		category: 'music'
// 	};


// 	if(opt.zip != null) q.location = opt.zip;
// 	if(opt.radius != null) q.within = opt.radius;


// 	function get(resolve,reject){
// 		request.get({
// 			url : url + '?' + qs.stringify(q),
// 			json: true
// 		},function(err,res,data){
			
// 			resolve(data.venues);
// 		});
// 	}
// 	return new Promise(get);
// }





module.exports.parseArtist = function(artist){

}





module.exports.parseEvent = function(event){
	// if(event.performers == null){
	// 	console.log('no performers?!');
	// 	return null;
	// } 
	// else console.log((event.performers)) ;
	return {
		name: event.title,
		platforms: [{
			tag: 'eventful',
			id: event.id
		}],
		description: event.description,
		date: moment(event.start_time,moment.ISO_8601).utc().format(),
		performers: {

		},
		venue: {
			platforms: [{
				tag: 'eventful',
				id: event.venue_id
			}],
		},
		performers: (function(){
			if(event.performer == null) return

			if(event.performer.length != null){
				var performers = _.each(event.performer,function(artist){
					return {
						platforms: [{
							tag: 'eventful',
							id: artist.id,
						}],
					}
				});
				return performers;
			}else if(event.performer != null){
				return [{
					platforms: [{
						tag: 'eventful',
						id: event.performer.id,
					}],
				}]
			}
		})(),
		banners: (function(){
			if(event.image != null ){
				if(event.image.medium != null){
					return event.image.medium.url
				}else if(event.image.small != null){
					return event.image.small.url
				}
			}
		})()
	}
}

module.exports.parseVenue = function(venue){
	return {
		platforms: [{
			tag: 'eventful',
			id: venue.id
		}],	
		name: venue.name,	
		location: {
			address:venue.venue_address,
			city: venue.city_name,
			zip: venue.postal_code,
			statecode: venue.region_abbr,
			countrycode: venue.countryabbr,
			gps: {
				lat: venue.latitude,
				lon: venue.longitude
			}				
		}	
	}
}