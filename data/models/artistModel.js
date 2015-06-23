var db = require('mongoose');

var artistSchema = new db.Schema({
	platforms: [{tag:String,id:String}], //Id's for different platforms. (needed for updating)
	name: String,
	demand: Number, //how much demand for this artist?
	links: [{type:String}],
	banners: [{type:String}],
}); 




var artist = db.model('Artist',artistSchema);


module.exports = artist;