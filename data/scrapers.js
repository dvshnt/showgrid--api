

var jambase = require('./scrapers/jambase');
var eventful = require('./scrapers/eventful');
var reverbnation = require('./scrapers/reverbnation');
var facebook = require('./scrapers/facebook');
var ticketfly = require('./scrapers/ticketfly');


//SCRAPER HOOKS


/*

Scraper filters are ignorant of promises if they get called from within the update module.
Filters are checked if they are a promises by checking if "then" is a method, so make sure you dont add then as an project property!
Calling scrapers from this raw module can lead to unexpected results, make sure you always call it from the update module.

*/



var scrapers = {

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
			'venue' : jambase.parseVenue,
			'event' : jambase.parseEvent,
			'artist' : jambase.parseArtist
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
			'event' : eventful.parseEvent,
			'venue' : eventful.parseVenue,
			'artist' : eventful.parseArtist 
		}
	},

	/*

	all events/shows in reverbnation are linked directly with the venues, there is not search functionality for events. 
	to update data from reverbnation just send the search query for the venues and it should auto update all the events.

	*/
	'reverbnation' : {
		'find': {
			'venue' : reverbnation.findVenues,
		},
		'get' : {
			'venue' : reverbnation.getVenue,
		},
		'filters' : {
			'venue' : reverbnation.parseVenueFindItem,
		}		
	},


	/*
		facebook has a very nice robust api for searching directly for events and venues.

		searching for either events will link the event venues with the event
		and searching for venues will find 100 most recent events for each venue.

	*/
	'facebook' : {
		'find': {
			'venue' : facebook.findVenues,
			'event' : facebook.findEvents,
		},
		'get' : {
			//'venue' : facebook.getVenue,
			//'event' : facebook.getEvent,
		},
		'filters' : {
			'venue' : facebook.parseVenue,
			'event' : facebook.parseEvent
		}	
	},


	/*
		notice:

		ticketfly has no search based on location, so in order to find events we have to make sure all venues are already in the database.

		updating venues will update all 8000 venues.

		searching for events will search venues like normal but through home database, and then use the ID
		to get events for each in a specific zipcode or GPS location.

	*/
	'ticketfly' : {
		'find': {
			'venue' : ticketfly.getVenues,
			'event' : ticketfly.findEvents
		},
		'get':{

		},
		'filters' : {
			'venue' : ticketfly.parseVenue,
			'event' : ticketfly.parseEvent
		}
	}
}




module.exports = scrapers;

