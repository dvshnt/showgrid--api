
var _ = require('lodash');

var db = require('./data.js');
//scraper endpoints
var scrapers = require('./scrapers');
var Promise = require('bluebird');

// console.log(scrapers)
//Async data scraping

//console.log(db);

var fuzzy = require('fuzzyset.js'); //fuzzy matching for finding models that are similar.

var p = require('./pFactory.js'); //promise factory shortucts.



/*
Model validator for events/venues/artists finds a similar model and if one is found that has a definite match, (like for example same name)
then the preexisting model is updated and saved.

If no matches are found the function saves the model.

Returns a promise that resolves when the data is saved or updated into the database.

*/









/*
	COMPARING FUNCTIONS.
	compares two documents, if they are found to be identical, creates a new object and returns it.
	if not, returns null.
*/

var fuzzy = require('fuzzyset.js');
function fuzzyMatch(str1,str2){
	var fuzz = fuzzy([str1]);
	var match = fuzz.get(str2);
	if(match[0] != null){

	}
}

function sameGPS(coord1,coord2){
	var maxd = 0.001;

	var d = Math.sqrt((coord1[0]-coord2[0])*(coord1[0]-coord2[0])+(coord[1]-coord2[1])*(coord[1]-coord2[1]));

	


	if(d<maxd){
		console.log('same gps: ',d);
		return d
	} 
	else return false
}

















var SplitbyType = p.sync(function(dataset){
	var typeset = {};

	_.each(dataset,function(doc){
		if(typeset[doc.is] == null) typeset[doc.is] = [];

		typeset[doc.is].push(doc);
		delete doc.is;
	});

	//Sort typesets is required because when we compile events it equals nigger.
	_.sortBy(typeset,function(dat,type){
		if(type == 'event') return 0;
		if(type == 'venue') return 2;
		if(type == 'artist') return 1;
	})

	this.resolve(typeset);

	return this.promise;
});









/*

We need to get the GPS data for venue and events.
Event gps data is automatically linked with that events venue.
We can then use that data to find duplicates before trying to find duplicates in the databse and also store it for future use in the database.

sometimes we will
*/

var addressGPS = require('./gps');

var getGPS = p.sync(function(obj,delay){
	//console.log(obj.location);
	var addr = null;
	var tries = 0;


	function tryget(){
		addressGPS.getGPS(addr,function(location){
			if(_.isString(location)){
				if(location.match(/limit/i) != null && tries< 10){
					console.log('gps api timeout, try again.');
					setTimeout(tryget.bind(this),200)
					return;
				}else{
					this.resolve(null);
				}
			}else{
			
				obj.location.gps = [location.latitude,location.longitude]
				this.resolve(obj);
			}	
		}.bind(this));
	}

	//start

	addr = (obj.location.address + ' ' || '')  + (obj.location.city + ' ' || '') + (obj.location.statecode+' '||'');
	if(addr == '' && obj.location.gps) this.resolve(obj);
	else if( addr == '') this.resolve(null);
	
	setTimeout(tryget.bind(this),delay);

	return this.promise;
});


var fillGPS = p.sync(function(datatype){

	var delay = 200;
	
	//get GPS for venues.
	var has_address = 0;

	var pipes = _.map(datatype['venue'],function(obj,i){
		return getGPS(obj,delay*i).then(function(obj){
			if(obj) has_address++;
		});
	})

	
	Promise.settle(pipes).then(function(){
		
		//DEBUG
		console.log('GPS DATA FOUND FOR : ',has_address,'/',datatype['venue'].length);
		
		this.resolve(datatype);
	}.bind(this));

	return this.promise;
});












/*


	MATCH FUNCTIONS.


*/


var match = {};

match.event = function(ev1,ev2){


	function sameArtists(art1,art2){
		var count = 0;
	
		_.each(art1,function(art){
			_.each(art2,function(artt){
				if(artt == art) return;
				var m = fuzzy([art.name]).match(artt.name);
				if(m != null && m[0][0] > 0.9) count++
				else count--
			});
		});

		return count;
	};

	//event 1 data
	if( !ev1.venue.location.gps){
		ev1n1 = ev1.date + ' ' + ev1.venue.name + ' ' + ev1.name
	}
	ev1n2 = ev1.date + ' ' +ev1.name;

	//event 2 data
	if(!ev2.venue.location.gps){
		ev1n2 = ev1.date + ' ' +ev1.name;
	}
	ev2n2 = ev2.date + ' ' + ev2.venue.name + ' ' + ev2.name
	
	//
	if(ev1.venue.location.gps && ev2.venue.location.gps){
		if( ! sameGPS(ev2.venue.location.gps,ev2.venue.location.gps) == 0) return false;
		
		if(ev1.date == ev2.date){
			return true
		}

		var n_match = fuzzy([ev1.name]).get(ev2.name);

		if(n_match != null && n_match[0][0]>0.9) return true
	}else{
		var v_match = fuzzy([ev1.venue.name]).get(ev2.venue.name);
		//var n_match = fuzzy([ev1.name]).get(ev2.name);
		
		if(ev1.date == ev2.date && v_match[0][0] > 0.9 && sameArtists(ev1.artists,ev2.artists) >= 0){
			return true
		}
	}

	return false
};


match.venue = function(v1,v2){


	//this is usually this case
	if(v1.location.gps && v2.location.gps){
		
		//if venue GPS locations are similar...
		if(sameGPS(v1.location.gps,v2.location.gps)){

			//fuzzy match the names and check if the match is > 0.4 (bare minimum)
			var n_match = fuzzy([v1.name]).get(v2.name);
			if(n_match != null && n_match > 0.4) return true;
			else return false
		} return true;
	
	//1/200 this will happen and and its not guaranteed to work. 
	}else{
		var n_match = fuzzy([v1.name]).get(v2.name);
		var a_match = fuzzy([v1.location.address]).get(v2.location.address);
		if(n_match != null && a_match != null && n_match[0][0] > 0.8 && a_match[0][0] > 0.8) return true;
		if(n_match > 0.9) return true
	}
	
	return false
}


match.artist = function(a1,a2){
	
	var a_match = fuzzy([a1.name]).get(a2.name);

	if(a_match != null && a_match >= 0.9) return true;
	
	return false
}

























/*

SMART MERGING

*/


var MergePriority = {'facebook':2.5,'eventful':1.5,'reverbnation':1,'jambase':1};


//e2 overrides e1 if priority set to false. otherwise overrides based on MergePriority Array.
function mergeDocs(e1,e2,priority){//priority boolean defaults to true
	if(priority != null && priority == false) return _.merge(e2,e1);

	var i1 = 0;
	var i2 = 0;
	
	_.each(e1.platforms,function(plat){
		i1+= MergePriority[plat.name]
	});
	_.each(e2.platforms,function(plat){
		i2+= MergePriority[plat.name]
	});


	if(i1 >= i2) return _.merge(e2,e1);
	else return _.merge(e1,e2);
};



//search for event duplicates in venue event list and merge them if neccesary.
function mergeEvents(venue){
	_.each(venue.events,function(ev1,i){
		_.each(venue.events,function(ev2,j){
			if(match['event'](ev1,ev2)){
				venue.events[i] = mergeDocs(ev1,ev2);
				delete venue.events[j];
			}
		});
	});
}






var filterDuplicates = p.sync(function(typeset){

	_.each(typeset,function(dataset,type){
		_.each(dataset,function(d1,i){
			_.each(dataset,function(d2,j){
				if(d1.is == d2.is) return
				
				if(match[type](d1,d2) == true){
					dataset[i] = MergeDocs(d2,d1);
					if(dataset[i].events != null){
						MergeEvents(dataset[i]);
					}
					console.log('same '+type+' found!',d1.name,d2.name)
					dataset.splice(j,1)
				}
			});	
		})
		
	});

	this.resolve(typeset);
	return this.promise;
});


















/*

DATABASE SYNC FUNCTIONS

*/





var flipEvents = p.sync(function(typeset){

	//flip events to display venues on top
	var venues = _.map(typeset['event'],function(e){
		
		var venue = _.clone(e.venue);
		if(venue.name == null){
			venue.name = e.name;
		}
		delete e.venue;
		venue.event = e;
		return venue
	});

	console.log(typeset);



	typeset['venue'] = typeset['venue'].concat(venues);

	delete typeset['event'];

	this.resolve(typeset);
	return this.promise;
})



var syncArtists = p.async(function(typeset){
	this.data = typeset;

	var findName = p.sync(function(artist){
		console.log('Artist Sync: failed to find artist by platform id, trying to find by name....')
		db['artist'].find({$text: {$search: artist.name}}).limit(5)
		then(function(err,docs){
			if(docs != null && docs.length){
				console.log('found documents for artist #',artist.name,' : ',docs);
				console.log('TODO');
				this.resolve(null);
			}else{
				console.log('Created a new artist in database.'); 
				var a = new db['artist'](artist);
				a.save().then(function(){
					this.resolve();
				}.bind(this));
			}
			this.resolve();
		}.bind(this))

		return this.promise;
	});


	_.each(typeset['artist'],function(artist){
		
		//try and do a text search for artist
		db['artist'].find({
			platforms: {$in : artist.platforms}
		}).

		//if we find an artist, merge
		then(p.sync(function(err,docs){
			if(docs != null && docs.length > 0){
				console.log('found artists for',artist.name,'in data base for',artists);
			}else return findName(artist);
		})).

		//incremement count
		then(function(){
			this.count++;
			this.checkAsync();
		}.bind(this))
	
	});

	return this.promise;
});




function checkPlat(doc1,doc2){
	var done = false
	_.each(doc1.platforms,function(plat1,i){
		_.each(doc2.platforms,function(plat2,i){
			if(plat1.name == plat2.name && plat1.id == plat2.id) done = true
			if(done) return false;
		})

		if(done) return true;
	})
}




var syncVenues = p.async(function(typeset){

	this.total = typeset['venue'].length;
	this.data = typeset;




	var findGPS = p.sync(function(venue){
			
		if(venue.location.gps == null) return findName(venue);


		//GPS Search Query within 10 meters
		db['venue'].find({
			location:{gps:{
				$near : {
					$geometry : {type: "Point", coordinates : [venue.location.gps[0],venue.location.gps[1]]},
					$maxDistance : 10
				}
			}}
		}).


		//if GPS Matches fuzzy compare the names, otherwise return with a findName Query (brute force)
		then(function(err,venues){
			if(venues != null && venues.length > 0){
				var m_list = _.map(venues,function(v){
					return v.name;
				});

				var matches = fuzzy(m_list).get(venue.name);

				console.log('Found venue entry in DB with similar GPS..comparing name',venue.name,'with best match ->',matches[0]);
				if(matches != null && matches[0][0] > 0.8){
					this.resolve(venues[m_list.indexOf(matches[0][1])]);
				}
			}else{
				findName(venue).then(function(doc){
					this.resolve(doc);
				}.bind(this));
			}
		}.bind(this))

		return this.promise;
	});



	var findName = p.sync(function(venue){

		//search by name
		db['venue'].find(
			{$text: {$search: venue.name + venue.location.address}},
			{score: {$meta: "textScore"}}
		).sort({score: {$meta: "textScore"}}).limit(5).then(function(err,venuelist){

			if(venuelist != null && venuelist.length > 0){
				console.log('GPS venue find failed for',venue.name,',found text searches...',venuelist)

				var m_list = _.map(venuelist,function(v){
					return v.name;
				});

				var matches = fuzzy(m_list).get(venue.name);


				this.resolve(venuelist[0])
			}else{
				this.resolve(null);
				
			}
		}.bind(this));
		

		return this.promise;
	});


	function merge(doc,venue){
		_.each(doc.events,function(ev,j){
			_.each(venue.events,function(n_ev,i){
				if(checkPlat(ev,n_ev)){
					doc.events[j] = mergeDocs(ev,n_ev)
					delete venue.events[i]
				}
			})
		})
		return mergeDocs(doc,venue)
	}


	_.each(typeset['venue'],function(venue,i){
		console.log('find venue ',i,'in db')
		//try and find one based on same platform ID
		db['venue'].findOne({
			platforms: {$in : venue.platforms}
		}).

		//otherwise return the GPS Pipeline
		then(p.sync(function(err,doc){
			if(doc != null) this.resolve(doc); 
			else return findGPS(venue);
			return this.promise;
		})).


		//once all search tries pass through...
		then(function(doc){
			console.log('Venue search tries for',venue.name,'passed through with matched result:', (doc != null ? doc.name : 'NULL' ));


			if(doc != null){
				doc = merge(doc,venue);
				returdoc.save();
			}else{
				console.log('creating new venue in database');
				console.log(venue.name)
				var n = new db['venue'](venue);
				n.save(function(err,newv){
					if(err) return console.error('NEW VENUE ENTRY SAVE ERROR:',err);
					console.log('successfully saved venue :',newv.name);
				});
			}
		}).

		//final
		then(function(){
			this.count++;
			this.checkAsync();
		}.bind(this))

	}.bind(this));

	return this.promise;
})










/*

	VALIDATION FILTERS

*/
var util = require('util');
var validate = p.sync(function(typeset){


	//EVENT MUST HAVE ATTACHED VENUE.
	_.each(typeset['event'],function(e,i){
		if(e.venue == null){
			console.error('validation error: event found without venue!');
			typeset['event'].splice(i,1);
		}
	});


	//VENUE NAME REQUIRED.
	_.each(typeset['venue'],function(v,i){
		console.log(v.name)
		if(v.name == null){
			console.error('validation error: venue found without name...we dont like those, ignore');
			delete typeset['venue'][i];
		}

		

	

	});

	//console.log(util.inspect(typeset['venue'], {showHidden: false, depth: null}));
	this.resolve(typeset)
	return this.promise;
});






/*

Syncroniously filter through all fetched data, merge any duplicates and re-arrange data then sync it with the database.

*/

module.exports = p.async(function(dataset,save){



	//split raw data by into types for faster parsing.
	SplitbyType(dataset).

	//check all data to make sure all nesseary information for the matching process is included
	then(flipEvents).

	then(validate).
	
	//fill GPS data.
	then(fillGPS).

	//flip events to their

	
	//merge any event duplicates.
	then(filterDuplicates)
	
	// //sync values
	// then(syncVenues).

	// //sync artists
	// then(syncArtists)

	return this.promise;
});