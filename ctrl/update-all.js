/* wrapper config file for updateAll.js */


/*
NOTICE

ticketfly: 
	get venues by country : radius = -1
	get venues by state : radius = 0
	get venues by zipcode city : radius > 0

*/

//var morgan = require('morgan');
var api_cfg = require('../data/config').apis;
var update = require('../data/updateAll.js');
var fb = require('../data/scrapers/facebook')
var Promise = require('bluebird');

var fillers = require('../data/fillers');
require('colors');
var fb_key = null;




var q_size = 1000;
var eventful_max = 1000; //eventful has too much data, most of it seems to be irrelevant and is sorted by popularity.




Promise.longStackTraces();
/*

EVENT NAME = [^\w\s,'&\/\|]
VENUE NAME  = [^\w\s,'&]
ARTIST NAME = [^\w\s,'&]

*/


fb.getKey().then(function(fb_key){
	return update({
		//overwrite: true,
		//sync: false, // default is true, if set to false will only save cache (if save_cache set to true)
		filter_empty: true, //try and only save venues with events, other venues are useless
		min_gps_status: 2, //this or greater location status will be updated automatically, otherwise will try and find gps (again)

		//use preexisting cache to sync/merge
		use_cache: true,
		save_cache: false,

		//if these words are found in a venue name, that venue will be ignored.
		bad_words: [
			'department',
			'police',
			'library',
			'church',
			'postal code'
		],

		//parameters
		params: {
			zip: '37201',
			country: 'US',
			radius: 15,
			query_size: q_size,
			sort: 'popularity',
			start_date: new Date(), //now
			end_date: new Date(Date.now() + 2.62974e9*6), //6 months from now.
		},

		/*
			override parameters for individual scrapers by adding a 2nd params object.. e.g -> 'eventful': {params:{query_size:500}}

		*/


		//supported platforms 
		platforms: {
			'eventful': {
				params: {
					key: api_cfg.eventful.keys[0],
				},
				endpoints : {
					'venue':{
						host_city: 'nashville',
						query_size: eventful_max,
						get_delay: 200, //try not to scrape over 500 venues...otherwise ECONN RESET ERR.
						filter_delay: 350, //try not to scrape over 500 venues...otherwise ECONN RESET ERR.
						get_empty: false, //DO NOT SCRAPE VENUES THAT ARE EMPTY.
					}
				},
			},

			'ticketfly': {
				endpoints: {'venue':{
					radius: 0
				}},
			},

			'facebook': {

				endpoints: {'venue':null},
				params: {
					filter_delay: 300,
					key: fb_key
				}
			},

			'reverbnation' : {
				endpoints : {
					'venue' : {
						get_delay: 400,
						filter_delay: 500
					}
				},
				params: {
					query_size: 500,
				}
			},

			'jambase' : {
				endpoints : {'venue':null},
				params: {
					get_delay: 600,
					key : api_cfg.jambase.keys[3],
				},
			}
		},
	})
}).then(function(){
	console.log('ALL DONE :)'.bold.cyan)
	process.exit(0)
})
