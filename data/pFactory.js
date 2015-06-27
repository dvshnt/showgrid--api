/*
dead simple handmade collection of shortcuts to create async and sync Promise pipelines based on bluebird promises.

use async when you want to get data from differnt sources without waiting for each source to respond...checkAsync counts the data against total data and returns when all data is promised.
this is handy to not have to do the same thing over and over again, there is probably more alot more robust promise factories out there but idc.
variables are binded to the callback function so if you have nested callbacks, make sure you bind(this);

*/

var Promise = require('bluebird');
var _ = require('lodash');

/*

Promise pipe creator.

*/
module.exports.pipe = function(){
	return new Promise(function(resolve,reject){
		resolve();
	})
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