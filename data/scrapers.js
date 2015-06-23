
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


/*

Scraper filters are ignorant of promises if they get called from within the update module.
Filters are checked if they are a promises by checking if "then" is a method, so make sure you dont add then as an project property!
Calling scrapers from this raw module can lead to unexpected results, make sure you always call it from the update module.

*/

module.exports =  {
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
		'filters': {
			'venue' : [jambase.parseVenue],
			'event' : [jambase.parseEvent],
			'artist' : [jambase.parseArtist]
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
		'filters' : {
			'event' : [eventful.parseEvent],
			'venue' : [eventful.parseVenue],
			'artist' : [eventful.parseArtist] 
		}
	},
	// 'reverbnation' : {
	// 	// 'find': {
	// 	// 	'venue' : reverbnation.findVenues,
	// 	// 	'event' : reverbnation.findEvents,
	// 	// },
	// 	// 'get' : {
	// 	// 	'event' : reverbnation.getEvent,
	// 	// 	'venue' : reverbnation.getVenue,
	// 	// 	'artist' : reverbnation.getArtist
	// 	// },
	// 	// 'parse' : {
	// 	// 	'event' : reverbnation.parseEvent,
	// 	// 	'venue' : reverbnation.parseVenue,
	// 	// 	'artist' : reverbnation.parseArtist 
	// 	// }		
	// }
}