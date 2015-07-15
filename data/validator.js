
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
function checkname(v1,v2){
	var t_name1 = v1.name.replace(/\sand\s|\s&\s/,' ');
	var t_name2 = v2.name.replace(/\sand\s|\s&\s/,' ');

	var n_match = fuzzy([t_name1]).get(t_name2);
	var contains = t_name1.match(new RegExp(t_name2,'i')) || t_name2.match(new RegExp(t_name1,'i'));


	if(contains != null || (n_match != null && n_match[0][0] > 0.9)) return true;
	return false;
}

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

	

	checkname(ev1,ev2);
	
	if(ev1.date == ev2.date && v_match[0][0] > 0.9 && sameArtists(ev1.artists,ev2.artists) >= 0){
		return true
	}


	return false
};


match.venue = function(v1,v2){




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
			if (checkname(v1,v2)){
				console.log('matched Names'.bold.green,v1.name.inverse,v2.name)
				return true
			} 
			else return false;
		}

	
	//1/200 this will happen and and its not guaranteed to work. 
	}else{
		//console.log("CHECK NAME 2")
		if (checkname(v1,v2)){
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





/*
Merge Venue:
 	platforms ->
 	name ->
	location ->
	links ->
	tags ->
	phone ->
	banners ->
	age ->
	events ->
*/
var merge = {};
merge.venue = function(e1,e2,priority){//priority boolean defaults to true
	if(e1 == null || e2 == null) return e1 || e2 || null;
	

	var merged = {platforms:[],events:[]};

	//prioritize based on how many external links
	var weight = defaultWeight(e1,e2);
	var i1 = weight[0], i2 = weight[1];

	//prioritize based on creation date
	

	if(priority != null && priority == false) i2 = 1337;

	
	//priority dicision making.
	_.each(e1.platforms,function(plat){
		i1+= MergePriority[plat.name]
	});
	_.each(e2.platforms,function(plat){
		i2+= MergePriority[plat.name]
	});


	//platforms ->
	merged.platforms = _.uniq(_.union(e1.platforms,e2.platforms),'name','id');


	//names ->
	if(i1 >= i2) merged.name = e1.name
	else merged.name = e2.name


	//location ->
	var loc = null;
	if(e2.location.confirmed && e1.location.confirmed){
		if(i2 >= i1) loc = e2.location;
		else loc = e1.location;
	}
	else if(e2.location && e2.location.confirmed) loc = e2.location;
	else if(e1.location && e1.location.confirmed) loc = e1.location;


	//links ->
	merged.links = _.uniq(e1.links,e2.links);

	//->tags
	merged.tags = _.uniq(e1.tags,e2.tags,function(tag){
		if(_.isNumber(tag)) tag = tag.toString();
		return tag.toLowerCase();
	})

	//phone ->
	if(i1 >= i2 && e1.phone != null) merged.phone = e1.phone;
	else merged.phone = e2.phone;

	//banners ->
	merged.banners = _.uniq(_.union(e1.banners,e2.banners));

	//age ->
	if(i1 >= i2 && e1.age != null) merged.age = e1.age;
	else merged.age = e2.age;

	//events ->

	_.each(_.union(e2.events,e1.events),function(event){
		var good = true,
			matched = 0;
		_.each(merged.events,function(new_event,i){
			if(_.match['event'](new_event,event)){
				good = false;
				matched = i;
				return false;
			}
		});
		if(!good) merged.events[matched] = merge['event'](merged.events[matched],event,null,i1,i2);
		else merged.events.push(event);
	});
	

	return merged
};







/*
MERGE EVENTS: 


	platforms:-> 
	name: -> 
	date: -> 
	tickets: [{
		price: Number,
		soldout: Boolean,
		url: String,
		broker: String,
		sale: {
			start: Date,
			end: Date,
		},
	}],
	private: ->
	featured: ->
	age: ->
	description: ->
	banners: ->
	location: ->

	artists: {
		headliners:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
		openers:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}]
	},

*/

//search for event duplicates in venue event list and merge them if neccesary.
merge.event = function(e1,e2,priority,count1,count2){
	if(e1 == null || e2 == null) return e1 || e2 || null;
	

	var weight = defaultWeight(e1,e2);
	var i1 = weight[0], i2 = weight[1];
	
	var merged = {artists:{headliners:[],openers:[]}};
		
	if(priority != null && priority == false) i2 = 1337;


	//platforms ->
	merged.platforms = _.uniq(_.union(e1.platforms,e2.platforms),'name','id');

	//name -> (required)
	if(i1 >= i2) merged.name = e1.name
	else merged.name = e2.name

	//date -> (required)
	if(i1 >= i2) merged.date = e1.date
	else merged.date = e2.date	

	//tickets ->
	merged.tickets = _.uniq(_.union(e1.tickets,e2.tickets),'url');

	//private ->
	if(i1 >= i2 && e1.private != null) merged.private = e1.private
	else merged.private = e2.private

	//featured ->
	if(i1 >= i2 && e1.private != null) merged.private = e1.private
	else merged.private = e2.private

	//age ->
	if(i1 >= i2 && e1.private != null) merged.private = e1.private
	else merged.private = e2.private

	//description ->
	if(i1 >= i2 && e1.description != null) merged.description = e1.description
	else merged.description = e2.pdescription

	//banners ->
	merged.banners = _.uniq(_.union(e1.banners,e2.banners));

	//location ->
	if(i1 >= i2 && e1.location != null) merged.location = e1.location
	else merged.location = e2.location

	//artists ->

		//headliners
		_.each(_.union(e2.artists.headliners,e1.artists.headliners),function(artist){
			var good = true, matched = 0;
			_.each(merged.artists.headliners,function(new_artist,i){
				if(_.match['event'](new_artist,artist)){
					good = false;
					matched = i;
					return false;
				}
			});
			if(!good) merged.artists.headliners[matched] = merge['artist'](merged.artists.headliners[matched],event,null,i1,i2);
			else merged.artists.headliners.push(event);
		});

		//openers
		_.each(_.union(e2.artists.openers,e1.artists.openers),function(artist){
			var good = true, matched = 0;
			_.each(merged.artists.openers,function(new_artist,i){
				if(_.match['event'](new_artist,artist)){
					good = false;
					matched = i;
					return false;
				}
			});
			if(!good) merged.artists.openers[matched] = merge['artist'](merged.artists.openers[matched],event,null,i1,i2);
			else merged.artists.openers.push(event);
		});
}





//SMART DEMAND MERGING BASED ON PLATFORM WEIGHT.
function mergeDemand(doc1,doc2){
	if(doc1 == null || ddoc2 == null) return doc1 || doc2 || null;
	
	var weight =  deafaultWeight(doc1,doc2);
	var i1 = weight[0],i2 = weight[1];
	

	//documents get weighted by platfoms
	return (doc1.demand*i1 + doc2.demand*i2)/(i1+i2);
}


function deafaultWeight(e1,e2){

	var i1 = _.reduce(e1.platforms,function(total,plat){return total+MergePriority[plat.name]});
	var i2 = _.reduce(e2.platforms,function(total,plat){return total+MergePriority[plat.name]})
	
	return [i1,i2]
}

/*
merge Artists
platforms ->
name    ->
demand  ->
created ->
links   ->
banners ->
members ->
isGroup ->
*/



function artistWeight(e1,e2){
	var w = defaultWeight(e1,e2)
	i1 = w[0]
	i2 = w[1]



	if(e1.created != null && e2.created != null){
		if(e1.created < e2.created){
			i1*= 1.5; //TEST
		}
	}
	
	

	return [i1,i2]
}



merge.artist = function(e1,e2,priority){
	if(e1 == null || e2 == null) return e1 || e2 || null;
	var i1 = 0,i2 = 0;
	var merged = {};
	if(priority != null && priority == false) i2 = 1337;

	var weight = artistWeight(e1,e2);
	var i1 = weight[0], i2 = weight[1];



	//platforms ->
	merged.platforms = _.uniq(_.union(e1.platforms,e2.platforms),'name','id');

	if(i1 >= i2 && e1.name != null) merged.name = e1.name
	else merged.name = e2.name 

	//private ->
	if(i1 >= i2 && e1.private != null) merged.private = e1.private
	else merged.private = e2.private
	

	//demand ->
	merged.demand =  mergeDemand(e1.demand,e2.demand);


	//created->
	if(i1 >= i2 && e1.created != null) merged.created = e1.created
	else merged.created = e2.created

	//links ->
	merged.links = _.uniq(_.union(e1.links,e2.links));

	//banners ->
	merged.banners = _.uniq(_.union(e1.banners,e2.banners));

	//members ->
	merged.members = [];

	_.each(_.union(e1.members,e2.members),function(membr){
		var duplicate = null;
		_.each(merged.members,function(new_membr,i){
			if(match['artist'](membr,new_membr)){
				duplicate = i;
				return false;	
			}
		})
		if(duplicate != null) merged.members[duplicate] = merge['artist'](merged.members[duplicate],membr);
		else merged.members.push(membr);
	});

	//isGroup ->
	merged.isGroup = merged.members.length > 0 ? true : false;

}




/*

FILTER OUT DUPLICATES BY MATCHING BY TYPE.

*/
var filterDuplicates = p.sync(function(typeset){
	_.each(typeset,function(dataset,type){

		var l = dataset.length;

		//match and merge
		for(var i = 0;i<l;i++){
			if(dataset[i] == null) continue;
			for(var j = 0;l;j++){
				if(dataset[j] == null || j == i) continue;
				if(match[type](dataset[i],dataset[j])){
					console.log('MERGING...'.bgBlue,dataset[i].name.inverse,dataset[j].name);
					dataset[i] = merge[type](dataset[i],dataset[j]);
					dataset[j] = null;
				}
			}
		}

		//delete nulls
		dataset = _.filter(dataset, function(n) {
		  return n != null;
		});

		//reference back
		typeset[type] = dataset;




		//LOG
		console.log(('FILTER '+type+' : ').bgBlue,('-'+(l-dataset.length)).yellow.bold,(dataset.length+'/'+l).cyan.bold);
		console.log(util.inspect(_.map(dataset,function(dat){
			return dat.name;
		}).sort(), {showHidden: false, depth: null}));		
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



	/*

	FIND BY ID
	
	*/
	var findById = p.sync(function(venue){
		db['venue'].findOne({
			platformIds: {$in : _.map(venue.platforms,function(plat){
				return plat.name+'/'+plat.id
			})}
		}).then(function(doc,err){
			if(err) return this.reject(err);
			if(doc != null) return this.resolve(doc); 
			this.promise = findByGPS(venue); //move down to try and find by gps
		}.bind(this));

		return this.promise;
	});

	/*

	ELSE FIND BY GPS
	
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

				//console.log('Found venue entry in DB with similar GPS..comparing name',venue.name,'with best match ->',matches[0]);
				
				if(matches != null && matches[0][0] > 0.8){
					this.resolve(venues[m_list.indexOf(matches[0][1])]);
				}
			}else this.promise = function(){ return findByName(venue) }.bind(this);
		}.bind(this));

		return this.promise;
	});


	/*

	ELSE FIND BY NAME
	
	*/
	var findByName = p.sync(function(venue){

		//search by name
		db['venue'].find(
			{$text: {$search: venue.name }},
			{score: {$meta: "textScore"}}
		)
		.sort({score: {$meta: "textScore"}})
		.limit(5)
		.then(function(venuelist,err){
			if(err) return this.reject(err);
			if(venuelist != null && venuelist.length > 0){
				var m_list = _.map(venuelist,function(v){
					return v.name;
				});
				var matches = fuzzy(m_list).get(venue.name);
				if(matches != null && matches[0][0] > 0.8){
					this.resolve(venuelist[m_list.indexOf(matches[0][1])]);
				}else{
					this.resolve(venuelist[0])
				}
			}else{
				this.resolve(null);
				
			}
		}.bind(this));
		

		return this.promise;
	});





	_.each(typeset['venue'],function(venue,i){
		findById(venue)

		.then(p.sync(function(doc,err){
			if(err) return this.reject(err);
			if(doc == null) return this.resolve(null);

			return db['venue'].populate(doc,{
				path: 'events.artists'
			})
		}))

		.then(function(doc,err){
			if(err) return this.reject(err);
			if(doc == null){
				console.log('creating new venue in database',venue.name);
				var new_venue = new db['venue'](venue);
				new_venue.validate(function(err){
					if(err) console.error('DB.VENUE VALIDATION ERR:'.bold.bgRed,err);
				});

				return new_venue.save();
			}

			console.log('FOUND DB.VENUE & MERGING...',venue.name,doc.name);
			return doc.save(merge['venue'](doc,venue));	
		})

		.then(function(v,err){
			console.log('successfully saved venue :',v.name);
			this.checkAsync();
		}.bind(this))

	}.bind(this));

	return this.promise;
});




var syncArtists = p.async(function(data){



	var findById = p.sync(function(artist){
		db['artist'].findOne({
			platformIds: {$in : _.map(artist.platforms,function(plat){
				return plat.name+'/'+plat.id
			})}
		}).then(function(doc,err){
			if(err) return this.reject(err);
			if(doc != null) return this.resolve(doc); 
			
			this.promise = findByName(venue); //try and find artist (or group) by name
		}.bind(this))

		return this.promise;
	})

	var findByName = p.sync(function(artist){
		//search by name
		db['artist'].find(
			{$text: {$search: artist.name }},
			{score: {$meta: "textScore"}}
		)
		.sort({score: {$meta: "textScore"}})
		.limit(5)
		.then(function(artistlist,err){
			if(err) return this.reject(err);
			if(!_.isArray(artistlist)) return this.resolve(null);

			var m_list = _.map(artistlist,function(v){
				return v.name;
			});

			var matches = fuzzy(m_list).get(artist.name)

			if(_.isArray(matches) && matches[0][0] > 0.8) return this.resolve(artistlist[m_list.indexOf(matches[0][1])]);
			
			return this.resolve(null)
		}.bind(this))

		return this.promise;
	})


	var findByMembers = p.sync(function(artist){
		//TODO
	})



	this.data = data['artist'];
	this.count = data['artist'].length;

	_.each(data['artist'],function(artist,i){
		
		findById(artist)
		
		.then(function(doc,err){

			if(err) return this.reject(err);

			if(!_.isOject(doc)){
				console.log('creating new artist in database',artist.name);
				var new_artist = new db['venue'](venue);
				new_artist.validate(function(err){
					if(err) console.log('DB.ARTIST VALIDATION ERR:'.bold.bgRed,err);
				});
				return new_artist.save();
			}

			console.log('FOUND DB.ARTIST & MERGING...',artist.name,doc.name);
			return doc.save(merge['artist'](doc,artist));
		}.bind(this))
		.then(function(v,err){
			console.log('successfully saved artist :',v.name);
			this.checkAsync();
		}.bind(this))
	});

	return this.promise;
});










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