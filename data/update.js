
var _ = require('lodash');

var db = require('./data.js');
//scraper endpoints
var scrapers = require('./scrapers');
var Promise = require('bluebird');

// //console.log(scrapers)
//Async data scraping

////console.log(db);

var fuzzy = require('fuzzyset.js'); //fuzzy matching for finding models that are similar.

var p = require('./pFactory.js'); //promise factory shortucts.

var Validator = require('./validator.js');




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






function main(opt){
	var filter_timeout = (opt.timeout || 20)*1000;
	var total = 0;
	var done = 0;
	opt.params = opt.params || {};
	var response;
	var reject;


	var new_data = []; //list of new data models added to the database gets promised back when all endpoints of each platform are updated and saved.
	var updated_data = [];


	var stepcheck = function(){
		done++;
		if(done >= total){
			response({new_data:new_data,updated_data:updated_data});
		}
	}

	var start_time = new Date().getTime();


	//core update function.
	var update = function(plat,plat_name){
		////console.log(plat,plat_name);
		//check if platform exists.
		if(scrapers[plat_name] == null){
			//console.log('no scraper platform found: ',plat_name);
			return
		}


		//if a platform doesnt have any passed params, we create a new empty settings object.
		plat.params = plat.params || {};


		var data = [];
		var scraper = scrapers[plat_name];
		var opt_endpoints = plat.endpoints;
		return opt_endpoints.map(function(endpoint,i){
			

			//catch any scraper config errors.
			if(scraper.find == null) return //console.error('SCRAPER ERR: '+plat_name+' does not have the method group "find" ');
			if(scraper.find[endpoint] == null) return //console.error('SCRAPER ERR: '+plat_name+' does not have '+endpoint);


			//get the endpoint promise.
			////console.log(plat.params);

			//ENDPOINT PROMISE
			var prom = scraper.find[endpoint](_.merge(plat.params,opt.params))
			.then(function(data){
				if(data.length == null) return //console.error('UPDATE ERR:',plat_name,endpoint,'data must be an ARRAY!');

				
			
				return new Promise(function(exit_pipe,reject2){
					var data_total = data.length;
					var data_count = 0;
					var data_error = 0;
					var pipes = [];
					
					_.each(data,function(raw_obj,i){
						var retries = 0;
						//create a transform pipe for each object in the data array
						var obj_pipe = Promise.resolve(raw_obj);

				
						//cycle through all the filters.
						_.each(scraper.filters[endpoint],function(filter){
							obj_pipe = obj_pipe.then(filter);
						});


						//when object has gone through all filters, replace with origional object.
						obj_pipe = obj_pipe.then(function(parsed_obj){
							if(parsed_obj == null){
								data.splice(i,1);
								console.error('FAILED PARSE',data_count);
								return;
							}
							data[i] = parsed_obj;
							data_count ++;
							//console.log(plat_name,endpoint,data_count);
						}).timeout(60000).catch(Promise.TimeoutError, function(e) {
							throw new Error("couldn't fetch content after 60 seconds, timeout");
				        })
						

						pipes.push(obj_pipe);
					
						//TIMEOUT (if filters did not respond within 10 seconds) EXIT ANYWAY....

					}.bind(this));


					Promise.settle(pipes).then(function(results){
						console.log('done scraping ',plat_name,'/',endpoint,'total:',results.length);
						exit_pipe(data);
					});
				});
			})
						
			return prom;
		}.bind(this));
	}.bind(this)


	//return update promise
	return new Promise(function(resolve,reject){


		//all platform enpoint pipes
		var all_pipes = _.flatten(_.map(opt.platforms,update));
		
		Promise.settle(all_pipes).then(function(results){
			return _.flatten(_.map(results,function(r){if(r.isFulfilled()) return r.value()}))
		}).then(Validator).then(function(data){
			resolve(data);
		});

	}.bind(this))
}


module.exports = main;