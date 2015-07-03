
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
	var maxd = 0.01;

	var d = Math.sqrt((coord1[0]-coord2[0])*(coord1[0]-coord2[0])+(coord[1]-coord2[1])*(coord[1]-coord2[1]));

	if(d<maxd) return true
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
	var split = {};

	_.each(dataset,function(doc){
		if(split[doc.is] == null) split[doc.is] = [];

		split[doc.is].push(doc);
		delete doc.is;
	});

	this.resolve(split);

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






module.exports = p.async(function(dataset,save){
	SplitbyType(dataset)
		.then(fillGPS)
		.then(filterEventDuplicates)
		.then(filterVenueDuplicates)
		.then(filterArtistDuplicates)
		.then(eventsToVenues)
		.then(venuesFromEvents)
		.then(syncVenues)
		.then(syncEvents)
		.then(syncArtists)
	return this.promise;
});