
var cfg = require('../data_config.json').apis.jambase;

var request = require('request');
//var bodyParser = require('body-parser');

//var Promise = require('promise');

var cities = require('cities');

var qs = require('querystring');


process.on('uncaughtException', function (error) {
   console.dir(error);
});


var key = cfg.keys[1];

var db = require('../data.js');


var Promise = require('bluebird');
Promise.longStackTraces();

//GET VENUES




var get = function(type,opts,cb){
	var url = cfg.api+'/'+type;
	var q = {api_key:key,page:0}

	if(opt.zip != null) q.zipCode = opt.zip;
	if(opt.radius != null) q.radius = opt.radius;


	function get(resolve,reject){
		request.get({
			url : url + '?' + qs.stringify(q),
			json: true
		},cb.bind(this));
	}
	return new Promise(get);
}



module.exports.getVenues = function(opt){

	return get('venues',opt,function(err,res,data){
		console.log('got raw venues data !',resolve);
		resolve(data.Venues);
	});
}


//GET SHOWS
module.exports.getEvents = function(opt){
	var url = cfg.api+'/events';
	var q = {api_key:key,page:0};

	if(opt.zip != null) q.zipCode = opt.zip;
	if(opt.radius != null) q.radius = opt.radius;


	function get(resolve,reject){
		request.get({
			url : url + '?' + qs.stringify(q),
			json: true
		},function(err,res,data){
			console.log('got raw data !');
			resolve(data.Events);
		});
	}
	return new Promise(get);
}














//PARSE A VENUE
module.exports.parseVenue = function(venue){
	return{
		name: venue.Name,
		platforms: [{
			tag: 'jambase',
			id: venue.Id
		}],
		location: {
			address: venue.Address,
			city: venue.City,
			zip: venue.ZipCode,
			statecode: venue.StateCode,
			countrycode: venue.CountryCode,
			gps: {lat: venue.Latitude,lon: venue.Longitude}
		},
		url: venue.Url,
	};	
}




//PARSE AN ARTIST
module.exports.parseArtist = function(artist){
	return{
		platforms: [{
			type: 'jambase',
			id: artist.Id,
		}],
		name: artist.Name,
	};		
}




//PARSE A SHOW
module.exports.parseEvent = function(event){
	return{
		platforms: [{
			type: 'jambase',
			id: event.Id,
		}],
		date: dateParser('jambase',event.Date),
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