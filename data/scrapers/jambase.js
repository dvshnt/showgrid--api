/*

JAMBASE API 

*/


var cfg = require('../data_config.json').apis.jambase;
var request = require('request');
//var cities = require('cities');
var Promise = require('bluebird');
var qs = require('querystring');
var moment = require('moment');







//Promise.longStackTraces();

//GET VENUES




var get = function(type,opts,cb){

}



module.exports.getVenues = function(opt){
	var url = cfg.api+'/venues';
	var q = {api_key:opt.key,page:0}

	if(opt.zip != null) q.zipCode = opt.zip;
	if(opt.radius != null) q.radius = opt.radius;


	function get(resolve,reject){
		request.get({
			url : url + '?' + qs.stringify(q),
			json: true
		},function(err,res,data){
			console.log('got raw venue data !');
			resolve(data.Venues);
		});
	}
	return new Promise(get);
}


//GET SHOWS
module.exports.getEvents = function(opt){
	var url = cfg.api+'/events';
	var q = {api_key:opt.key,page:0};

	if(opt.zip != null) q.zipCode = opt.zip;
	if(opt.radius != null) q.radius = opt.radius;


	function get(resolve,reject){
		request.get({
			url : url + '?' + qs.stringify(q),
			json: true
		},function(err,res,data){
			console.log('got raw events data !');
			resolve(data.Events);
		});
	}
	return new Promise(get);
}














//PARSE A VENUE
module.exports.parseVenue = function(venue){
	return{
		name: venue.Name,
		platforms: {'jambase': venue.Id},
		location: {
			address: venue.Address,
			city: venue.City,
			zip: venue.ZipCode,
			statecode: venue.StateCode,
			countrycode: venue.CountryCode,
			gps: {lat: venue.Latitude,lon: venue.Longitude},
		},
		links: venue.Url,
	};	
}




//PARSE AN ARTIST
module.exports.parseArtist = function(artist){
	return{
		platforms: {'jambase': artist.Id},
		name: artist.Name,
	};		
}




//PARSE A SHOW
module.exports.parseEvent = function(event){
	return{
		platforms: {'jambase': event.Id},
		date: moment(event.Date,moment.ISO_8601).utc().format(), //ISO 8601 +0.00 UTC DATE FORMAT ONLY!
		name: event.Name,
		age: null,
		venue: module.exports.parseVenue(event.Venue),
		ticket: {
			url: event.ticketUrl
		},
		artists: {
			//everything defaults to headliners for jambase
			headliners: (function(){
				_.each(event.Artists,function(artist){
					return module.exports.parseArtist(artist);
				});				
			})()
		}
	};
}