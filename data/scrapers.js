
var _ = require('lodash');
var scrapers;
var data = require('./data');
var Promise = require('promise');


/*
API Scrapers/Strategies

Remmember to add a parser when u add a new scraper module

each strategy must have 3 parsers
*/



var getter_count = 3;
var parser_count = 3














var jambase = require('./scrapers/jambase');


//SCRAPER HOOKS
scrapers = {
	'jambase' : {
		'get' : {
			'venue' : jambase.getVenues,
			'show' : jambase.getShows,
			'artist' : jambase.getArtists
		},
		'parse': {
			'venue' : jambase.parseVenue,
			'show' : jambase.parseShow,
			'artist' : jambase.parseArtist
		}
	}
}




























/*-----------------------------------------------------*/
//DONT TOUCH THIS:

function _parse(parser){
	return function(data){
		console.log(data);
		var models = _map(data,function(obj){
			return parser(obj);
		});
		console.log('IN PARSER',models)
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
	_.each(e.parse,function(parser,ptag){
		module.exports[tag][ptag] = function(opt){
			return e.get[ptag](opt).then(_parse(parser))
		}
	}.bind(this));
}.bind(this));










