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
	banners: [{
		local:String,
		width: Number,
		height: Number,
		url: String,
	}],
});






//EVENTS ARE SUBDOCUMENTS OF VENUES, THEY DO NOT NEED TO BE SAVED (or validated manually) because that all happens automatically when a venue gets saved :)





eventSchema.methods.validateEvent = function(next){

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
}






//extract artists from raw data and map the synced artists to the event headliners/openers
eventSchema.pre('validate',function(next){

	var self = this;

	if(self.artists.headliners.length > 0 || self.artists.openers.length > 0){
	//	console.log('EVENT HAS ARTISTS.'.bgGreen,self.artists.headliners.length,self.artists.openers.length)
	}else{
		console.log('EVENT HAS ARTISTS.'.grey,self.artists.headliners.length,self.artists.openers.length)
	}
	

	var groups_promises = _.map({headliners:self.artists.headliners,openers:self.artists.openers},function(group,key){
		return Promise.map(group,function(artist){
			if (group.indexOf(artist._id) >= 0 || artist.constructor.name == 'ObjectID') return p.pipe(null)
			else return Artist.Sync(artist);
		})
		.then(function(group){
			self.artists[key] = _.unique(util.null_filter(group));
		})
	})
	
	return Promise.all(groups_promises).finally(function(){
	//	console.log('MAPPED EVENT ARTISTS'.bold.yellow,JSON.stringify(self.artists,null,5))
		self.validateEvent(next)
	})
});





eventSchema.path('platforms').validate(function(value){
  return value.length;
},"'platforms' cannot be an empty array");


eventSchema.path('platformIds').validate(function(value){
  return value.length;x
},"'platforms' cannot be an empty array");



module.exports = eventSchema