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
var eventSchema = require('./event');





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
	events: [eventSchema], //all events for this venue
	users: [{type:db.Schema.Types.ObjectId, ref: 'User'}], //users that are going to this venue
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









/*TODO*/

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



















var min_gps_status = 2;


//MAIN SYNC LOGIC
venueSchema.statics.Sync = function(raw_json,overwrite){

	var self = this;

	var venue = new Venue(raw_json);
		

	//validate raw json
	return p.sync(function(){
		venue.validate(function(err){
			if(err) this.reject(err);
			else this.resolve(venue)
		}.bind(this))
		return this.promise;
	})()

	.then(function(){
		if(overwrite == true){

			//fill gps and sync venue
			return venue.fillGPS()
			.then(function(venue){
				return self.syncVenue(venue)
			})

		}else{

			//try and syncvenue by ID
			return self.syncVenueById(venue).then(function(res){

				//SYNC VENUE BY ID GOOD
				if(res != false){
					doc = undefined;
					return 

				//SYNC VENUE BY ID BAD, FILL GPS AND DO A FULL SYNC
				}else{
					return venue.fillGPS()
					.then(function(venue){
						self.syncVenue(venue)
					})
				}
			})
		}
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
venueSchema.methods.fillGPS = function(){
	var addr = {};
	addr.address = this.location.address;


	if(this.location.components != null){
		addr.countrycode= this.location.components.countrycode
		addr.statecode= this.location.components.statecode
		addr.country= this.location.components.country
		addr.zip= this.location.components.zip
		addr.city= this.location.components.city
	}
	
	return addressGPS(this.name,addr)
	.then(function(loc){
		if(loc.status == 2){
			if(_.isArray(this.tags)) this.tags = this.tags.concat(loc._tags); else this.tags = loc._tags;
		
			
			this.location = _.clone(loc);
			this.location._gps = [parseFloat(loc.gps.lon),parseFloat(loc.gps.lat)];
			this.name = loc._name
			
			console.log('SYNC GPS PLACE: '.bold.cyan,this.name.magenta,loc._name.inverse);
		}else if(loc.status == 1){

			this.location = _.clone(loc);
			this.location._gps = [parseFloat(loc.gps.lon),parseFloat(loc.gps.lat)];

			console.log('SYNC GPS GEOLOC: '.bold.yellow,this.name.magenta);
		}else if(loc.status == 0){
			console.log('SYNC GPS FAIL: '.red,this.name.magenta,'\n',this.location);
			//if(this.location.gps != null) this.location.gps = formatGPS(this.location.gps);
			this.location.status = 0;
		}else{
			console.log('SYNC GPS ERR')
			this.location.status = 0;
		}

		if(this.location.gps != null && (isNaN(this.location.gps.lat) || isNaN(this.location.gps.lon))) {
			this.location.gps = null;
		}


		return p.pipe(this)
	}.bind(this))
	.catch(function(e){
		console.log('GET GPS ERR'.bgRed,e);
		return p.pipe(this);
	}.bind(this))
}






var overwrite = false;




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
		}else return p,pipe(null);

	}.bind(this))
};








/*

ELSE VENUE FIND BY NAME

*/
venueSchema.statics.findByName = function(venue){
	
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
		if(err){
			//console.log('VENUE SAVE FAILED'.bgRed,doc.name.red,err);
			this.reject(err)
		}else{
			console.log('VENUE SAVED'.cyan,doc.name);
			this.resolve(true)
		}
		
		doc = undefined;
	}.bind(this));
	return this.promise;
});















//Venue Full Sync
venueSchema.statics.syncVenue = function(venue,check_val){
	var self = this;

	var check_val = check_val || true;


	//try to find by platformid
	return this.findByPlatformIds(venue)
	

	//try to find by gps
	.then(function(found){
		if(found == null){
			return self.findByGPS(venue)
		}else{
			check_val = false;
			return p.pipe(found)
		}
	})
	

	//try to find by name
	.then(function(found){
		if(found == null){
			return self.findByName(venue)
		}else{
			return p.pipe(found)
		}		
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
			console.log('VENUE MATCHES..'.bgGreen,_.map(docs,function(d){return d.name}))
			//go through all text search matches and do a single merge + return if a good match, otherwise go to end
			_.each(docs,function(d){
				


				console.log('DB FULL VENUE MERGE:'.green,venue.name,d.name.inverse);
				m_d = merge.venue(d,venue,null,check_val);
				if(m_d != false){
					d.set(m_d);
					pipe = p.pipe(d);
					return false;
				}
			});
			
			//Failed to merge, probably because answered NO to all prompts.
			if(pipe == null){
				console.log('DB FULL VENUE NEW:'.bold.cyan,venue.name);
				pipe = p.pipe(venue);				
			}
		}
		return pipe.then(saveVenue);
	});
};



















//Venue Id sync
venueSchema.statics.syncVenueById = function(venue){

	return Promise.using(
		this.findOneAsync({
			platformIds: {$in : venue.platformIds},
			'location.status': {$gt : min_gps_status-1}
		}),
		function(doc){

			
			//when we return null, we can later find by full search
			if(doc == null) return p.pipe(false);
			

			//This is guaranteed to work!

			console.log('FOUND DB.VENUE BY ID'.green,venue.name,doc.name.inverse);

			var fields = merge.venue(doc,venue,null,true);


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
}


































/* MODULE EXPORT */
var Venue = db.model('Venue',venueSchema);
Promise.promisifyAll(Venue);
Promise.promisifyAll(Venue.prototype);
module.exports = Venue;