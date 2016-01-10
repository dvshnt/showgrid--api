var _ = require('lodash'); 
var Promise = require('bluebird'); //promise methods
var p = require('../pFactory'); //p methods
var db = p.make(require('mongoose')); //database
var Artist = require('./artist'); //artist mongoose model
var colors = require('colors'); //color console
var merge = require('../sync/merge'); //merge methods
var match = require('../sync/match'); //match methods
var util = require('../util.js'); //util methods
var colors = require('colors');
var max_banners = 20;
var fuzzy = require('fuzzyset.js') //fuzzy matching for finding models that are similar.
var log = require('../util').log //log imported from homemade utils
var gps = require('../gps') //google gps validation
var addressGPS = gps.get //functions from the gps file
var parseGPS = gps.toArray //functions from the gps file
var formatGPS = gps.toObj //functions from the gps file
var null_filter = require('../util').null_filter //remove any items that are null from an array
var trimName = require('../util').trimName; //some handy name trimming, mod as you see fit.

var Event = require('./event');






var venueSchema = new db.Schema({
	platformIds:[{type:String,required:true,_id:false}],
	platforms: [{
		name: 	{type:String,required:true},
		id: 	{type:String,required:true},
		_id: false
	}],
	time: {
		created: { type: Date, default: Date.now },
		updated: Date,
	},
	active: {type: Boolean, default: false},
	name: {type:String, required: true, index: 'text'},
	description: {type:String},
	location: {
		timezone: String,
		components: {
			city: String,
			state: String,
			statecode: String,
			zip : String,
			country: String,
			countrycode: String,
		},
		address: {type: String, required: true},
		_gps: {type: [Number], index: '2dsphere'},
		status: {type: Number},
	},
	links: [{
		domain:String,
		url:String,
		_id: false
	}],
	tags: [String],
	phone: {type: String,index: 1},
	demand: {type:Number},
	banners: [{
		width: Number,
		height: Number,
		url: String,
		local:String,
	}],
	colors: [Number],
	age: Number,
	events: [{type:db.Schema.Types.ObjectId, ref: 'Event'}], //all events for this venue
});





/*VALIDATION*/
venueSchema.path('platforms').validate(function(value){
  return value.length;
},"'platforms' cannot be an empty array");

venueSchema.path('platformIds').validate(function(value){
  return value.length;
},"'platforms' cannot be an empty array");






//SETTERS/GETTERS

//flip gps coordinates (there is a wierd bug with some of the apis where the gps coords are in reverse)
// function flip_gps(gps){
// 	if(gps == null) return null
// 	return [gps[1],gps[0]]
// }

venueSchema.virtual('location.gps').get(function(){
	if(this.location._gps != null){
		return {
			lat:this.location._gps[1],
			lon:this.location._gps[0]
		}
	}return {
		lat:null,
		lon:null
	}
}).set(function(gps){
	if(gps.lon != null && gps.lat != null ) this.location._gps = [parseFloat(gps.lon),parseFloat(gps.lat)];
	else console.log('set location.gps -> invalid GPS virtual Object.');
})




/*VALIDATION*/
venueSchema.pre('save',function(next){
	if(_.isString(this.phone)){
		var p =  this.phone.match(/\d/g)
		if(p != null){
			this.phone = p.join('');
		}
	}
	next();
});


venueSchema.pre('validate',function(next){
	if(this.banners == null) this.banners = [];
	this.name = this.name.replace(/[\\\+\@\^\*\(\)]/,'')


	if(this.banners.length > 0) this.banners = _.takeRight(_.sortBy(this.banners,function(b){return b.url}),max_banners);

	if(this.location.address == null){
		console.log('bad address'.yellow,this.name.toString().green,this.location,this.events.length.toString().cyan);
		delete this;
	}

	this.time.updated = Date.now();

	this.platformIds = _.map(this.platforms,function(plat){
		return plat.name+'/'+plat.id;
	});

	this.links = _.map(this.links,function(link){
		if(_.isString(link)) return {url:link}
		return link
	});
	next();
});


venueSchema.path('location.status').validate(function(value){
	if(value == null) return true;
	else return value;
  return value;
},"Cannot save a venue with location status of 0 because it probably does not exist!");


venueSchema.path('platforms').validate(function(value){
  return value.length;
},"'platforms' cannot be an empty array");


venueSchema.path('platformIds').validate(function(value){
  return value.length;
},"'platforms' cannot be an empty array");

















/*
UPDATE
	sync venue (and all nested events/artists) with all the scrapers and save it.
*/

var scrapers = require('../scrapers.js') //scrapers
var cfg = require('../config.json') //we need the cfg file to get the keys

var	keys = 
{
	facebook: cfg.apis.facebook.token,
	eventful: cfg.apis.eventful.keys[0],
	jambase: cfg.apis.jambase.keys[0],
	reverbnation: null,
	ticketfly: null
}









/*update active*/

// venueSchema.methods.update = function(cb){

// 	var model = this;

// 	function save(res,rej){ //promise reject and resolve
// 		return this.save(function (err){
// 			if (err) return rej(new Error(err)); //if update failed...reject the promise so nothing more happens down the pipeline.
// 			console.log('venue updated & saved'.cyan)
// 			else return res(this) //resolve
// 		});
// 	}

// 	//for each scraper platform, we will pass that scrapers platform id of the venue (located in venue.platforms[x].name, if there is one. And will pass that platforms key, if there is one.
// 	Promise.map(scrapers,function(plat,platform_name){
// 		console.log('get platform ->')

// 		var plat_id = _.where(this.platforms,{name:platform_name},'id')[0]; //get the platform id.

// 		if( plat_id == null ) return Promise.resolve(null);

// 		//get venue (all scrapers should have a get method, otherwise this will break.)
// 		plat.get.venue({
// 			id: plat_id,
// 			key: keys[platform_name] 
// 		})

// 		//filter the json
// 		.then(plat.filter.venue)

// 		//merge with new data, we curry the merge function with new and old models.
// 		.then(merge.venue.bind(this,this,venue_json,false,false)) //NO overwriting, NO checking.

// 		//now we have to 
		


		
// 	}.bind(this),{concurrency: 1}) //we need to be in sync mode because we have to merge every time we update the document with a different api
	
// 	//save the venue.
// 	.then(function(){
// 		return new Promise(save.bind(this))
// 	}.bind(this))
// 	.then(cb.bind(this))
// }
























//MAIN SYNC LOGIC


/* 
	since the events are seperate documents, they need to be saved seperately.

	When venue merge happens and we are diffing events within that venue, we check to see if the event is an actual document or just raw json data.
	when merge finishes, we get back a mix of json data and documents. after venue is saved, we need to save each of its events seperately and reference them.

	
	venues merged,
	events are extracted and referenced back to venue when venue gets saved.
	after events are saved 


*/



venueSchema.statics.Sync = function(raw_json,overwrite){
	var self = this;

	//raw_json.events = extractEventsJSON(raw_json);

	var venue = new Venue(raw_json);

	return new Promise(function(res,rej){
		venue.validateAsync().then(function(){
			if(overwrite == true){
				console.log('OVERWRITE VENUE'.red.bgYellow)
				//fill gps and sync venue
				return self.fillGPS(venue).then(self.syncVenueFull.bind(self))
			}
		
			//try and syncvenue by ID
			return self.syncVenueById(venue).then(function(res){

				//SYNC VENUE BY ID GOOD
				if(res != false){
					delete res;
					return p.pipe(null);
				}else{
					console.log('could not sync venue by id..'.yellow + ' (creating new entry)'.cyan)
					return self.fillGPS(venue).then(self.syncVenueFull.bind(self))
				}
			})	
		}).then(function(){
			delete venue;
			res(null)
		}).catch(function(err){
			rej(err)
		})
	})
}


















var min_gps_status = 1;

venueSchema.statics.Validate = function(venue){
	return new Promise(function(res,rej){
		venue.validate(function(err){
			if(err) rej(err)
			else{
				console.log('venue validated'.green,venue.name);
				res(null)
			}
		})
	})
};















//extract nested events json objects from venues and save them as seperate doucments, returning and array of ID's to be saved in the venue

var extractEventsJSON = function(venue){
	var id_array = [];
	var pipe = Promise.resolve();


	return Promise.map(venue.events,function(event_json){


		//bad venue events json.
		if(typeof event_json != 'object'){
			console.log("extractEventsJSON did not recieve a proper event object, (may have been an ID or null ? ) ".bgRed);
			return promise.resolve(null);
		}


		//event has no id (new event)
		if(event_json.id == null){
			
			var event_doc = new Event(event_json);
			console.log("Create a new Event ("+String(even_doc.id).green+") for venue [",String(venue.name).magenta,']');
			
			id_array.push(event_doc.id);
			
			event_doc.save(function(err,succ){
				if(err){
					console.log("EVENT SAVE FAILED".bgRed,err);
				}
			})
			return Promise.resolve(null);			
		}


		//event json has id, try and find event in database.
		return Event.findOneAsync(event_json.id).then(function(event_doc){

			//could not find event in database, create new.
			if(event_doc == null){
				event_doc = new Event(event_json);
				console.log("Faild to find Event in Database, Create a new Event ("+String(even_doc.id).green+") for venue [",String(venue.name).magenta,']');
			

			//found event in database, save it with the new json data.
			}else{
	
				event_doc.set(event_json);
				console.log("Save Existing Event ("+String(even_doc.id).green+") for venue [",String(venue.name).magenta,']');
			
			}

			id_array.push(event_doc.id);

			event_doc.save(function(err,succ){
				if(err){
					console.log("EVENT SAVE FAILED".bgRed,err);
				}
			})
		})
	}).then(function(){
		venue.events = id_array;
		return Promise.resolve(venue)
	})
}













	




/* ------------------------  */
/* ------------------------  */
/* GET VENUE GPS FROM GOOGLE */
/* ------------------------  */
/* ------------------------  */
/*
We need to get the GPS data for venue and events to compare them later on!
GPS data is brought to us by GOOGLE the AI.
*/
venueSchema.statics.fillGPS = function(venue){
	var addr = {};
	addr.address = venue.location.address;


	if(venue.location.components != null){
		addr.countrycode= venue.location.components.countrycode
		addr.statecode= venue.location.components.statecode
		addr.country= venue.location.components.country
		addr.zip= venue.location.components.zip
		addr.city= venue.location.components.city
	}
	
	return addressGPS(venue.name,addr)
	.then(function(loc){
	


		if(loc.status == 2){
			if(_.isArray(venue.tags)) venue.tags = venue.tags.concat(loc._tags)
			else venue.tags = loc._tags;
		
			
			venue.location = _.clone(loc);
			venue.location._gps = [parseFloat(loc.gps.lon),parseFloat(loc.gps.lat)];
			venue.name = loc._name
			
			console.log('SYNC GPS PLACE: '.bold.cyan,venue.name.magenta,loc._name.inverse);
		}else if(loc.status == 1){

			venue.location = _.clone(loc);
			venue.location._gps = [parseFloat(loc.gps.lon),parseFloat(loc.gps.lat)];

			console.log('SYNC GPS GEOLOC: '.bold.yellow,venue.name.magenta);
		}else if(loc.status == 0){
			
			//if(venue.location.gps != null) venue.location.gps = formatGPS(venue.location.gps);
			venue.location.status = 0;
			console.log('SYNC GPS FAIL: '.red,venue.name.magenta,'\n',venue.location);
		}else{
			
			venue.location.status = 0;
			console.log('SYNC GPS ERR')
		}

		if(venue.location.gps != null && (isNaN(venue.location.gps.lat) || isNaN(venue.location.gps.lon))) {
			venue.location.gps = null;
		}

	

		return p.pipe(venue)
	})
}





/* -------------------  */
/* -------------------  */
/* VENUE SYNC FUNCTIONS */
/* -------------------  */
/* -------------------  */






/* FIND VENUE BY PLATFORM ID */
venueSchema.statics.findByPlatformIds = function(venue){

	return this.findOneAsync({
		platformIds: {$in : venue.platformIds}
	})
	.then(function(found_venue){
		if(found_venue != null){
			console.log('MATCHED VENUE BY ID'.green,found_venue.name);
			return p.pipe([found_venue]);
		}
		else return p.pipe(null)
	}.bind(this))
};









/*

ELSE FIND VENUE BY GPS

*/
venueSchema.statics.findByGPS = function(venue){
	//console.log("FIND BY GPS")


	if(venue.location.gps == null || venue.location.gps.lat == null || venue.location.gps.lon == null) return p.pipe(null)

	//GPS Search Query within 10 meters
	return this.find({
		'location._gps':{
			$nearSphere : {
				$geometry : {type: "Point", coordinates : venue.location._gps},
				$maxDistance : 100 //meters
			}
		}
	}).limit(10)
	.execAsync()
	.then(function(venues){
		if(venues == null || venues.length == 0) return p.pipe(null)

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
		}else{
			console.log('FIND BY GPS FAILED')
			return p.pipe(null);
		} 

	}.bind(this))
};








/*

ELSE VENUE FIND BY NAME

*/
venueSchema.statics.findByName = function(venue){
	//console.log("FIND BY NAME")
	return this.find(
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
		if(err) this.reject(err)
		else{
			console.log('VENUE SAVED'.bold.bgCyan,doc.name);
			this.resolve(null)
		}
	}.bind(this));
	return this.promise;
});
venueSchema.statics.saveVenue = saveVenue;














venueSchema.statics.checkMerge = function(doc,venue_json){
	var self = this;


	//double check that venues are MATCHING.
	if(match.venue(doc,venue_json)){

		//do a query on venue again to populate all venue events with json data.
		return Venue.findById(doc.id).populate('events').execAsync().then(function(found_doc){

			//merge the venues with new events json data
			return merge.venue(found_doc,json,null)

			//extract merged events data and create new Events, returning the final venue json with events as array of ids.
			.then(self.extractEventsJSON).then(function(new_json){

				//set new venue json and return document.
				found_doc.set(new_json);
				return Promise.resolve(found_doc);
			

			})
		})
		//save.
		.then(self.saveVenue) 


		console.log('DB FULL VENUE MERGE:'.bold.green,venue.name,doc.name.inverse);
	}else{
		return Promise.resolve(null)
	}
}







//Venue Full Sync
venueSchema.statics.syncVenueFull = function(venue,check_val){
	var self = this;

	var check_val = check_val || true;

	//try to find by gps
	return this.findByGPS(venue)
	

	//try to find by name
	.then(function(found){
		if(found == null) return self.findByName(venue)
		else return p.pipe(found)	
	})


	//finally...
	.then(function(docs){
		var pipe = null;

		//if venue not found, create a new one
		if(docs == null || docs.length == 0){
			console.log('DB FULL VENUE NEW:'.bold.cyan,venue.name);
			pipe = p.pipe(venue);
		
		//else merge
		}else{
			console.log('VENUE MATCHES..'.bgGreen,_.map(docs,function(d){return d.name.bold.cyan}))
			//go through all text search matches and do a single merge + return if a good match, otherwise go to end
			_.each(docs,function(d){

				var merge_pipe = checkMerge(d,venue);
				if(merge_pipe != null) pipe = pipe.then(merge_pipe);

			});
			
			//Failed to merge, probably because answered NO to all prompts.
			if(pipe == null){
				console.log('DB FULL VENUE NEW:'.bold.cyan,venue.name);
				pipe = p.pipe(venue);				
			}
		}
		return pipe
	});
};















//Venue Id sync
venueSchema.statics.syncVenueById = function(venue){

	return this.findOneAsync({
		platformIds: {$in : venue.platformIds},
	}).then(function(doc){

		if(doc == null) return p.pipe(null);
		
		console.log('FOUND DB.VENUE BY ID'.bold.white.bgGreen,venue.name,doc.name.inverse);
		return checkMerge(doc,venue);

	})
}














/* MODULE EXPORT */
var Venue = db.model('Venue',venueSchema);
Promise.promisifyAll(Venue);
Promise.promisifyAll(Venue.prototype);
module.exports = Venue;
