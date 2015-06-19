/*

EVENTFUL API

*/


var cfg = require('../data_config.json').apis.eventful;
var request = require('request');
//var cities = require('cities');
var Promise = require('bluebird');
var qs = require('querystring');
var moment = require('moment');

//Promise.longStackTraces();



module.exports.getEvents = function(opt){

	var url = cfg.api+'/events/search';
	
	var q = {
		app_key:opt.key,
		page_number:0,
		page_size:1,
		units: 'miles'
	};


	if(opt.zip != null) q.location = opt.zip;
	if(opt.radius != null) q.within = opt.radius;
	console.log(url)

	function get(resolve,reject){
		request.get({
			url : url + '?' + qs.stringify(q),
			json: true
		},function(err,res,data){
			console.log('got raw eventuful events data !');
			resolve(data.events);
		});
	}
	return new Promise(get);
}

module.exports.getVenues = function(opt){
	var url = cfg.api+'/venues/search';
	
	var q = {
		app_key:key,
		page_number:0,
		page_size:1000,
		units: 'miles'
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

module.exports.getArtists = function(opt){

}

module.exports.parseArtist = function(artist){

}

module.exports.parseEvent = function(event){
// { watching_count: null,
//   olson_path: 'America/Chicago',
//   calendar_count: null,
//   comment_count: null,
//   region_abbr: 'TN',
//   postal_code: '37064',
//   going_count: null,
//   all_day: '0',
//   latitude: '35.9225493',
//   groups: null,
//   url: 'http://eventful.com/franklin/events/agabus-dirty-proper-/E0-001-084863127-8?utm_source=apis&utm_medium=apim&utm_campaign=apic',
//   id: 'E0-001-084863127-8',
//   privacy: '1',
//   city_name: 'Franklin',
//   link_count: null,
//   longitude: '-86.8659018',
//   country_name: 'United States',
//   country_abbr: 'USA',
//   region_name: 'Tennessee',
//   start_time: '2015-08-29 21:00:00',
//   tz_id: null,
//   description: null,
//   modified: '2015-06-12 03:56:01',
//   venue_display: '1',
//   tz_country: null,
//   performers: null,
//   title: 'Agabus- Dirty Proper',
//   venue_address: '214 Margin St.',
//   geocode_type: 'EVDB Geocoder',
//   tz_olson_path: null,
//   recur_string: null,
//   calendars: null,
//   owner: 'evdb',
//   going: null,
//   country_abbr2: 'US',
//   image: null,
//   created: '2015-06-12 03:56:01',
//   venue_id: 'V0-001-000212894-7',
//   tz_city: null,
//   stop_time: null,
//   venue_name: 'Kimbro\'s Cafe',
//   venue_url: 'http://eventful.com/franklin/venues/kimbros-cafe-/V0-001-000212894-7?utm_source=apis&utm_medium=apim&utm_campaign=apic' }
// 	return event;

// 	platforms: [{tag:String,id:String}], //Id's for different platforms.
// 	date: Date,
// 	ticket: {type:db.Schema.Types.ObjectId,ref:'Ticket'},
// 	private: {type: Boolean, default: false},
// 	featured: {type:Boolean, default: false},
// 	age: {type: Number,max: 21, default: 21},
// 	name: String,
// 	venue: {type:db.Schema.Types.ObjectId,ref:'Venue'},
// 	users: [{type:db.Schema.Types.ObjectId, ref: 'User'}],  //users going
// 	artists: {
// 		headers:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
// 		openers:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}]
// 	}


	return: {
		platforms: [{
			tag: 'eventful',
			id: event.id
		}],
		date: moment(event.start_time,moment.ISO_8601).utc().format(),
		ticket: {

		}
	}



}

module.exports.parseVenue = function(venue){

}