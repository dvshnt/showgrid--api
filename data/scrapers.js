
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
		'find': {
			'venue' : jambase.findVenues,
			'event' : jambase.findEvents,
		},
		'get' : {
			'venue' : jambase.getVenue,
			'event' : jambase.getEvent,
			'artist' : jambase.getArtist
		},
		'parse': {
			'venue' : jambase.parseVenue,
			'event' : jambase.parseEvent,
			'artist' : jambase.parseArtist
		}
	},
	'eventful' : {
		'find': {
			'venue' : eventful.findVenues,
			'event' : eventful.findEvents,
		},
		'get' : {
			'event' : eventful.getEvent,
			'venue' : eventful.getVenue,
			'artist' : eventful.getArtist
		},
		'parse' : {
			'event' : eventful.parseEvent,
			'venue' : eventful.parseVenue,
			'artist' : eventful.parseArtist 
		}
	},
	'reverbnation' : {
		'find': {
			'venue' : reverbnation.findVenues,
			'event' : reverbnation.findEvents,
		},
		'get' : {
			'event' : reverbnation.getEvent,
			'venue' : reverbnation.getVenue,
			'artist' : reverbnation.getArtist
		},
		'parse' : {
			'event' : reverbnation.parseEvent,
			'venue' : reverbnation.parseVenue,
			'artist' : reverbnation.parseArtist 
		}		
	}
}



























//DONT TOUCH THIS:
/*-----------------------------------------------------*/


function _parse(parser){
	return function(data){
		if(data.length != null){
			var models = _.map(data,function(obj){
				return parser(obj);
			});			
		}else{
			var models = [parser(data)];
		}

		
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
	module.exports[tag] = {get:{},find:{}};


	_.each(e.get,function(getter,gtag){
		module.exports[tag].[gtag] = function(opt){
			//console.log(e.get[ptag])
			if(e.parse[gtag] == null) return console.error('invalid parser / finder pair, check your scraper hooks! :',tag,gtag)
			if(getter == null) return console.error('invalid getter', gtag);
			if(e.parse[gtag] == null) return console.error('invalid parser',gtag);

			return getter(opt).then(_parse(e.parse[gtag]))
		}
	}.bind(this));

	_.each(e.find,function(finder,ftag){
		module.exports[tag].find[ftag] = function(opt){
			//console.log(e.get[ptag])
			if(e.parse[gtag] == null) return console.error('invalid parser / getter pair, check your scraper hooks! :',tag,gtag)
			if(finder == null) return console.error('invalid getter', gtag);
			if(e.parse[gtag] == null) return console.error('invalid parser',gtag);

			return finder(opt).then(_parse(e.parse[ftag]))
		}
	}.bind(this));



}.bind(this));










