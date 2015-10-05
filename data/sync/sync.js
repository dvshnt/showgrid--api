/*
Sync Functions



syncArtist //a way to sync the artist
syncVenue //a long way to sync a venue
syncVenueById //a fast way to sync a venue

*/
// var heapdump = require('heapdump');

var sync_delay = 200;



//dependencies
var _ = require('lodash') //different types of array helpers
,db = require('../data') //database functions
,Promise = require('bluebird')  //bluebird Promises used to pipe data through all the different functions since everything is async (callback managment)
,fuzzy = require('fuzzyset.js') //fuzzy matching for finding models that are similar.
,p = require('../pFactory.js') //promise factory shortucts.
,colors = require('colors') //log statments in the console with color
,util = require('util') //nodes util
,log = require('../util').log //log imported from homemade utils
,merge = require('./merge') //merge functions
,match = require('./match') //match functions
,gps = require('../gps') //google gps validation
,addressGPS = gps.get //functions from the gps file
,parseGPS = gps.toArray //functions from the gps file
,formatGPS = gps.toObj //functions from the gps file
,null_filter = require('../util').null_filter //remove any items that are null from an array
,trimName = require('../util').trimName; //some handy name trimming, mod as you see fit.


//validate a single document
var validateOne = p.sync(function(raw_doc,type){

	if(!_.isFunction(raw_doc.validate)) raw_doc = new db[type](raw_doc)
	
	


	raw_doc.validate(function(err){
		if(err){
			console.log(type,'validation ERR'.bold.red.bgBlue,err.message);
			console.log()
			raw_doc = undefined;
			return this.resolve(null);
		}else{
			return this.resolve(raw_doc.toJSON());
		} 
	}.bind(this));
	
	return this.promise;
});


module.exports.validateOne = validateOne;



//validate artist pipe
var validateArtist = function(raw_doc){
	return validateOne(raw_doc,'artist');	
};


//validate  all venues from the datatype
var validateVenues = function(dataset){
	return Promise.settle(_.map(dataset['venue'],function(venue){
		return validateVenue(venue);
	}))
	.then(function(results){
		dataset['venue'] = null_filter(_.map(results,function(r){
			if(r.isFulfilled()){
				return r.value();
			}else return null;
		}));
		return p.pipe(dataset);
	})
}



//validate venue pipe, just a shortcut for validateOne(document_json,type)
var validateVenue = function(raw_doc){
	return validateOne(raw_doc,'venue');	
};



//document types to be passed to the sync function (at the very bottom)
var raw_types = ['venue','event','artist'];







/* SPLIT THE DATA SET INTO ARRAYS 
now the dataset in the pipe will look like this:

data : {
	venues: [], 
	events: [], //this actually gets flipped so all events are moved to venues (this is posiblebecause if an event is passed to the sync function it must contain the reference to its venue)
	artists: [].
}



*/
var splitByType = function(dataset){
	dataset = null_filter(dataset);

	//console.log(dataset);
	var typeset = {};
	_.each(raw_types,function(type){
		typeset[type] = [];
	});

	_.each(dataset,function(doc){
		if(typeset[doc.is] == null){
			console.log('parameter ["is"] ERR:'.bgRed.bold,doc.is,'is not a type of',raw_types,doc.name);
			return;
		}

		typeset[doc.is].push(doc);
		delete doc.is;
	});

	//Sort typesets is required in order to properly filter
	_.sortBy(typeset,function(dat,type){
		if(type == 'event') return 0;
		if(type == 'venue') return 2;
		if(type == 'artist') return 1;
	})

	return p.pipe(typeset);
};










/* EXTRACT THE ARTISTS FROM ALL EVENTS, AND SAVE THEM TO THE DATABASE */
var extractArtists = function(types){


	function sync(artist){
		return validateArtist(artist).then(function(a){
			if(a == null) return p.pipe(null);
			return syncArtist(a)
		})
	}

	var a_pipe = p.pipe();



	_.each(types['venue'],function(venue,v_i){
		venue.events = null_filter(venue.events);
		_.each(venue.events,function(event,e){
			if(event.artists == null) return;

			//save headliners
			if(event.artists.headliners != null && event.artists.headliners.length != 0) a_pipe = a_pipe.then(function(){
				return Promise.reduce(_.clone(event.artists.headliners),function(total,artist){
				
					return sync(artist).then(function(a){
						if(a != null) total.push(a._id)
						a = undefined;
						artist = undefined;
						return total;
					})
				},[]).then(function(total){
					types['venue'][v_i].events[e].artists.headliners = total;
					return p.pipe()
				})
			});


			//save openers
			if(event.artists.openers != null && event.artists.openers.length != 0) a_pipe = a_pipe.then(function(){
				return Promise.reduce(_.clone(event.artists.openers),function(total,artist){
					return sync(artist).then(function(a){
						if(a != null) total.push(a._id)
						a = undefined;
						artist = undefined;
						return total;
					})
				},[]).then(function(total){
					types['venue'][v_i].events[e].artists.openers = total;
					return p.pipe()
				})
			});
			
		});
	});

	return a_pipe.then(function(){
		return p.pipe(types)
	});
};











/* FLIP ALL DATA PASSED with "{type:'event'}" and make is so that its   {event.venue : events:[origional event object] } */
var flipEvents = function(typeset){
		

	//flip events to display venues on top
	var venues = _.map(typeset['event'],function(e){
		var venue = _.clone(e.venue);
		e.venue = null;
		delete e.venue;
		var event = e;
		venue.events = [event];
		return venue;
	});


	//console.log(util.inspect(typeset, {showHidden: false, depth: null}));

	//console.log(venues);
	typeset['venue'] = typeset['venue'].concat(venues);

	delete typeset['event'];



	return p.pipe(typeset);
}













/* ------------------------  */
/* ------------------------  */
/* GET VENUE GPS FROM GOOGLE */
/* ------------------------  */
/* ------------------------  */

We need to get the GPS data for venue and events to compare them later on!
GPS data is brought to us by GOOGLE the AI.

*/

var fillGPS = function(obj){
	var addr = {};
	addr.address = obj.location.address;

	if(obj.location.components != null){
		addr.countrycode= obj.location.components.countrycode
		addr.statecode= obj.location.components.statecode
		addr.country= obj.location.components.country
		addr.zip= obj.location.components.zip
		addr.city= obj.location.components.city
	}
	

	return addressGPS(obj.name,addr)

	.then(function(loc){
		if(loc.status == 2){
			if(_.isArray(obj.tags)) obj.tags = obj.tags.concat(loc._tags); else obj.tags = loc._tags;
		
			
			obj.location = _.clone(loc);
			obj.location._gps = [parseFloat(loc.gps.lon),parseFloat(loc.gps.lat)];
			obj.name = loc._name
			
			console.log('SYNC GPS PLACE: '.bold.cyan,obj.name.magenta,loc._name.inverse);
		}else if(loc.status == 1){

			obj.location = _.clone(loc);
			obj.location._gps = [parseFloat(loc.gps.lon),parseFloat(loc.gps.lat)];

			console.log('SYNC GPS GEOLOC: '.bold.yellow,obj.name.magenta);
		}else if(loc.status == 0){
			console.log('SYNC GPS FAIL: '.red,obj.name.magenta,'\n',obj.location);
			//if(obj.location.gps != null) obj.location.gps = formatGPS(obj.location.gps);
			obj.location.status = 0;
		}else{
			console.log('SYNC GPS ERR')
			obj.location.status = 0;
		}

		if(obj.location.gps != null && (isNaN(obj.location.gps.lat) || isNaN(obj.location.gps.lon))) {
			obj.location.gps = null;
		}


		return p.pipe(obj)
	}).catch(function(e){
		console.log('GET GPS ERR'.bgRed,e);
		return {status:0};
	})
};












var overwrite = false;
//merge and/or save document
function quickMerge(type,found_model,new_model,check_val,priority){
	

	console.log('quick merge'.yellow,found_model.name,new_model.name.inverse);

	//if overwrite is true, do a simple overwrite.
	if(overwrite){
		return new_model 
	//otherwise deep merge and compare.
	}else{
		try{
			return merge[type](found_model,new_model,priority,check_val);
		}catch(e){
			console.error(e);
			console.log(e.stack.split('\n')[1]);
			return false
		}
	}
}

































/* -------------------  */
/* -------------------  */
/* VENUE SYNC FUNCTIONS */
/* -------------------  */
/* -------------------  */


/*SYNC A VENUE WITH THE DATABASE
this includes finding duplicates, merging, saving, etc...
all the functions below this are the ones that get used and go in order from top to bottom.
*/
function syncVenue(venue){

	this.check_val = true;

	return Promise.using(findVenueById(venue).bind(this),function(docs){
		
		if(docs === false){
			console.log('err syncVenue')
			return p.pipe(null);
		}

		var pipe = null;

		//if venue not found, create a new one
		if(docs == null || docs.length == 0){
		
			console.log('DB FULL VENUE NEW:'.bold.cyan,venue.name);
			pipe = p.pipe(new db['venue'](venue));
		
		//else merge
		}else{

			//go through all text search matches and do a single merge + return if a good match, otherwise go to end
			_.each(docs,function(d){
				console.log('DB FULL VENUE MERGE:'.green,venue.name,d.name.inverse);
				m_d = quickMerge('venue',d,venue,check_val);
				if(m_d != false){
					d.set(m_d);
					pipe = p.pipe(d);
					return false;
				}
			});
			
			//Failed to merge, probably because answered NO to all prompts.
			if(pipe == null){
				console.log('DB FULL VENUE NEW:'.bold.cyan,venue.name);
				pipe = p.pipe(new db['venue'](venue));				
			}

		}

		return pipe.then(saveVenue);
	});
};

/*

FIND VENUE BY ID

*/

var findVenueById = function(venue){

	return db['venue'].findOneAsync({
		platformIds: {$in : venue.platformIds}
	}).then(function(doc){
		if(doc != null){
			console.log('MATCHED VENUE BY ID'.green,doc.name);
		
			this.check_val = false;
			return p.pipe([doc]);
		}
		else return findVenueByGPS(venue).bind(this);
	}.bind(this)).catch(function(err){
		console.log(err)
		return null;
	});
};









/*

ELSE FIND VENUE BY GPS

*/
function findVenueByGPS(venue){
	if(venue.location.gps == null || venue.location.gps.lat == null || venue.location.gps.lon == null) return findVenueByName(venue)

	//GPS Search Query within 10 meters
	return db['venue'].find({
		'location._gps':{
			$nearSphere : {
				$geometry : {type: "Point", coordinates : venue.location._gps},
				$maxDistance : 100 //meters
			}
		}
	}).limit(10)
	.execAsync()
	.then(function(venues){
		if(venues != null && venues.length > 0){
			console.log('found similar venues by gps, matching: ',venue.name,_.map(venues,function(v){return v.name}));
			
			//Higher precision name check
			var found = [];
			_.each(venues,function(v,i){
				if(match['venue'](v,venue)){
					found.push(v);
				}
			});


			//MATCHED BY SIMILAR GPS
			if(found.length){
				console.log('MATCHED BY SIMILAR GPS'.green,found.length,' -> ',venue.name.inverse);
				return p.pipe(found);
			}else return findVenueByName(venue);

		}else return findVenueByName(venue).bind(this);
	}.bind(this))
	.catch(function(err){
		console.log('find venue by gps error'.bgRed,err);
		return p.pipe(false);
	});		
};








/*

ELSE VENUE FIND BY NAME

*/
function findVenueByName(venue){
	
	return db['venue'].find(
		{ $text : { $search : venue.name } }, { score : { $meta: "textScore" } }
    )
    .limit(5)
    .sort({ score: { $meta: "textScore" } })
	.execAsync()
	.then(function(venues){
	

		if(venues != null && venues.length > 0){

			//Higher precision name check
			console.log('found similar venues by name, matching: ',venue.name,_.map(venues,function(v){return v.name}));
			var found = [];
			_.each(venues,function(v,i){
				if(match['venue'](venue,v)){
					found.push(v)
				}
			});

		
			return p.pipe(found);
		}

		//nothing found
		else{
			return p.pipe(null);
		} 
		
	}).catch(function(err){
		console.log('find venue by name err'.bgRed,err)
		return p.pipe(null);
	});
};



















var saveVenue = p.sync(function(doc){
	doc.save(function(err){
		if(err){
			//console.log('VENUE SAVE FAILED'.bgRed,doc.name.red,err);
			this.reject('VENUE SAVE FAILED',err)
		}else{
			console.log('VENUE SAVED'.cyan,doc.name);
			this.resolve(true)
		}
		
		doc = undefined;
	}.bind(this));
	return this.promise;
});




//Venue Id sync
var syncVenueById = function(venue){

	return Promise.using(
		db['venue'].findOneAsync({
			platformIds: {$in : venue.platformIds},
			'location.status': {$gt : min_gps_status-1}
		}),
		function(doc){

			
			//when we return null, we can later find by full search
			if(doc == null) return p.pipe(false);
			

			//This is guaranteed to work!

			console.log('FOUND DB.VENUE BY ID'.green,venue.name,doc.name.inverse);
			var fields = quickMerge('venue',doc,venue,false);


			if(fields == false){
				console.log('SYNC DB.VENUE BY ID FAILED'.bgRed)
				return p.pipe(null)
			}else{
				doc.set(fields);
			}

			venue = undefined;
			return saveVenue(doc)
		}
	)
};














































/* -------------------  */
/* -------------------  */
/* ARTIST SYNC FUNCTIONS */
/* -------------------  */
/* -------------------  */

//find by id
var findArtistById =function(artist){

	return db['artist'].findOneAsync({
		platformIds: {$in : artist.platformIds}
	}).then(function(doc){
		if(doc != null){
			
			this.check_val = false;
			return p.pipe([doc]);
		}else return findArtistByName(artist).bind(this);
	}.bind(this));
};


//find by name and return a pipe with array or null (erro) /empty (no results) array
function findArtistByName(artist){

	//search by name
	return db['artist'].find(
		{ $text : { $search : trimName(artist.name) }}, 
    	{ score : { $meta: "textScore" }}
    )
    .limit(5)
    .sort({ score: { $meta: "textScore" } })
    .execAsync()
    .then(function(artistlist){
    	if(artistlist == null) return p.pipe(null)
		var found = [];

		_.each(artistlist,function(a,i){
			if(match.artist(artist,a) == true){
				found.push(a);
			}
		});
		
		return p.pipe(found);

    }).catch(function(err){
    	console.log('find artist by name err'.bgRed);
    	console.error(err);
		return p.pipe(null);
    });
};

module.exports.findArtistByName = findArtistByName;


//Artist Sync
var syncArtist = function(artist){
	this.check_val = true;

	/*
	
	find by id and if find by id fails, find by name,
	if merging fails, dont save and return a null pipe.
	
	*/
	return Promise.using(findArtistById(artist).bind(this),function(found){


		//if found length is 0, means we could not find anything return a new artist from the data
		if(found == null || found.length == 0){
			console.log('NEW ARTIST'.bold.cyan,artist.name);
			var pipe = p.pipe(new db['artist'](artist));
		

		//otherwise we merge the artist
		}else{

			var pipe = null;
			_.each(found,function(a){
			
				var new_a = quickMerge('artist',a,artist,check_val);
				if(new_a != false){
					a.set(new_a);
					pipe = p.pipe(a);
					return false;
				}
			});

			//if merging fails (NO Prompt happens for all qualifiers)...we return a null pipe. 
			if(pipe == null) return p.pipe(artist);
		}


		//SAVE
		return pipe.then(p.sync(function(doc){
			

			doc.save(function(err){
				
				if(err){
					console.log('ARTIST SAVE FAILED'.bgRed,doc.name.red,err);
					this.resolve(null)
				}else{
					console.log('ARTIST SAVED'.cyan,doc.name);
					this.resolve(doc);
				}

			}.bind(this));

			return this.promise;
		}));
	})
};

















var filter_empty = true;

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






//default bad words
var bad_words = [
	'library',
	'church',
	'postal code',
]



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



var logMem = require('../util').logMem;
//var heapdump = require('heapdump'); dump heap to debug for memory leaks...thankfully i know the source well enough to refactor the leaky parts without having to crawl through the "dumps"...

var min_gps_status = 2; //default min gps status
	


//if dataset contains artist types...go ahead and save them.

function syncArtists(types){

	return Promise.map(types['artist'],function(artist){
		return validateArtist(artist).then(function(a){
			if(a == null) return p.pipe(null);
			return syncArtist(a)
		})
	},{concurrency:1})
	.then(function(){
		return p.pipe(types);
	})
}


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
	.then(syncArtists)
	.then(flipEvents)
	.then(extractArtists) 	//extract artists out of each event and link their platform ids to the venue event
	.then(filterEmpty)
	.then(filterBad)
	.then(validateVenues)
	.then(function(types){	//fill Venue GPS and Sync each type asynchroniously.
		

		//check venues for nulls
		


		//if total is 0 we return
		var total_n = types['venue'].length;
		if(total_n == 0){ return p.pipe(null)}

		types['venue'] = null_filter(types['venue']);
		types['venue'].unshift(0);

		var pipe = p.pipe();


		var count = 0;


		var batches = _.chunk(types['venue'],20);


		_.each(batches,function(venues_batch){
			
			pipe = pipe.then(function(){
				return Promise.map(venues_batch,function(doc,i){
					if(doc === 0 || doc == null) return i
					//if overwrite is set to true, we would have to get the gps data all over again.
					if(overwrite == true){
						
						return fillGPS(doc)
						.then(syncVenue)
						.finally(function(){

							doc = undefined;
							types['venue'][total] = undefined
							logMem();
							console.log('synced ',total+1,'/',total_n,'\n\n');
						}).catch(function(e){
							console.log('syncVenueById ERROR'.bgRed)
							console.error(e);
							if(e.stack != null){
								console.log(e.stack.split('\n')[1])
							}
						})

					//otherwise try and sync Id and if that fails, fill gps and do a full sync
					}else{

						// LEAK START
						return syncVenueById(doc)
						.then(function(res){
							if(res != false){
								doc = undefined;
								return 
							}else{
								return fillGPS(doc)
								.then(syncVenue)
							}
						})
						// LEAK END
						.finally(function(){
							count++;
							types['venue'][i] = undefined;
							doc = undefined;
							logMem();
							console.log('synced ',count,'/',total_n,'\n\n');
						}).catch(function(e){
							console.log('syncVenueById ERROR'.bgRed)
							console.error(e);
							if(e.stack != null){
								console.log(e.stack.split('\n')[1])
							}
						})

					}
				},{concurrency: 1})
			})	
		})
		return pipe;
	})
	.tap(function(total){console.log('DONE W/ SYNC'.bgCyan)})
}



module.exports.setOverwrite = function(ow){
	overwrite = ow;
}




module.exports.syncData = syncData;
module.exports.syncVenue = syncVenue;
module.exports.syncVenueById = syncVenueById;
module.exports.findVenueByGPS = findVenueByGPS;
module.exports.syncArtist = syncArtist;



