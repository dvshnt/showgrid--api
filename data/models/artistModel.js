var db = require('mongoose');




var artistSchema = new db.Schema({
	isGroup: {type: Boolean,default: false}, //artist Schema can be a band/group and an artist at the same time.
	platforms: [{tag:String,id:String}], //Id's for different platforms. (needed for updating)
	name: String,
	demand: Number, //how much demand for this artist?
	created: Date,
	links: [{type:String}],
	banners: [{type:String}],
	members: [{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
}); 

artistSchema.pre('save',function(next){
	if(this.members.length > 1) this.isGroup = true;
	else this.isGroup = false;

	if(!this.created) this.created = new Date().toISOString(); //add timestamp
	next();
});


var artist = db.model('Artist',artistSchema);





module.exports = artist;