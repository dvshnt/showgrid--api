var db = require('../data');
var cfg = require('../data_config.json').apis.jambase;

var request = require('request');
//var bodyParser = require('body-parser');

//var Promise = require('promise');

var cities = require('cities');

var querystring = require('querystring');










//GET VENUES BY ZIP

var getVenuesByZip = function(zip){

	var url = cfg.api+'/venues';
	var qs = {zipCode: zip,api_key:cfg.keys[0]}

	function get(resolve,reject){
		console.log('GET')
		request.get({
			url : url,
			qs: qs,
			json: true
		},function(err,res,data){
			console.log('got raw data !:',data);
			resolve(data);
		});		
	}


	return new Promise(get);
}






//GET SHOWS

function getShows(zip){
	function get(resolve,reject){
		
		resolve(['no data yet!']);
				
	}
	return new Promise(get);
}



//GET ARTISTS

function getArtists(zip){
	function get(resolve,reject){
		
		resolve(['no data yet!']);
				
	}
	return new Promise(get);
}




module.exports = {
	'venue' : function(opt){
		console.log('get venue',opt)
		if(opt.zip != null){
			return getVenuesByZip(opt.zip);
		}
		else{
			return 
		}
	},
	'show': getShows,
	'artist': getArtists
}





