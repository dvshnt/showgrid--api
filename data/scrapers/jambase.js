/*

JAMBASE API 

*/


var cfg = require('../data_config.json').apis.jambase;
var request = require('request');
//var cities = require('cities');
var Promise = require('bluebird');
var qs = require('querystring');
var moment = require('moment');

var p = require('../pFactory')

var _ = require('lodash')


var colors = require('colors');

//Promise.longStackTraces();

//GET VENUES




var get = function(type,opts,cb){

}



//FIND VENUES
module.exports.findVenues = function(opt){
	var url = cfg.api+'/venues';
	var q = {api_key:opt.key,page:0}

	if(opt.zip != null) q.zipCode = opt.zip;
	if(opt.radius != null) q.radius = opt.radius;

	console.log(url + '?' + qs.stringify(q))

	function get(resolve,reject){
		request.get({
			url : url + '?' + qs.stringify(q),
			json: true
		},function(err,res,data){
				
			if(data.Venues == null){
				console.log("Jambase findVenues ERR: ".bgRed.bold,data)
				return resolve(null);
			}
			if(data == null){
				return resolve(null);
			}
			resolve(data.Venues);
		});
	}
	return new Promise(get);
}







//FIND SHOWS
module.exports.findEvents = function(opt){

	var url = cfg.api+'/events';
	var q = {api_key:opt.key,page:0};

	if(opt.zip != null) q.zipCode = opt.zip;
	if(opt.radius != null) q.radius = opt.radius;


	function get(resolve,reject){
		request.get({
			url : url + '?' + qs.stringify(q),
			json: true
		},function(err,res,data){
			if(data == null){
				return resolve(null);
			}

			if(data.Events == null){
				console.log("Jambase findEvents ERR: ".bgRed.bold,data)
				return resolve(null);
			}

			console.log('got raw events data !');
			resolve(data.Events);
		});
	}
	return new Promise(get);
}











Promise.longStackTraces();


//PARSE A VENUE
module.exports.parseVenue = p.sync(function(venue){
	
	var v = {
		is: 'venue',
		name: venue.Name,
		platforms:[{name:'jambase',id:venue.Id}],
		location: {
			address: venue.Address,
			city: venue.City,
			zip: venue.ZipCode,
			statecode: venue.StateCode,
			countrycode: venue.CountryCode,
			gps: [venue.Latitude,venue.Longitude],
		},

	};

	v.links = venue.Url.length != null ? venue.Url : [venue.Url];
	this.resolve(v);
	return this.promise;
})




//PARSE AN ARTIST
module.exports.parseArtist = function(artist){
	return{
		is: 'artist',
		platforms:[{name:'jambase',id:artist.Id}],
		name: artist.Name,
	};		
}




//PARSE A SHOW
module.exports.parseEvent = p.sync(function(event){
	var e = {
		is: 'event',
		platforms:[{name:'jambase',id:event.Id}],
		date: moment(event.Date,moment.ISO_8601).utc().format(), //ISO 8601 +0.00 UTC DATE FORMAT ONLY!
		name: event.Name,
		age: null,
		tickets: [{
			url: event.ticketUrl
		}],
		artists: {
			//everything defaults to headliners for jambase
			headliners: (function(){
				_.each(event.Artists,function(artist){
					return module.exports.parseArtist(artist);
				});				
			})()
		}
	};


	module.exports.parseVenue(event.Venue).then(function(v){
		e.venue = v;
		this.resolve(e);
	}.bind(this));

	return this.promise;
});