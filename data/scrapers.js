
var _ = require('lodash');
var scrapers;
var data = require('./data');
var Promise = require('bluebird');


/*
API Scrapers/Strategies

Remmember to add a parser when u add a new scraper module

each strategy must have 3 parsers
*/



var getter_count = 3;
var parser_count = 3














var jambase = require('./scrapers/jambase');
var eventful = require('./scrapers/eventful');


//SCRAPER HOOKS
scrapers = {
	'jambase' : {
		'get' : {
			'venue' : jambase.getVenues,
			'event' : jambase.getEvents,
			//'artist' : jambase.getArtists
		},
		'parse': {
			'venue' : jambase.parseVenue,
			'event' : jambase.parseEvent,
			'artist' : jambase.parseArtist
		}
	},
	'eventful' : {
		'get' : {
			'event' : eventful.getEvents,
			'venue' : eventful.getVenues,
			'artist' : eventful.getArtists
		},
		'parse' : {
			'event' : eventful.parseEvent,
			'venue' : eventful.getVenue,
			'artist' : eventful.getArtist 
		}
	}
}



























//DONT TOUCH THIS:
/*-----------------------------------------------------*/


function _parse(parser){
	return function(data){
		var models = _.map(data,function(obj){
			return parser(obj);
		});
		
		return new Promise(function(res,rej){
			res(models)
		});
	}
}



//check if everything is OK
(function(){
	_.each(scrapers,function(e,tag){
		if(_.size(e.parse) != parser_count){
			console.error('SCRAPERS INIT: ',tag,' has ', _.size(e) ,' parsers')
		}
		if(_.size(e.get) != getter_count){
			console.error('SCRAPERS INIT: ',tag,' has ', _.size(e) ,' getters')
		}
	})
})();



//Module Factory


_.each(scrapers,function(e,tag){
	module.exports[tag] = {};
	_.each(e.get,function(getter,gtag){
		module.exports[tag][gtag] = function(opt){
			//console.log(e.get[ptag])
			if(e.parse[gtag] == null) return console.error('invalid parser / getter pair, check your scraper hooks!')
			if(getter == null) return console.error('invalid getter', gtag);
			if(e.parse[gtag] == null) return console.error('invalid parser',gtag);

			return getter(opt).then(_parse(e.parse[gtag]))
		}
	}.bind(this));
}.bind(this));










