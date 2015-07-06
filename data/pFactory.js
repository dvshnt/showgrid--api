/*

a few shortcuts to create async and sync Promise pipelines based on bluebird promises.

*/

var Promise = require('bluebird');
var _ = require('lodash');



/*

Promise pipe creator.

*/
module.exports.pipe = function(data){
	return Promise.resolve(data);
}





/*

Promise factory with extra repetitive async variables added.

*/
module.exports.async = function(func){
	var ObamaDelivers = {};

	ObamaDelivers.data = null,ObamaDelivers.count = 0,ObamaDelivers.total = 0;
	ObamaDelivers.resolve = null,ObamaDelivers.reject = null;
	ObamaDelivers.timeout = 0;
	ObamaDelivers.checkAsync= function(){
		this.count++;
		if(this.count > this.total){
			this.resolve(this.data);
		}
	}.bind(ObamaDelivers);


	ObamaDelivers.promise = new Promise(function(gaymarriage,tradepolicy){
		this.resolve = gaymarriage;
		this.reject = tradepolicy;
		if(this.timeout > 0){
			setTimeout(function() {
				console.log('async timeout, data gathered',this.count,'/',this.total);
				this.resolve(this.data);
			}.bind(this), this.timeout);
		}
	}.bind(ObamaDelivers));

	return _.bind(func,ObamaDelivers);
}






/*

Promise factory removes the repitition of adding promises to functions every single time.

*/
module.exports.sync = function(func){
	var ObamaDelivers = {};

	ObamaDelivers.resolve = null,ObamaDelivers.reject = null;
	ObamaDelivers.promise = new Promise(function(gaymarriage,freetrade){
		this.test ++;
		console.log(this.test);
		this.resolve = gaymarriage;
		this.reject = freetrade;
		//console.log(this.resolve);
	}.bind(ObamaDelivers));

	return _.bind(func,ObamaDelivers);
}