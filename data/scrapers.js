
var _ = require('lodash');
var scrapers;
var data = require('./data');
var Promise = require('promise');
/*
API Scrapers/Strategies

Remmember to add a parser when u add a new scraper module

each strategy must have 3 parsers
*/




//Validates Model against database, updates if nessesary and 






var jambaseVenue = function(data){
	var parsed_data =  _.map(data.venues,function(venue){
			return {
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
			}
	});
    
	return new Promise(function(res,rej){
		res(parsed_data)
	});
}






var jambaseArtist = function(data){
	return data;
}





var jambaseShow = function(){
	return data;
}


scrapers = {
	'jambase' : {
		'module': require('./scrapers/jambase'),
		'parsers': {
			'venue'  : jambaseVenue,
			'artist' : jambaseArtist,
			'show'   : jambaseShow
		},
	}
}





// _.each(scrapers,function(val,key){
// 	_.each(val.parsers,function(val,key){
// 		val.parsers = val.parsers(data).then(Validator);
// 	});
// });
















module.exports = scrapers;


//check if everything is OK
(function(){
	_.each(scrapers,function(e,tag){
		if(_.size(e.parsers) != 3){
			console.error('SCRAPERS INIT: ',tag,' has ', _.size(e.parsers) ,' parsers')
		}
	})
})();