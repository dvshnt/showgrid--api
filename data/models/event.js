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

	var groups_promises = _.map(this.artists,function(group,key){
		return Promise.map(group,function(artist){
			if (group.indexOf(artist._id) >= 0) return p.pipe(null)
			else return Artist.sync(artist);
		})
		.finally(function(group){
			this.artists[key] = group;
			console.log(group)
		})
	})
	
	return Promise.all(groups_promises)

	//validate the event data to make sure the data is correct, this is fail proof.
	.then(function(){
		this.validateEvent(next)
	}.bind(this));

});




eventSchema.path('platforms').validate(function(value){
  return value.length;
},"'platforms' cannot be an empty array");


eventSchema.path('platformIds').validate(function(value){
  return value.length;x
},"'platforms' cannot be an empty array");



module.exports = eventSchema