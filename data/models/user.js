var Promise = require('bluebird');
var db = Promise.promisifyAll(require('mongoose'));
var userSchema = new db.Schema({
	name: String,
	email: String,
	password: String, //hash.
	phone: Number,
	events: {
		favorites: [{type:db.Schema.Types.ObjectId, ref: 'Event'}],
		ignored: [{type:db.Schema.Types.ObjectId, ref: 'Event'}],
 	},
});


module.exports = db.model('User',userSchema);