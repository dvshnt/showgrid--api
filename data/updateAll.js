var Promise = require('bluebird');
var _ = require('lodash');
var db = require('./data.js');
var colors = require('colors');
var fuzzy = require('fuzzyset.js'); //fuzzy matching for finding models that are similar.
var p = require('./pFactory'); //promise factory shortucts.
var sync = require('./sync/sync');
var scrapers = require('./scrapers');
var util = require('./util');

var null_filter = util.null_filter;
var clamp = util.clamp;


var max_query = 99999;
var min_query = 1;

if(db.venue == null) return console.error('RECURSIVE MODULE REQUIRE ERROR')




Promise.longStackTraces();


setInterval(function(){
	util.logMem();
}, 5000)

//This function is not refactored and does not need to be bothered...pretty much hooks up parameters and functions from the ./scrapers.js file and passes the data to sync.js



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
			params.query_size = clamp(params.query_size,min_query,max_query);


			//check if endpoint exists
			if(scraper.find[endpoint] == null) return console.error('UPDATE ENDPOINT ERR: '.bgRed.bold+plat_name+' does not have '+endpoint);

			//check if filter exists.
			if(scraper.filters[endpoint] == null) return console.log('UPDATE ENDPOINT ERR: '.bgRed.bold,'missing filter for',plat_name,endpoint);
		
			return scraper
			.find[endpoint](params)
			.then(p.async(function(docs){
				if(docs == null || docs.length == 0) return p.pipe(null)
				docs = params.query_size != null ? _.takeRight(docs,params.query_size) : docs;


				this.data = docs;
				this.total = docs.length;

				//filter nulls after all filters passed
				this.cb = function(self){
					self.data = null_filter(self.data);
				}.bind(this)
				
				_.each(docs,function(doc,i){
					var prom = p.pipe(doc)

					//filter delay.
					.delay(params.filter_delay != null ? params.filter_delay*i : 0)
					
					//filter pipe wrapper
					.then(function(){
						return p.pipe(scraper.filters[endpoint](doc))
					})
					
					//fill cache if save_cache is set to true.
					.then(function(raw_doc){
						if(raw_doc != null && save_cache == true){
							return util.fillCache([raw_doc])
							.then(function(){
								console.log('cache saved'.cyan,raw_doc.name);
								return p.pipe(raw_doc)
							});
						} 
						else return p.pipe(raw_doc)
					})


					//check async
					.then(function(parsed_doc){

						if(parsed_doc == null){
							this.checkAsync();
							console.log(plat_name.bgGreen,endpoint.inverse,'parsed'.green,'NULL'.bgRed,(this.count+'/'+this.total).yellow)
						}else{
							this.data[i] = parsed_doc;
							this.checkAsync();
							console.log(plat_name.bgGreen,endpoint.inverse,'parsed'.green,parsed_doc.name,(this.count+'/'+this.total).yellow)
						}

						
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
				//console.log(filtered_docs.length);
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
			console.log(plat_name.bgCyan,'done'.green,(this.count+'/'+this.total).cyan)
		}.bind(this))

	}.bind(this));


	return this.promise
});





var save_cache = false
module.exports = function(opt){

	//options passed to the syncData function in sync/sync.js
	var sync_options = {
		overwrite: opt.overwrite,
		min_gps_status: opt.min_gps_status,
		filter_empty: opt.filter_empty,
		bad_words: opt.bad_words
	}


	//clear cache if nesseary
	if(opt.clear_cache == true) var pipe = util.clearCache();

	//otherwise create a pipe
	else var pipe = p.pipe();

	//global save_cache
	if(opt.save_cache == true) save_cache = true;


	//USE CACHE
	if(opt.use_cache){
		return pipe
		.then(util.getCache)
		.then(function(data){
			
			if(opt.sync === false) return p.pipe(data);
			return sync(_.merge({docs:data},sync_options));
			
		})

	//DONT USE CACHE
	}else{
		return pipe
		.then(main.bind(null,opt))
		.then(function(data){
			
			if(opt.sync === false) return p.pipe(data);
			return sync(_.merge({docs:data},sync_options));
		});		
	}
};