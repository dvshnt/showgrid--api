
var _ = require('lodash');
var scrapers;


/*
API Scrapers/Strategies

Remmember to add a parser when u add a new scraper module

each strategy must have 3 parsers
*/



var jambaseVenue = function(data){
	console.log('lets filter some of that data now!',data);
	return data;
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






















module.exports = scrapers;


//check if everything is OK
(function(){
	_.each(scrapers,function(e,tag){
		if(_.size(e.parsers) != 3){
			console.error('SCRAPERS INIT: ',tag,' has ', _.size(e.parsers) ,' parsers')
		}
	})
})();