
var _ = require('lodash');

var db = require('./data.js');
//scraper endpoints

var Promise = require('bluebird');
var colors = require('colors');
// //console.log(scrapers)
//Async data scraping

////console.log(db);

var fuzzy = require('fuzzyset.js'); //fuzzy matching for finding models that are similar.

var p = require('./pFactory'); //promise factory shortucts.

var Validator = require('./sync/sync');
var scrapers = require('./scrapers');




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

		//check if platform exists.
		if(scrapers[plat_name] == null) return console.log('ERR: '.bgRed.bold,'no scraper platform found: ',plat_name);


		//if a platform doesnt have any passed params, we create a new empty settings object.
		plat.params = plat.params || {};


		var data = [];
		var scraper = scrapers[plat_name];
		var opt_endpoints = plat.endpoints;
		return opt_endpoints.map(function(endpoint,i){
			

			//catch any scraper config errors.
			if(scraper.find == null) return console.error('SCRAPER ERR: '+plat_name+' does not have the method group "find" ');
			if(scraper.find[endpoint] == null) return console.error('SCRAPER ERR: '+plat_name+' does not have '+endpoint);


			//get the endpoint promise.
			console.log(plat.params);

			//ENDPOINT PROMISE
			var prom = scraper.find[endpoint](_.merge(plat.params,opt.params))
			.then(function(data){
				if(data.length == null){
					return console.error('UPDATE ERR:'.bgRed,plat_name,endpoint,'data must be an ARRAY!');					
				}else{
					console.log('GOT RAW DATA',plat_name.cyan+'/'+endpoint.cyan,':',data.length.toString().yellow.bold);
				}

				
			
				return new Promise(function(exit_pipe,reject2){
					var data_total = data.length;
					var data_count = 0;
					var data_error = 0;
					var pipes = [];
					
					_.each(data,function(raw_obj,i){
						
						var retries = 0;
						//create a transform pipe for each object in the data array
						var obj_pipe = Promise.resolve(raw_obj);


						if(plat_name == 'reverbnation') obj_pipe = obj_pipe.delay(100*i)
						

						//cycle through all the filters.
						_.each(scraper.filters[endpoint],function(filter){

							//check if promise
							if(filter.then != null && _.isFunction(filter.then)){
								obj_pipe = obj_pipe.then(filter);
							}else{
								obj_pipe = obj_pipe.then(function(obj){
									return p.pipe(filter(obj));
								})
							}
						});

						
						//when object has gone through all filters, replace with origional object.
						obj_pipe = obj_pipe.then(function(parsed_obj){
							if(parsed_obj == null){
								data.splice(i,1);
								console.error('FAILED PARSE',data_count);
								return;
							}else{
								process.stdout.clearLine();
								process.stdout.cursorTo(0);
								process.stdout.write('PARSED '.green+plat_name.cyan+'/'+endpoint.cyan+ ' '+(data_count+1).toString().yellow.bold+' / '+ (data.length).toString().cyan.bold+' '+(parsed_obj.name != null ? parsed_obj.name.gray : ''));
							}
							data[i] = parsed_obj;
							data_count ++;
							//console.log(plat_name,endpoint,data_count);
						})

						

						pipes.push(obj_pipe);
					
						//TIMEOUT (if filters did not respond within 10 seconds) EXIT ANYWAY....

					}.bind(this));


					Promise.settle(pipes).then(function(results){
						process.stdout.write('\n')
						console.log('DONE PARSING '.green,plat_name.cyan+'/'+endpoint.green);
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