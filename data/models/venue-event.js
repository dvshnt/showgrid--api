var _ = require('lodash');
var Promise = require('bluebird');
var db = Promise.promisifyAll(require('mongoose'));

var Artist = require('./artist');



var eventSchema = new db.Schema({
	

	//identification
	platformIds:[{type:String}],
	platforms: [{name:String,id:String,_id:false}],
	

	name: {type:String, required: true},
	date: {type: Date, required: true},
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

	private: {type: Boolean, default: false},
	featured: {type:Boolean, default: false},
	age: {type: Number,max: 21, default: 18},
	description: String,
	users: [{type:db.Schema.Types.ObjectId, ref: 'User'}],  //users going
	artists: {
		headliners:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
		openers:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}]
	},
	demand: Number,
	created: Date,

	//
	banners: [{type: String}],


	//events may have unique locations ? useful for custom events and unofficial privatete venues...
	location: {
		address: String,
		gps: [{type:Number, index: '2dsphere'}]
	},
});



var venueSchema = new db.Schema({
	
	//identification
	platformIds:[{type:String,required: true}],
	platforms: [{name:String,id:String,_id:false}],
	
	created: {type: Date},

	name: {type:String, required: true},
	


	location: {
		address: {type: String, required:true},
		gps: [{type:Number, index: '2dsphere'}]
	},

	links: [{type:String}],

	tags: [{type: String}],
	
	phone: {type: String},

	demand: Number,

	banners: Array,
	age: Number,
	events: [eventSchema], //all events for this venue
	users: [{type:db.Schema.Types.ObjectId, ref: 'User'}], //users that are going to this venue
	//artists: [{type:db.Schema.Types.ObjectId, ref: 'Artist'}] //artists that are performing at this venue
});




venueSchema.index({
	name: 'text',
});




venueSchema.pre('save',function(next){

	this.platformIds = _.map(this.platforms,function(plat){
		return plat.name+'/'+plat.id;
	});
	next();
});




var venue = db.model('Venue',venueSchema);




module.exports = venue;