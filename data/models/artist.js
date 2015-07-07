var Promise = require('bluebird');
var db = Promise.promisifyAll(require('mongoose'));

var scrapers = require('../scrapers.js')
var artistSchema = new db.Schema({
	platforms: [{name:String,id:String}],
	isGroup: {type: Boolean,default: false}, //artist Schema can be a band/group and an artist at the same time.
	name: {type:String, required: true, index: 'text'},
	demand: Number, //how much demand for this artist?
	created: {required: true, type:Date},
	links: [{type:String}],
	banners: [{type:String}],
	members: [{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
},{autoIndex: false}); 

artistSchema.pre('save',function(next){
	if(this.members.length > 1) this.isGroup = true;
	else this.isGroup = false;

	if(!this.created) this.created = new Date().toISOString(); //add timestamp
	next();
});


var artist = db.model('Artist',artistSchema);





module.exports = artist;