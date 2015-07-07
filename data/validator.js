
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

var findDupl_Venues = function(venue1,venueList){
	if(venue1.location.gps != null && venue2.location.gps != null){

	}
}

var findDupl_Artists = function(artist1,artist2){
	fuzzyMatch(artist1,artist2);
}

var findDupl_Events = function(event1,event2){

}













/*
	COMPARE ALL RAW DATA AGAINST ITSELF AND MERGE/REMOVE DUPLICATES
*/











var compareAll = p.sync(function(dataset){

	//each dataset
	_.each(dataset,function(obj){
		
	});

	console.log('IN CMPARE ALL',dataset.length);


	this.resolve(dataset);
});







var addressGPS = require('./gps');
var getGPS = p.sync(function(obj,delay,type){
	//console.log(obj.location);
	var addr = null;
	var tries = 0;


	function setAddress(){
		if(type == 'venue'){
			addr = (obj.location.address || '') + ' ' + (obj.location.city || '') + ' ' + (obj.location.statecode||'')+' '+(obj.name || '');
		}else if(type == 'event'){
			addr = obj.venue.location.address + ' ' +  obj.venue.name;
		}
	}

	function setLocation(lat,lon){
		if(type == 'venue'){
			obj.location.gps = [lat,lon]
		}else if(type == 'event'){
			if(obj.venue != null){
				//all events WILL have venues
				obj.venue.location.gps = [lat,lon];
			}
		}
		this.reolve(obj);
	}

	function tryget(){
		addressGPS.getGPS(addr,function(location){
			if(_.isString(location)){
				if(location.match(/limit/i) != null && tries< 10){
					console.log('gps api timeout, try again.');
					setTimeout(tryget.bind(this),200)
					return;
				}else{
					this.resolve(obj);
				}
			}else{
				setLocation(location.latitude,location.longitude);
			}	
		}.bind(this));
	}

	//start
	setAddress();
	setTimeout(tryget.bind(this),delay);


	return this.promise;
});










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
var fillGPS = p.sync(function(dataset){

	var delay = 10;


	var pipes = [];

	//get GPS for venues.
	_.each(dataset['venue'],function(obj,i){
		pipes.push(getGPS(obj,delay*i).then(function(){
			console.log('done trying to got venue gps.',i);
		}));
	});


	//get GPS for events.
	var venuesLength = dataset['venue'].length;
	_.each(dataset['event'],function(obj,i){
		pipes.push(getGPS(obj,delay*i+venuesLength*delay).then(function(){
			console.log('done trying to got event gps.',i);
		}));
	})


	var has_address = 0;

	Promise.settle(pipes).then(function(results){
		_.each(dataset,function(obj,i){
			if(obj.location.gps != null) has_address++;
		});
		console.log('GPS DATA FOUND FOR : ',has_address,'/',dataset.length);
		this.resolve(dataset);
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
				else count --
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


var MergePriority = {'facebook':2.5,'eventful'1.5,'reverbnation':1,'jambase':1};


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






var filterDuplicates = p.sync(function(typeset){

	_.each(typeset,function(dataset,type){
		_.each(dataset,function(d1,i){
			if(d1.is == d2.is) return
			
			if(match[type](d1,d2) == true){
				dataset[i] = MergeDocs(d2,d1);
				console.log('same '+type+' found!',d1.name,d2.name)
				dataset.splice(j,1)
			}
		});	
	});

	this.resolve(dataset);
	return this.promise;
});




var eventsToVenues = p.sync(function(typeset){
	
	//go through each event (X.X)
	_.each(typeset['event'],function(e,i){

		//go through each venue (X.X)
		var found = false
		_.each(typeset['venue'],function(v,j){

			//see if the events venue matches one of the venues from our venue type list
			if(match['venue'](v,e.venue)){
				typeset['event'].splice(i,1);

				var merged = false
				//go through each of the venue events and see if we can find a duplicate, if not append else merge existing event.
				_.each(v.events,function(e2,i2){
					if(match['event'](e2,e)){
						console.log('eventsToVenues: found venue of event in typeset, and a duplicate event inside the venue event list, merging.')
						v.events[i2] = mergeDocs(e2,e);
						return false
					}
				})
				if(!merged){
					console.log('eventsToVenues: found venue of event in typeset but no duplicate event in venue event list, added new event to venue.')
					v.events.push(e);
					return false
				}

				found = true
			}
		})

		if(found) return false;
	});

	this.resolve(typeset)

	return this.promise;

});



















/*

DATABASE SYNC FUNCTIONS

*/


function syncArtists = p.async(function(typeset){
	this.total = typeset['venues'].length;
	this.data = typeset;	


	

	return this.promise;
})





function syncEvents = p.async(function(typeset){
	this.total = typeset['venues'].length;
	this.data = typeset;	


	/*
		since venues are subdocuments of events,
		we have to search venues and match it with the event venue.
	*/
	// db['venue'].find({
	// 	location: { $near : {
	// 		$geometry : {type: "Point", coordinates : [venue.location.gps[0],venue.location.gps[1]]},
	// 		$maxDistance : 10
	// 	}}
	// }).

	_.each(typeset['event'],function(event,i){

		//first lets see if we can find a venue with an event that is 
		db['venue'].findOne({
			platforms: {$in : event.venue.platforms}
		}).

		//return the GPS Pipeline
		then(p.sync(function(err,doc){
			if(doc != null) this.resolve(doc); 
			else return findGPS(venue);
			return this.promise;
		})).

		//return the GPS
		then(function(doc){
			if()
		})
	});


	return this.promise;
})



function syncVenues = p.async(function(typeset){

	this.total = typeset['venues'].length;
	this.data = typeset;




	var findGPS = p.sync(function(venue){
		
		//GPS Search Query within 10 meters
		db['venue'].find({
			location: { $near : {
				$geometry : {type: "Point", coordinates : [venue.location.gps[0],venue.location.gps[1]]},
				$maxDistance : 10
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
			}
		}).then(function())
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




	_.each(typeset['venue'],function(venue,i){

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
				doc = mergeDocs(doc,venue);
				returdoc.save();
			}else{
				console.log('creating new venue in database');
				var n = new db['venue'](venue);
				n.save(function(err,newv){
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
	1. check to make sure all events have venues...
	2. ----
*/

var validate = p.sync(function(typeset){

	_.each(typeset['event'],function(e,i){
		if(e.venue == null){
			console.error('validate error: event found without venue!');
			typeset['event'].splice(i,1);
		}
	});

	this.resolve(typeset)
	return this.promise;
});






/*

Syncroniously filter through all fetched data, merge any duplicates and re-arrange data then sync it with the database.

*/

module.exports = p.async(function(dataset,save){



	//split raw data by into types for faster parsing.
	SplitbyType(dataset).

	then(validate).
	
	//fill GPS data.
	then(fillGPS).
	
	//merge any event duplicates.
	then(filterDuplicates).
	
	//find events that have venues that are in the data set and transfer the events over to the venues.
	then(eventsToVenues).
	
	//sync values
	then(syncVenues).
	
	//sync events
	then(syncEvents).

	//sync artists
	then(syncArtists)

	return this.promise;
});