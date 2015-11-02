//dependencies
var _ = require('lodash') //different types of array helpers
var Artist = require('../models/artist');
var Venue = require('../models/venue');
var util = require('../util');
var null_filter = util.null_filter;
var p = require('../pFactory');
var Promise = require('bluebird')

//default bad words
var bad_words = [
	'library',
	'church',
	'postal code',
]

var filter_empty = true;


//filter bad words from the parameters
function filterBad(data){
	data['venue'] = _.filter(data['venue'],function(venue){
		if(venue == null) return false
		var bad = false;
		_.each(bad_words,function(regexp){
			if(venue.name.match(regexp) != null){
				bad = true
				return false
			}
		})
		return !bad;
	});
	return p.pipe(data);
}

//do not save venues without events.
function filterEmpty(data){
	if(filter_empty == true){
		data['venue'] = _.filter(data['venue'],function(venue){
			if(venue.events != null && venue.events.length > 0) return true;
			return false ;
		});		
	}

	return p.pipe(data);
}


var logMem = require('../util').logMem;
//var heapdump = require('heapdump'); dump heap to debug for memory leaks...thankfully i know the source well enough to refactor the leaky parts without having to crawl through the "dumps"...

var min_gps_status = 2; //default min gps status



/*
syncData : MAIN SYNC CONTROLLER FUNCTION

this function has not been properly refactored and is not very pretty but i will try and explain the gist of what is happening in this file...

essentially what happens is that parsed documents sent into the synData function 
get validated and created into models, some venues get filtered out based on settings
below or if their validation with the data/models/{model_name} fails. Artists get extracted
from the venues and saved under a seperate and their mongodb objectId get pushed back into the venue object as a reference.
that object is then checked against entries in the database and merged or created as new.

each document has a platform id which is the id that the document is stored under from all the different apis
when venues are checked against the database they are first checked by objectId because those are indexed.
if venues with same ids are found the model is saved, otherwise the document is checked by platform id -> gps -> (any other identification patterns) and saved/merged.

match and merge functions are used to sync w/

{
	docs: array of parsed documents
	overwrite: overwrite any old venue data with this data.
	min_gps_status: minimum gps status needed to sync venues (1/2/3)
		(0 : failed to find any gps data)
		(1 : found as address but not a gps "places" location)
		(2 : found as both valid address and a valid registered place)
	filter_empty: dont sync venues with empty event arrays
	bad_words: (dont sync venues that have words in [bad_words] )
}

*/






/* SPLIT THE DATA SET INTO ARRAYS 
now the dataset in the pipe will look like this:

data : {
	venues: [], 
	events: [], //this actually gets flipped so all events are moved to venues (this is posiblebecause if an event is passed to the sync function it must contain the reference to its venue)
	artists: [].
}
*/

var raw_types = ['venue','event','artist'];

var splitByType = function(dataset){
	dataset = null_filter(dataset);

	//console.log(dataset);
	var dat = {};
	_.each(raw_types,function(type){
		dat[type] = [];
	});

	_.each(dataset,function(doc){
		if(dat[doc.is] == null){
			console.log('parameter ["is"] ERR:'.bgRed.bold,doc.is,'is not a type of',raw_types,doc.name);
			return;
		}

		dat[doc.is].push(doc);
		delete doc.is;
	});

	//Sort dats is required in order to properly filter
	_.sortBy(dat,function(dat,type){
		if(type == 'event') return 0;
		if(type == 'venue') return 2;
		if(type == 'artist') return 1;
	})

	return p.pipe(dat);
};





/* FLIP ALL DATA PASSED with "{type:'event'}" and make is so that its   {event.venue : events:[origional event object] } */
var flipEvents = function(dat){
	//flip events to display venues on top
	var venues = _.map(dat['event'],function(e){
		var venue = _.clone(e.venue);
		e.venue = null;
		delete e.venue;
		var event = e;
		venue.events = [event];
		return venue;
	});
	//console.log(util.inspect(dat, {showHidden: false, depth: null}));
	//console.log(venues);
	dat['venue'] = dat['venue'].concat(venues);
	delete dat['event'];
	return p.pipe(dat);
}






var syncData = function(opt){
	var dataset = opt.docs;
	var overw = opt.overwrite
	var status = opt.min_gps_status
	var filter_e = opt.filter_empty
	var badwords = opt.bad_words


	bad_words = opt.badwords
	bad_words = _.map(bad_words,function(word){
		return new RegExp(word,'i')
	});

	if(filter_e == false) filter_empty = false;
	min_gps_status = status || min_gps_status;
	overwrite = overw;




	console.log('SYNC'.bgBlue,dataset.length.toString().bgBlue);


	return splitByType(dataset)
	.then(filterEmpty) //just bad data filters
	.then(filterBad) //just bad data filters


	//sync artists.
	.then(function(dat){

		var total_n = dat['artist'].length, total = 0;

		return Promise.map(dat['artist'],function(raw_artist_json){
			return Artist.Sync(raw_artist_json).finally(function(){
				console.log('synced artist',++total,'/',total_n,'\n\n');
			})
		},{concurrency: 1})
		.then(function(){
			return p.pipe(dat)
		})
	}) //node.js...NEVER AGAIN


	//event.venue -> venue.events
	.then(flipEvents)


	//sync venues
	.then(function(dat){

		var total_n = dat['venue'].length, total = 0;

		return Promise.map(dat['venue'],function(raw_venue_json){
			return Venue.Sync(raw_venue_json,overwrite).finally(function(){
				console.log('synced venue',++total,'/',total_n,'\n\n');
			})
		},{concurrency: 1}) //node.js...NEVER AGAIN
		.then(function(){
			return p.pipe(dat)
		})
	})

	.tap(function(total){console.log('DONE W/ SYNC'.bgCyan)})
}


module.exports.setOverwrite = function(ow){
	overwrite = ow;
}


module.exports = syncData