

var Promise = require('bluebird')

var request = Promise.promisify(require('request').get);


var _ = require('lodash');
var p = require('./pFactory');

var places_api  = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
var geo_api  = 'https://maps.googleapis.com/maps/api/geocode/json';
var key = 'AIzaSyDxX-LXG4B1H6LRNxHNCKJErQPyeK2KW7o';

module.exports = p.sync(function(name,addr){

	if(addr.address != null){
		address = addr.address.trim();
	}

	//use geo api to find approximate location and then use the gps to find the exact place location
	if(addr.gps == null && addr.address != null){
		return geocode(addr).then(geoplace);
	//use address and gps and name to find exact location
	}else if(addr.gps != null){
		return geoplace(addr);
	}

	var geoplace = request(places_api+ "?" +"keyword=" + addr.address + "&key="+key+'&sensor=false').then(function(loc,err){
		if(loc.formatted_address == null || loc.geometry == null) return(loc);
		return{
			address: loc.formatted_address,
			gps: [loc.geometry.location.lat,loc.geometry.location.lng]
		}
	});

	var geocode = request(places_api+ "?" +"keyword=" + addr.address + "&key="+key+'&sensor=false').then(function(loc,err){
		if(loc.results == null) return(loc);
		return{
			address: loc.formatted_address,
			gps: [results[0loc.geometry.location.lat,loc.geometry.location.lng]
		}
	});
});