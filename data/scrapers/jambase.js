
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








module.exports.getVenues = function(opt){

	var url = cfg.api+'/venues';


	if(opt.zip != null){
		var q = qs.stringify({zipCode: opt.zip,api_key:key,page:0});
	}


	function get(resolve,reject){
		request.get({
			url : url + '?' + q,
			json: true
		},function(err,res,data){
			console.log('got raw data !');
			resolve(data.Venues);
		});
	}
	return new Promise(get);
}


//GET ARTISTS
module.exports.getArtists = function(opt){
	// var url = cfg.api+'/shows';

	// if(opt.zip != null){
	// 	var q = qs.stringify({zipCode: opt.zip,api_key:key,page:0});
	// }

	// function get(res,rej){
	// 	res(['test get artists']);	
	// }

	// return new Promise(get);
}



//GET SHOWS
module.exports.getEvents = function(opt){



	var url = cfg.api+'/events';


	if(opt.zip != null){
		var q = qs.stringify({
			zipCode: opt.zip,
			api_key:key,page:0
		});
	}


	function get(resolve,reject){
		request.get({
			url : url + '?' + q,
			json: true
		},function(err,res,data){
			console.log('got raw data !');
			resolve(data.Venues);
		});
	}
	return new Promise(get);


}





//PARSE A VENUE
module.exports.parseVenue = function(venue){
	return{
		name: venue.Name,
		platform: {
			tag: 'jambase',
			id: venue.Id
		},
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
module.exports.parseArtist = function(venue){
	// return new data.Artist({
		
	// });	
}




//PARSE A SHOW
module.exports.parseEvent = function(event){
	return{
		name: null
		
			tag: 'jambase',
			id: venue.Id
		},
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
