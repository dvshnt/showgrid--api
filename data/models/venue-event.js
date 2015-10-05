var _ = require('lodash'); 
var Promise = require('bluebird'); //promise methods
var p = require('../pFactory'); //p methods



var db = p.make(require('mongoose')); //database
var Artist = require('./artist'); //artist mongoose model




//var sync = require('../sync/sync')
var colors = require('colors'); //color console
var merge = require('../sync/merge'); //merge methods
var match = require('../sync/match'); //match methods
var util = require('../util.js'); //util methods


var colors = require('colors');


var max_banners = 20;



var eventSchema = new db.Schema({
	//identification
	platformIds:[{type:String,required:true,_id:false}],
	platforms: [{
		name: 	{type:String,required:true},
		id: 	{type:String,required:true},
		_id: false
	}],
	name: {type:String},
	date: {
		start: {type: Date, required: true},
		end: {type: Date}
	},
	time: {
		created: { type: Date, default: Date.now },
		updated: Date,
	},
	tickets: [{
		_id:false,
		price: String,
		soldout: Boolean,
		url: {type:String,required:true},
		broker: String,
		sale: {
			start: Date,
			end: Date,
		}
	}],



	private: {type: Boolean, default: false},
	featured: {type:Boolean, default: false},
	age: {type: Number,max: 99, default: 0},
	description: String,
	users: [{type:db.Schema.Types.ObjectId, ref: 'User'}],  //users going
	artists: {
		headliners:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
		openers:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}]
	},
	links: [{
		domain:String,
		url:String,
		_id: false
	}],
	tags: [String],
	demand: {type:Number},
	created: Date,
	//
	banners: [{
		local:String,
		width: Number,
		height: Number,
		url: String,
	}],
	//events may have unique locations ? useful for custom events and unofficial privatete venues...
	// location: {
	// 	address: String,
	// 	_gps: {type:[Number], index: '2dsphere'},
	// },
});



eventSchema.pre('validate',function(next){
	this.name = this.name.replace(/[\|]/gi,',');

	this.time.updated = Date.now();
	
	this.platformIds = _.map(this.platforms,function(plat){
		return plat.name+'/'+plat.id;
	});

	this.links = _.map(this.links,function(link){
		if(_.isString(link)) return {url:link}
		return link
	});

	if(_.isArray(this.tickets)){
		_.each(this.tickets,function(t,i){
			if(t == null || t.url == null) this.tickets[i] = undefined;
		}.bind(this))		
	}
	next();
});



//get spotify artists from event name
function splitByAnd(n){
	var n= n.split(/and|&/);
	if(n > 0) return n;
	return false
}







//find artists in DB by name

function findArtistByName(artist){
	
	//search by name
	return Artist.find(
		{ $text : { $search : util.trimName(artist.name) }}, 
    	{ score : { $meta: "textScore" }}
    )
    .limit(5)
    .sort({ score: { $meta: "textScore" } })
    .execAsync()
    .then(function(artistlist){
    	if(artistlist == null) return p.pipe(null)
		var found = [];
		
		_.each(artistlist,function(a,i){
			console.log(a.name)
			if(a.score > 2.5) return p.pipe(a);
		});
		return p.pipe(null);

    }).catch(function(err){
    	console.log('find artist by name err'.bgRed,err);
		return p.pipe(null);
    });
};









//sync Artist

function syncArtist(artist_name){

	return findArtistByName({name:artist_name}).then(function(a){
		console.log('FOUND BY NAME',a)
		if(a != null){
			return p.pipe(a);
		}else{
			a = new Artist({name:artist_name});
			return a.getSpotify().then(function(a){
				if(a) return p.pipe(a);
				return p.pipe(null);
			})
		}
	}).catch(function(e){
		console.error(e)
	})
}




//extract artist data from event name
/*


*/
eventSchema.methods.extractArtists = function(){
	
	var names = this.name.split(',');
	console.log('extract...',names.length,this.name.inverse)
	var headliners = [];
	var openers = [];
	_.each(names,function(name){
		n2 = name.split(/\/w|with/);
		if(n2.length > 1){
			for(var i = 0;i<n2.length;i++){
				if(i%2 == 0){
					var nn2 = splitByAnd(n2[i]);
					if(nn2){
						for(var j = 0;j<nn2.length;j++){
							headliners.push(nn2[i]);
						}
					}else headliners.push(n2[i]);
				}else{
					var nn2 = splitByAnd(n2[i]);
					if(nn2){
						for(var j = 0;j<nn2.length;j++){
							openers.push(nn2[i]);
						}
					}else openers.push(n2[i]);					
				}
			}
		}else{
			headliners.push(n2[0]);
		}
	});

	console.log(headliners,'||',openers);

	var new_headliners = this.artists.headliners;
	var new_openers = this.artists.openers;




	var p1 = Promise.map(headliners,function(artist_name){
		
		return syncArtist(artist_name).finally(function(a){
			if(a != null){
				console.log('EVENT NAME HEADLINER ARTISTS -> GOT SPOTIFY'.bold.green)
				if(new_headliners.indexOf(a._id) == -1){
					if(new_openers.indexOf(a._id) != -1){
						new_openers[new_openers.indexOf(a._id)] = undefined;
					}
					new_headliners.push(a._id);				
				}else if(new_openers.indexOf(a._id) != -1){
					new_openers[new_openers.indexOf(a._id)] = undefined
				}

			}
		});	
	})

	// var p2 = Promise.map(openers,function(artist_name){
	// 	return syncArtist(artist_name).then(function(a){
	// 		if(a != null){
	// 			console.log('EVENT NAME OPENER ARTISTS -> GOT SPOTIFY'.bold.green)
	// 			if(new_openers.indexOf(a._id) == -1){
	// 				if(new_headliners.indexOf(a._id) != -1){
	// 					new_headliners[new_headliners.indexOf(a._id)] = undefined;
	// 				}
	// 				new_openers.push(a._id);				
	// 			}else if(new_headliners.indexOf(a._id) != -1){
	// 				new_headliners[new_headliners.indexOf(a._id)] = undefined
	// 			}
	// 		}
	// 	});
	// })

	return p1;

	// return Promise.settle([p1,p2]).then(function(){
	// 	this.artists.headliners = new_headliners;
	// 	this.artists.openers = new_openers;


	// 	console.log('EVENT NAME EXTRACTION DONE'.bold.cyan)
	// 	console.log(this.name.cyan);
	// 	console.log(this.artists);
	// }.bind(this));
}


















eventSchema.path('platforms').validate(function(value){
  return value.length;
},"'platforms' cannot be an empty array");


eventSchema.path('platformIds').validate(function(value){
  return value.length;x
},"'platforms' cannot be an empty array");

































































/* JSON SCHEMA */

var venueSchema = new db.Schema({
	//identification
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
function flip_gps(gps){
	if(gps == null) return null
	return [gps[1],gps[0]]
}

venueSchema
.virtual('location.gps')
.get(function(){
	if(this.location._gps != null){
		return {
			lat:this.location._gps[1],
			lon:this.location._gps[0]
		}
	}return {
		lat:null,
		lon:null
	}
})
.set(function(gps){
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
var cfg = require('../data/config.json') //we need the cfg file to get the keys

var	keys = 
{
	facebook: cfg.apis.facebook.token,
	eventful: cfg.apis.eventful.keys[0],
	jambase: cfg.apis.jambase.keys[0],
	reverbnation: null,
	ticketfly: null
}

venueSchema.methods.update = function(cb){

	function save(res,rej){ //promise reject and resolve
		return this.save(function (err){
			if (err) return rej(new Error(err)); //reject the update if save failed.
			console.log('venue updated & saved'.cyan)
			else return res(this) //resolve
		});
	}

	//for each scraper platform, we will pass that scrapers platform id of the venue (located in venue.platforms[x].name, if there is one. And will pass that platforms key, if there is one.
	return Promise.map(scrapers,function(plat,platform_name){
		console.log('get platform ->')

		var plat_id = _.where(this.platforms,{name:platform_name},'id')[0]; //get the platform id.

		if( plat_id == null ) return Promise.resolve(null);

		//ALL SCRAPERS NEED TO HAVE A GET VENUE!!
		plat.get.venue({
			id: plat_id,
			key: keys[platform_name] 
		}).then(function(data){
			/*


			here we will call merge 
	
			
			*/

		})

		
	}.bind(this),{concurrency: 1}) //we need to be in sync mode because we have to merge every time we update the document with a different api
	
	//save the venue.
	.then(function(){
		return new Promise(save.bind(this))
	}.bind(this))
}
















/* MODULE EXPORT */
var Venue = db.model('Venue',venueSchema);
module.exports = Venue;