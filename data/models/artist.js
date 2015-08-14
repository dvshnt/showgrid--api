var Promise = require('bluebird');
var db = Promise.promisifyAll(require('mongoose'));
var _ = require('lodash');
var scrapers = require('../scrapers.js')
var artistSchema = new db.Schema({

	platformIds:[{type:String}],
	platforms: [{name:String,id:String,_id:false}],
	description: String,
	isGroup: {type: Boolean,default: false}, //artist Schema can be a band/group and an artist at the same time.
	name: {type:String, required: true},
	demand: Number, //how much demand for this artist?
	created: {type:Date},
	links: [{type:String}],
	banners: [{type:String}],
	streams: [{type:String}],

	members: [{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
}); 

artistSchema.pre('save',function(next){
	if(this.members.length > 1) this.isGroup = true;
	else this.isGroup = false;

	if(!this.created) this.created = new Date().toISOString(); //add timestamp
	next();
});


artistSchema.index({
	name: 'text',
});


var artist = db.model('Artist',artistSchema);



artistSchema.pre('save',function(next){
	this.platformIds = _.map(this.platforms,function(plat){
		return plat.name+'/'+plat.id;
	});
	next();
});




module.exports = artist;