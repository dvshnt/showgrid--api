var Promise = require('bluebird');
var _ = require('lodash');
var db = require('./data.js');
var colors = require('colors');
var fuzzy = require('fuzzyset.js'); //fuzzy matching for finding models that are similar.
var p = require('./pFactory'); //promise factory shortucts.
var sync = require('./sync/sync');
var scrapers = require('./scrapers');
var util = require('util');



if(db.venue == null) return console.error('RECURSIVE MODULE REQUIRE ERROR')

/*

linkFiller is used when artist/show ID's are linked to a fetched object, we have to try find those objects in OUR database and link them as well.


it gets called after all the scraper filters have been called back.
*/

var linkFiller = function(model_list,log){
	////console.log('IN LINK FILLER: ',model_list);

	_.each(model_list)


	return new Promise(function(res,rej){
		res(model_list);
	});
}



Promise.longStackTraces();


var main = p.async(function(opt){
	opt.params = opt.params || {};

	//update a platform
	var up_plat = p.async(function(plat,plat_name){
		console.log('UPDATE'.bgCyan,plat_name.inverse);

		//check if platform exists.
		if(scrapers[plat_name] == null) return console.log('UPDATE PLATFORM ERR: '.bgRed.bold,'no scraper platform found: ',plat_name);

		var plat_name = plat_name;
		var scraper = scrapers[plat_name]; //scraper name
		
		if(scraper.find == null) return console.error('UPDATE PLATFORM ERR: '.bgRed.bold+plat_name+' does not have the method group "find" ');
		


		//update endpoint
		var up_end = function(params,endpoint){
			//check if endpoint exists
			if(scraper.find[endpoint] == null) return console.error('UPDATE ENDPOINT ERR: '.bgRed.bold+plat_name+' does not have '+endpoint);

			//check if filter exists.
			if(scraper.filters[endpoint] == null) return console.log('UPDATE ENDPOINT ERR: '.bgRed.bold,'missing filter for',plat_name,endpoint);
		
			return scraper
			.find[endpoint](params)
			.then(p.async(function(docs){

				this.total = docs.length;
				this.data = docs;
				this.cb = function(self){
					if(params.query_size != null){
						self.data = _.takeRight(self.data,params.query_size)
					}
				}.bind(this)
				
				_.each(docs,function(doc,i){
					var prom = p.pipe(doc)
					//filter delay.
					.delay(params.filter_delay != null ? params.filter_delay*i : 0)
					//filter pipe wrapper
					.then(function(){
						return p.pipe(scraper.filters[endpoint](doc))
					})
					//check async
					.then(function(parsed_doc){
						this.data[i] = parsed_doc;
						this.checkAsync();
					}.bind(this));

				}.bind(this));
				
				return this.promise;
			}));
		};


		this.data = [];

		var main_params = _.clone(opt.params);
		var plat_params = _.clone(plat.params);


		var params = _.merge(main_params,plat_params);

		_.each(plat.endpoints,function(end_params,endpoint){
			var end_params = _.clone(end_params);
			var params2 = _.clone(params);
			this.total++
			up_end(_.merge(params2,end_params),endpoint)
			.then(function(filtered_docs){
				this.data = this.data.concat(filtered_docs);
				this.checkAsync();
			}.bind(this))
		}.bind(this))

		return this.promise;
	});
	

	
	_.each(opt.platforms,function(plat,plat_name){
		this.total++;

		up_plat(plat,plat_name)
		.then(function(docs){
			this.data = this.data.concat(docs);
			this.checkAsync();
		}.bind(this))

	}.bind(this));


	return this.promise
});






module.exports = function(opt){
	return main(opt).then(sync);
};