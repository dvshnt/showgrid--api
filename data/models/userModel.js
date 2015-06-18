var db = require('mongoose');
var userSchema = new db.Schema({
	email: String,
	password: String, //hash.
	auth: {
		twitter: {

		}
	}
});



module.exports = db.model('User',userSchema);