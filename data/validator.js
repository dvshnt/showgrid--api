
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

var colors = require('colors');

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










var types = ['venue','event','artist'];




var SplitbyType = p.sync(function(dataset){


	var typeset = {};
	_.each(types,function(type){
		typeset[type] = [];
	});

	_.each(dataset,function(doc){
		if(typeset[doc.is] == null){
			console.log('split ERR:',doc.is,'is not a type of',types,doc.name);
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

	this.resolve(typeset);

	return this.promise;
});













/*

////////////////////
GET GPS
////////////////////

We need to get the GPS data for venue and events to compare them later on!
GPS data is brought to us by GOOGLE the AI.

*/

var addressGPS = require('./gps');

var getGPS = p.sync(function(obj){
	//console.log(obj.location);
	var addr = null;
	var tries = 0;


	function tryget(){
		addressGPS(obj.name,obj.location)
		.then(function(loc){
			if(_.isString(loc)){
				console.log(('getGPS WARN for: '+loc).gray);
				if(loc.match(/limit/i) != null && tries< 10){
					setTimeout(tryget.bind(this),200)
					return;
				}else{
					this.resolve(loc);
				}
			}else{
				
				this.resolve(loc);
			}	
		}.bind(this));
	}


	// console.log('TO GETGPS',obj.name,obj.platforms[0].id,obj.location.address,obj.location.gps)
	
	tryget.bind(this)();

	return this.promise;
});


var fillGPS = p.sync(function(datatype){

	var delay = 250;
	
	//get GPS for venues.
	var has_address = 0;



	var pipes = _.map(datatype['venue'],function(obj,i){


		return Promise
		.resolve(obj)
		.delay(delay*i)
		.then(getGPS)
		.then(function(loc){
			if(loc != null && !_.isString(loc)){
				has_address++;
				obj.location = loc;
				obj.location.confirmed = true
				console.log('getGPS SUCC for: '.green,obj.name.magenta);
			}else if(_.isString(loc)){
				obj.location.confirmed = false;
				console.log('getGPS FAIL for: '.red,obj.name.magenta,' ',loc.red.bold,obj.platforms,'\n',obj.location);
			}
		});
	}.bind(this));

	
	Promise.settle(pipes).then(function(){
		console.log(has_address,datatype['venue'].length)
		var ratio = has_address/datatype['venue'].length;
		var str = (has_address+'/'+datatype['venue'].length).toString();
		if(ratio < 0.5) str = str.red;
		else if(ratio < 0.7) str = str.yellow
		else if(ratio < 0.85) str = str.green
		else str = str.cyan
		console.log('GPS DATA : '.bgBlue,str.bold,' ratio: ',ratio);		
		
		this.resolve(datatype);
	}.bind(this));

	return this.promise;
});


















/*

	VALIDATION FILTERS

*/
var util = require('util');
var validate = p.sync(function(dataset){

	_.each(dataset,function(doc,i){
		if(doc == null) return
		if(doc.is == null){
			dataset[i] == null;
		}
		if(doc.platforms == null){
			console.error('validate ERR'.bold.bgRed,'no platform for '.red,doc.name);
			dataset[i] = null;
		}

		if(doc.is == 'event'){
			if(doc.venue == null){
				console.error('validate ERR'.bold.bgRed,'event found without venue!'.red);
				dataset[i] = null;
			}
		}

		if(doc.is == 'venue'){
			if(doc.name == null){
				console.error('validate ERR'.bold.redBg, 'venue w/o name...we dont like those, ignore'.red,doc.platforms);
				dataset[i] = null;
			}


			//VENUE ADDRESS REQUIRED.
			if((doc.location.address == null || doc.location.address.length < 5) && (doc.location.gps == null || doc.location.gps.length < 2)) {
				console.log('validate ERR'.bold.bgRed, 'venue w/o address && gps'.red,doc.platforms,doc.name);
				dataset[i] = null;
			}
		}
	});



	var dataset = _.filter(dataset, function(n) {
	  return !(!n);
	});



	this.resolve(dataset)
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

	function checkname(){
		var t_name1 = v1.name.replace(/\sand\s|\s&\s/,' ');
		var t_name2 = v2.name.replace(/\sand\s|\s&\s/,' ');

		var n_match = fuzzy([t_name1]).get(t_name2);
		var contains = t_name1.match(new RegExp(t_name2,'i')) || t_name2.match(new RegExp(t_name1,'i'));


		if(contains != null || (n_match != null && n_match[0][0] > 0.9)) return true;
		return false;
	}


	function checkID(){
		var match = false
		_.each(v1.platforms,function(plat1){
			if(match) return false;
			_.each(v2.platforms,function(plat2){
				if(plat2.name == plat1.name && plat2.id == plat1.id) match = true;
				if(match) return false		
			});
		});
		return match;
	}


	//check by ID's.
	if(checkID() == true){
		console.log('matched IDs'.bold.green,v1.name.inverse,v2.name)
		return true;
	}


	//this is usually this case
	else if(v1.location.gps != null && v2.location.gps != null){
		
		//if venue GPS locations are similar...
		if(sameGPS(v1.location.gps,v2.location.gps)){
			//console.log("SAME GPS")
			var n_match = fuzzy([v1.name]).get(v2.name);
			//console.log("MATCH IS",n_match);
			if(n_match != null && n_match[0][0] > 0.5){
				console.log('matched GPS/Names'.bold.green,v1.name.inverse,v2.name)
				return true;
			}
			else return false
		}else{
			//console.log("CHECK NAME")
			if (checkname()){
				console.log('matched Names'.bold.green,v1.name.inverse,v2.name)
				return true
			} 
			else return false;
		}

	
	//1/200 this will happen and and its not guaranteed to work. 
	}else{
		//console.log("CHECK NAME 2")
		if (checkname()){
			console.log('matched Names'.bold.green,v1.name.inverse,v2.name)
			return true
		} 
		else return false;
	}
}


match.artist = function(a1,a2){
	
	var a_match = fuzzy([a1.name]).get(a2.name);

	if(a_match != null && a_match >= 0.9) return true;
	
	return false
}

























/*

SMART MERGING

*/

var fuzzy = require('fuzzyset.js');
function fuzzyMatch(str1,str2){
	var fuzz = fuzzy([str1]);
	var match = fuzz.get(str2);
	if(match[0] != null){

	}
}

function sameGPS(coord1,coord2){
	var maxd = 0.0001;
	//console.log('check GPS',coord1,coord2);
	var d = Math.sqrt((coord1[0]-coord2[0])*(coord1[0]-coord2[0])+(coord1[1]-coord2[1])*(coord1[1]-coord2[1]));

	


	if(d<maxd){
		//console.log('same gps: ',d);
		return true
	} 
	else return false
}




var MergePriority = {'facebook':2.5,'eventful':1.5,'reverbnation':1,'jambase':1};


//e2 overrides e1 if priority set to false. otherwise overrides based on MergePriority Array.
function mergeDocs(e1,e2,priority){//priority boolean defaults to true
	if(priority != null && priority == false) return _.merge(e2,e1);

	var i1 = 0,i2 = 0;
	

	//priority dicision making.
	_.each(e1.platforms,function(plat){
		i1+= MergePriority[plat.name]
	});
	_.each(e2.platforms,function(plat){
		i2+= MergePriority[plat.name]
	});

	if(e1.events != null && e2.events.length != null){
		if(e1.events.length > e2.events.length) i1+=2;
		if(e1.events.length < e2.events.length) i2+=2;
	}


	// locations
	var loc = null;
	if(e2.location.confirmed && e1.location.confirmed){
		if(i2 >= i1) loc = e2.location;
		else loc = e1.location;
	}
	else if(e2.location && e2.location.confirmed) loc = e2.location;
	else if(e1.location && e1.location.confirmed) loc = e1.location;
	


	

	
	//merged document.
	var merged = (i1 >= i2) ? _.merge(e2,e1) : _.merge(e1,e2);
	if(loc != null) merged.location = loc;


	//merge and potential subdocuments.
	if(merged.events != null) mergeEvents(merged);

	return merged
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








/*

FILTER OUT DUPLICATES BY MATCHING BY TYPE.

*/
var filterDuplicates = p.sync(function(typeset){
	_.each(typeset,function(dataset,type){


		var l = dataset.length;


		for(var i = 0;i<dataset.length;i++){
			if(dataset[i] == null) continue;
			for(var j = 0;j<dataset.length;j++){
				if(dataset[j] == null || j == i) continue;
				if(match[type](dataset[i],dataset[j])){
					console.log('MERGING...'.bgBlue,dataset[i].name.inverse,dataset[j].name);
					dataset[i] = mergeDocs(dataset[i],dataset[j]);
					dataset[j] = null;
				}
			}
		}


		dataset = _.filter(dataset, function(n) {
		  return n != null;
		});

		console.log(('FILTER '+type+' : ').bgBlue,('-'+(l-dataset.length)).yellow.bold,(dataset.length+'/'+l).cyan.bold);

		console.log(util.inspect(_.map(dataset,function(dat){
			return dat.name;
		}).sort(), {showHidden: false, depth: null}));

		typeset[type] = dataset;

	});

	this.resolve(typeset);
	return this.promise;
});









var flipEvents = p.sync(function(typeset){

	//flip events to display venues on top
	var venues = _.map(typeset['event'],function(e){
		var venue = _.clone(e.venue);
		if(venue.name == null){
			venue.name = e.name;
		}
		venue.events = [e];
		return venue;
	});


	//console.log(util.inspect(typeset, {showHidden: false, depth: null}));


	typeset['venue'] = typeset['venue'].concat(venues);

	delete typeset['event'];

	this.resolve(typeset);
	return this.promise;
})


















var syncArtists = p.async(function(typeset){
	this.data = typeset;



	//find artists in database by name
	var findByName = p.sync(function(artist){
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
			}else return findByName(artist);
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

	//console.log(util.inspect(typeset['venue'], {showHidden: false, depth: null}))




	/*

		find venues by their GPS.
	
	*/
	var findByGPS = p.sync(function(venue){
			
		if(venue.location.gps == null) return findByName(venue);


		//GPS Search Query within 10 meters
		db['venue'].find({
			location:{gps:{
				$near : {
					$geometry : {type: "Point", coordinates : venue.location.gps},
					$maxDistance : 10
				}
			}}
		}).


		//if GPS Matches fuzzy compare the names, otherwise return with a findByName Query (brute force)
		then(function(venues,err){
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
				//console.log('failed to find venue by GPS...')
				findByName(venue).then(function(doc){
					this.resolve(doc);
				}.bind(this));
			}
		}.bind(this))

		return this.promise;
	});


	/*
	
		find venues by their Name.
	
	*/
	var findByName = p.sync(function(venue){

		//search by name
		db['venue'].find(
			{$text: {$search: venue.name }},
			{score: {$meta: "textScore"}}
		)
		.sort({score: {$meta: "textScore"}}).limit(5).then(function(venuelist,err){

			if(venuelist != null && venuelist.length > 0){

				var m_list = _.map(venuelist,function(v){
					return v.name;
				});
				console.log('GPS venue find failed for',venue.name,',found text searches...',m_list)


				var matches = fuzzy(m_list).get(venue.name);


				this.resolve(venuelist[0])
			}else{
				this.resolve(null);
				
			}
		}.bind(this));
		

		return this.promise;
	});

	//merge venues.
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

	/*

	INITIAL SEARCH
	
	*/
	_.each(typeset['venue'],function(venue,i){
	
				
		//try and find one based on same platform ID
		db['venue'].findOne({
			platformIds: {$in : _.map(venue.platforms,function(plat){
				return plat.name+'/'+plat.id
			})}
		}).

		//otherwise return the GPS Pipeline
		then(p.sync(function(doc,err){
			
			if(doc != null) this.resolve(doc); 
			else return findByGPS(venue);
			return this.promise;
		})).


		//once all search tries pass through...
		then(function(doc){
			//console.log('Venue search tries for',venue.name,'passed through with matched result:', (doc != null ? doc.name : 'NULL' ));

			if(doc != null){
				console.log('FOUND DOUCMENT & MERGING...',venue.name,doc.name)
				doc = merge(doc,venue);
				return doc.save();
			}else{
				console.log('creating new venue in database',venue.name);

				var n = new db['venue'](venue);

				//log 
				n.validate(function(err) {
					if(!err) return;
				    console.error('VALIDATION ERROR:',err);
				});
				
				return n.save();
			}
		}).

		//final
		then(function(v,err){

			console.log('successfully saved venue :',v.name);

			this.count++;
			this.checkAsync();
		}.bind(this))

	}.bind(this));

	return this.promise;
})






















/*

Syncroniously filter through all fetched data, merge any duplicates and re-arrange data then sync it with the database.

*/

module.exports = p.async(function(dataset,save){


	console.log('DATASET LENGTH:'.bold.bgBlue,dataset.length.toString().yellow.bold)


	validate(dataset) 	//validate data
	.then(SplitbyType) //split raw data by into types for faster parsing
	.then(flipEvents)  //flip events to their
	.then(filterDuplicates) //merge any dat
	.then(fillGPS) //fill GPS data.
	.then(filterDuplicates) //merge any dat
	.then(syncVenues).then(syncArtists) // sync documents with database

	return this.promise;
});