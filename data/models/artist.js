var Promise = require('bluebird');
var db = Promise.promisifyAll(require('mongoose'));
var _ = require('lodash');
var scrapers = require('../scrapers.js')


var artistSchema = new db.Schema({

	platformIds:[{type:String}],
	platforms: [{name:String,id:String,_id:false}],
	description: String,
	isGroup: {type: Boolean,default: false}, //artist Schema can be a band/group and an artist at the same time.
	name: {type:String, required: true, index: 1},
	demand: {type:Number}, //how much demand for this artist?
	time: {
		created: { type: Date, default: Date.now },
		updated: Date,
	},
	status:{type:Number,default:0},
	links: [{
		domain:String,
		url:String,
		_id: false,
	}],
	banners: [{
		width: Number,
		height: Number,
		url: String,
		local:String,
	}],
	tags: [String],
	samples: [{type:String}],
	members: [{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
}); 

artistSchema.index({
	name: 'text',
});





artistSchema.pre('save',function(next){
	if(this.members.length > 1) this.isGroup = true;
	else this.isGroup = false;

	if(!this.time.created) this.time.created = Date.now(); //add timestamp
	this.time.updated = Date.now();
	next();
});





//PRE VALIDATION FILLERS
artistSchema.pre('validate',function(next){
	this.name = this.name.replace(/[\\\+\!\@\#\^\*\(\)\;\/\|]/,'')
	this.platformIds = _.map(this.platforms,function(plat){
		return plat.name+'/'+plat.id;
	});

	next();
});




//SPOTIFY FILLER
var spotify = require('../fillers/spotify');
artistSchema.methods.getSpotify = function(){
	return new spotify(this);
}






//make sure platfoms is not empty.
artistSchema.path('platforms').validate(function(value){
  return value.length;
},"'platforms' cannot be an empty array");


//make sure platform Ids have been properly assigned
artistSchema.path('platformIds').validate(function(value){
  return value.length;
},"'platformIds' cannot be an empty array");










var artist = db.model('Artist',artistSchema);
module.exports = artist;