/*

a few shortcuts to create async and sync Promise pipelines based on bluebird promises.

*/

var Promise = require('bluebird');
var _ = require('lodash');




module.exports.make = function(data){
	return Promise.promisifyAll(data);
}


module.exports.make1 = function(data){
	return Promise.promisify(data);
}

/*

Promise pipe creator.

*/
module.exports.pipe = function(data){
	return Promise.resolve(data);
}
module.exports.stop = function(err){
	return Promise.reject(err);
}


/*

Promise factory with extra repetitive async variables added.

*/
module.exports.async = function(func){


	var func = func;

	return function(){

		var ObamaDelivers = {};

		ObamaDelivers.data = null,ObamaDelivers.count = 0,ObamaDelivers.total = 0;
		ObamaDelivers.resolve = null,ObamaDelivers.reject = null;
		ObamaDelivers.timeout = 0;
		ObamaDelivers.checkAsync= function(){
			//if(this.total == 0) return this.resolve(this.data);
			this.count++;
			if(this.count >= this.total){
				if(this.cb != null) this.cb(this);
				this.resolve(this.data);
			}
		}.bind(ObamaDelivers);

		ObamaDelivers.promise = new Promise(function(gaymarriage,tradepolicy){
			this.total = 0;
			this.count = 0;
			this.data = [];
			this.resolve = gaymarriage;
			this.reject = tradepolicy;
			if(this.timeout > 0){
				setTimeout(function(){
					this.resolve(this.data);
				}.bind(this), this.timeout);
			}
		}.bind(ObamaDelivers));
		
		var f = _.bind(func,ObamaDelivers);

		return f.apply(this,arguments)
	}
}


/*

Promise factory removes the repitition of adding promises to functions every single time.

*/
module.exports.sync = function(func){
	var func = func;

	return function(){

		var ObamaDelivers = {};
		ObamaDelivers.resolve = null,ObamaDelivers.reject = null;
		ObamaDelivers.promise = new Promise(function(gaymarriage,freetrade){
			this.resolve = gaymarriage;
			this.reject = freetrade;
			//console.log(this.resolve);
		}.bind(ObamaDelivers));
		
		var f = _.bind(func,ObamaDelivers);

		return f.apply(this,arguments)
	}
	
}