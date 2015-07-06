var Promise = require('bluebird');
var db = Promise.promisifyAll(require('mongoose'));
var userSchema = new db.Schema({
	name: String,
	email: String,
	password: String, //hash.
	events: {
		favorites: [{type:db.Schema.Types.ObjectId, ref: 'Event'}],
		ignored: [{type:db.Schema.Types.ObjectId, ref: 'Event'}],
 	},
	auth: {
		
		//phone number
		local: {
			hash: String, 
			confirmed: {type: Boolean, default: false},
			token: String,
			decayAt: {type: Date, default: Date.now()},
		},

		//twitter
		twitter: {

		}
	}
});



module.exports = db.model('User',userSchema);