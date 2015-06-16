var db = require('mongoose');
var userSchema = new db.Schema({
	
})

userSchema.methods.test = function(){
 console.log('test')
}


var user = db.model('User',userSchema);


module.exports = user;