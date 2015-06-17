var db = require('../data');
var cfg = require('../data_config.json').apis.jambase;

var request = require('request');
//var bodyParser = require('body-parser');

//var Promise = require('promise');

var cities = require('cities');

var qs = require('querystring');



var key = cfg.keys[0];



var Promise = require('promise');


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
			console.log('got raw data !:');
			resolve(data.venues);
		});		
	}


	return new Promise(get);
}


//GET ARTISTS
module.exports.getArtists = function(opt){

	function get(res,rej){
		res(['test get artists'])	
	}

	return new Promise(get);
}



//GET SHOWS
module.exports.getShows = function(opt){

	function get(res,rej){
		res(['test get shows'])
	}

	return new Promise(get);
}





//PARSE A VENUE
module.exports.parseVenue = function(venue){
	return new data.Venue({
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
			gps: (function(){
				if(this.Latitude == 0 && this.Longitude == 0) return null
				else return {lat: this.Latitude,lon: this.Longitude}
			})(venue)
		},
		url: venue.Url,
	});	
}




//PARSE AN ARTIST
module.exports.Artist = function(venue){
	return new data.Artist({
		
	});	
}




//PARSE A SHOW
module.exports.parseShow = function(venue){
	return new data.Show({
		
	});	
}
