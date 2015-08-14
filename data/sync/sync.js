var _ = require('lodash');
var db = require('../data');
var Promise = require('bluebird');
var fuzzy = require('fuzzyset.js'); //fuzzy matching for finding models that are similar.
var p = require('../pFactory.js'); //promise factory shortucts.
var colors = require('colors');


Promise.longStackTraces();


var merge = require('./merge');
var match = require('./match');



var addressGPS = require('../gps');



var validate = function(dataset){

	_.each(dataset,function(doc,i){


		//translate geocode to interger
		if(doc.location != null && doc.location.gps != null && doc.location.gps.length != 0){
			doc.location.gps[0] = parseInt(doc.location.gps[0]);
			doc.location.gps[1] = parseInt(doc.location.gps[1]);
		}
		

		function removeSpecials(obj){
			for (k in obj){
				if(_.isObject(obj[k])) removeSpecials(obj[k]);
				else if(_.isString(obj[k])) obj[k] = obj[k] = obj[k].replace(/\$|\%|\^|\*|\(|\)|\_|\=|\[|\]|\{|\}|\;|\'|\"|\\|\<|\>|\]/g,'');
			}
		}


		removeSpecials(doc);


		if(doc == null) return;


		if(doc.is == null){
			dataset[i] == null;
		}


		_.each(doc.banners,function(banner){
			if(!_.isString(banner)){
				console.error('validate ERR'.bold.bgRed,'banners not string',doc.platforms)
				banner = null;
			} 
		});


		if(doc.platforms == null){
			console.error('validate ERR'.bold.bgRed,'no platform for '.red,doc.name);
			dataset[i] = null;
		}


		if(doc.is == 'event'){
			if(doc.venue == null){
				console.error('validate ERR'.bold.bgRed,'event w/o venue'.red);
				dataset[i] = null;
			}

			if(doc.name == null){
				console.error('validate ERR'.bold.bgRed,'event w/o name'.red);
				dataset[i] = null;				
			}
		}


		if(doc.is == 'venue'){

			if(doc.location == null){
				console.error('validate ERR'.bold.redBg,'venue w/o location')
				dataset[i] = null;
			}


			if(doc.name == null){
				console.error('validate ERR'.bold.redBg, 'venue w/o name'.red,doc.platforms);
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

	//console.log (dataset);



	return p.pipe(dataset);
};



//Validator Document Types.
var types = ['venue','event','artist'];

var splitByType = function(dataset){


	var typeset = {};
	_.each(types,function(type){
		typeset[type] = [];
	});

	_.each(dataset,function(doc){
		if(typeset[doc.is] == null){
			console.log('parameter ["is"] ERR:'.bgRed.bold,doc.is,'is not a type of',types,doc.name);
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

	return p.pipe(typeset)
};




var flipEvents = function(typeset){
	

	//flip events to display venues on top
	var venues = _.map(typeset['event'],function(e){
		var venue = _.clone(e.venue);
		if(venue.name == null){
			venue.name = e.name;
		}
		venue.events = [e];
		delete venue.is;
		delete e.venue;
		return venue;
	});


	//console.log(util.inspect(typeset, {showHidden: false, depth: null}));


	typeset['venue'] = typeset['venue'].concat(venues);

	delete typeset['event'];



	console.log('DONE FLIP EVENTS')
	return p.pipe(typeset);
}












/*

////////////////////
GET GPS
////////////////////

We need to get the GPS data for venue and events to compare them later on!
GPS data is brought to us by GOOGLE the AI.

*/



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

	var delay = 300;
	
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
















/*

FILTER OUT DUPLICATES BY MATCHING BY TYPE.

*/





var filterDuplicates = function(typeset){

	var max_dupl = 2;






	_.each(typeset,function(dataset,type){
	

		var type = type;
		var l = dataset.length;




		//match and merge
		for(var i = 0;i<l;i++){
			if(j == i) continue;
			if(dataset[i] == null) continue;
		 	var dupl_count = 0;
			for(var j = 0;j<l;j++){
				if(dataset[j] == null || j == i) continue;
				if(match[type](dataset[i],dataset[j])){
					console.log('FILTER MERGE:'.bgBlue,dataset[i].name.inverse,dataset[j].name);
					dataset[i] = merge[type](dataset[i],dataset[j]);
					dataset[j] = null;
				}
			//	console.log(j+' / '+l);
			}
			console.log('checked ',i,'/',j);
		}


		//delete nulls
		typeset[type] = _.filter(dataset, function(n) {
		  return n != null;
		});




		//LOG
		console.log(('FILTER '+type+' : ').bgBlue,('-'+(l-typeset[type].length)).yellow.bold,(typeset.length+'/'+l).cyan.bold);

		// console.log(util.inspect(_.map(typeset[type],function(dat){
		// 	return [dat.name,dat.platforms,dat.location];
		// }).sort(), {showHidden: false, depth: null}));		
	});

	return p.pipe(typeset);
};

















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




function linkEventArtists(typeset){
	_.each(typeset['venue'],function(venue){
		_.each(venue.events,function(e){


			e.artists.headliners = _.map(e.artists.headliners,function(a){
				var id = _.findIndex(typeset['artist'],{'name':a.name});
				if(id != null) return typeset['artist'][id]._id;
				return null;
			});				



			e.artists.openers = _.map(e.artists.openers,function(a){
				var id = _.findIndex(typeset['artist'],{'name':a.name});
				if(id != null) return typeset['artist'][id]._id;
				return null;
			});
			

			// console.log('LINK E.A'.bgBlue,e.artists.headliners,e.artists.openers);
		});
	});
	
	console.log('DONE LINK ARTISTS');
	return p.pipe(typeset);
}


















var syncVenues = p.async(function(typeset){

	this.total = typeset['venue'].length;
	this.data = typeset;


	if(this.total == 0) this.resolve(typeset);

	//replace artists with id's



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
			this.resolve(findByGPS(venue)); //move down to try and find by gps
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
		then(function(venues){
			
			if(venues != null && venues.length > 0){

				//Higher precision name check
				var found = null;
				_.each(venues,function(v,i){
					if(match.checkname(venue,v) == true){
						found = v;
						return false
					}
				}.bind(this));


				if(found){
					console.log('FIND BY GPS');
					this.resolve(found);
				} 
				
				else this.resolve(findByName(venue));

			}else this.resolve(findByName(venue));
		}.bind(this));

		return this.promise;
	});


	/*

	ELSE FIND BY NAME
	
	*/
	var findByName = p.sync(function(venue){
		
		//search by name
		db['venue'].find(
			{ $text : { $search : venue.name } }, 
        	{ score : { $meta: "textScore" } }
        )
        .limit(5)
        .sort({ score: { $meta: "textScore" } })

		.then(function(venues){
			//console.log('FIND BY NAME')
			if(venues != null && venues.length > 0){

				//Higher precision name check
				var found = null;
				_.each(venues,function(v,i){
					if(match.checkname(venue,v) == true){
						found = v;
						return false
					}
				}.bind(this));


				//console.log('FIND BY NAME',found)
				this.resolve(found);
				

			}else this.resolve(null);
			
		}.bind(this));
		

		return this.promise;
	});



	_.each(typeset['venue'],function(venue,i){
		findById(venue)


		.then(p.sync(function(doc){
			//if(err) return this.reject(err);
			if(doc == null){
				console.log('SYNC NEW:'.magenta,venue.name.inverse);
				var new_venue = new db['venue'](venue);
							
				new_venue.save(function(err){
					if(err) return this.reject(err);
					this.resolve(new_venue);
				}.bind(this));

			}else{

				console.log('SYNC MERGE:'.bgBlue,venue.name,doc.name.inverse);
				//this is the complete full new document;
				var new_doc = merge['venue'](doc,venue);
				doc = _.merge(doc,new_doc);
				
				doc.save(function(err){
					if(err) return this.reject(err);
					this.resolve(doc);
				}.bind(this));
			}

			return this.promise;
		}))

		.then(function(v){
			venue[i] = v;
			console.log('SYNC DONE:'.bgBlue,v.name.green);
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
		}).then(function(doc){
			//if(err) return this.reject(err);
			if(doc != null) return this.resolve(doc); 
			
			this.resolve(findByName(artist));
		}.bind(this))

		return this.promise;
	})


	var findByName = p.sync(function(artist){
		//search by name

		db['artist'].find(
			{ $text : { $search : artist.name } }, 
        	{ score : { $meta: "textScore" } }
        ).limit(5).sort({ score: { $meta: "textScore" } })

		.then(function(artistlist){
			//console.log(err,artistlist.length);

			//if(err) return this.reject(err);
			
			if(artistlist == null) return this.resolve(null)



			//Higher precision name check
			var found = null;
			_.each(artistlist,function(a,i){
				//console.log(artist,a);
				if(match.checkname(artist,a,1) == true){
					found = a;
					return false
				}
			}.bind(this));
			console.log(found)
			return this.resolve(found);

		}.bind(this))

		return this.promise;
	})


	this.data = data;
	this.total = data['artist'].length;
	

	if(this.total == 0) this.resolve(data);


	_.each(data['artist'],function(artist,index){
		findById(artist)
		
		.then(p.sync(function(doc){
			//console.log(doc.length,err);
			if(doc == null){
				console.log('creating new artist in database',artist.name);
				var new_artist = new db['artist'](artist);
				
				new_artist.validate(function(err){
					if(err) console.log('DB.ARTIST VALIDATION ERR:'.bold.bgRed,err);
				});

				new_artist.save(function(err){
					if(err) return this.reject(err);
					this.resolve(new_artist);
				}.bind(this));

			}else{
				console.log('FOUND DB.ARTIST & MERGING'.bgBlue,artist.name,doc.name);
				doc = _.merge(doc,merge['artist'](doc,artist));

				doc.save(function(err){
					if(err) return this.reject(err);
					this.resolve(doc);
				}.bind(this));
			}


			return this.promise;
		}))

		.then(function(v){

			data['artist'][index]._id = v._id;
			console.log('successfully saved artist :',v.name,v._id);
			this.checkAsync();
		}.bind(this))

	}.bind(this));

	return this.promise;
});















var extractArtists = function(types){
	_.each(types['venue'],function(venue){
		//console.log(venue.events);
		_.each(venue.events,function(event){
			_.each(_.union(event.artists.headliners,event.artists.openers),function(artist){
				types['artist'].push(artist);
			});
		});
	});
	return p.pipe(types);
};








//Try and do a simple sync to find the documents in the database by their ID
var simpleVenueSync = p.async(function(typeset){


	var sync = p.sync(function(doc,type){
		
		db[type].findOne({
			platformIds: {$in : _.map(doc.platforms,function(plat){
				return plat.name+'/'+plat.id
			})}
		}).then(p.sync(function(found){
			
			if(found == null) return this.resolve(null)

			var updated = merge[type](found,doc);

			found = _.merge(found,updated);

			found.save(function(err){
				if(err) return this.reject();
				this.resolve(found);
			}.bind(this))
		}.bind(this)));

		return this.promise;
	})

	this.data = typeset;

	this.cb = function(){
		console.log('DONE S_SYNC'.bg)
		_.each(typeset,function(dataset,type){
			typeset[type] = _.filter(dataset, function(n) {
		  		return n != null;
			});
		});
	}

	
	this.total = typeset['venue'].length
	_.each(typeset['venue'],function(doc,i){
		sync(doc,'venue').then(function(found){
			if(found){
				typeset['venue'][i] = null;
				console.log('S_SYNC DONE:'.bgGreen,found.name.yellow)
			} 
			this.checkAsync();
		}.bind(this));
	}.bind(this));



	return this.promise;
});














/*

Syncroniously filter through all fetched data, merge any duplicates and re-arrange data then sync it with the database.

*/

module.exports = p.async(function(dataset,save){


	console.log('VALIDATE'.bold.bgBlue,'total: '.yellow,dataset.length.toString().yellow)


	validate(dataset) 		//validate data
	.then(splitByType) 		//split raw data by into types for faster parsing
	.then(flipEvents)  		//flip events to their
	
	.then(filterDuplicates) //merge any data
	.then(extractArtists) 	//extract artists out of each event and link their platform ids to the venue events
	.then(syncArtists) 		//sync all artists and upon save add the document id to the raw artist object to reference it later in syncVenues
	.then(linkEventArtists)
	.then(simpleVenueSync)
	.then(fillGPS)			//fill GPS data.

	.then(filterDuplicates) //filter and merge entries that may not have been found because of slightly different GPS addresses.


	

	.then(syncVenues) 		// sync documents with database , when syncing event artists save it as a map of artist document ids
	.then(function(data){
		this.resolve(data)
	}.bind(this))
	

	return this.promise;
});





