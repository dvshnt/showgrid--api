
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
var reverbnation = require('./scrapers/reverbnation');



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
			/*
				getting specific venues and artists is useless here because entire event objects are contained within the find requests.
				to update data from jambase just query the find scrapers with zipcode or city again and it will update the venues and events accordingly.
			*/
		},
		'filters': {
			'venue' : [jambase.parseVenue],
			'event' : [jambase.parseEvent],
			'artist' : [jambase.parseArtist]
		}
	},


	/*
		40-50% of all data from eventful seems to be scraped from reverbnation because the event/venues link back to reverb
		with the sponsor message "find out more at reverbnation!"
		
	*/
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

	/*
	all events/shows in reverbnation are linked directly with the venues, there is not search functionality for events. 
		
	to update data from reverbnation just send the search query for the venues and it auto update all the events!

	*/
	'reverbnation' : {
		'find': {
			'venue' : reverbnation.findVenues,
		},
		'get' : {
			'venue' : reverbnation.getVenue,
		},
		'filters' : {
			'venue' : [reverbnation.parseVenueFindItem],
		}		
	},


	//TODO...
	/*
		facebook contains 99% of all shows artists and venues, validating data with facebook is guaranteed a complete and total scrape of 
		all social media present venues shows and artists.

		in fact, from my research I could even argue that reverbnation actually pulls some of its venue data from facebook itself since some of the
		venue data such as events are labled with fb_
	*/
	'facebook' : {

	}
}