
var _ = require('lodash');

var db = require('./data.js');
//scraper endpoints
var scrapers = require('./scrapers');
var Promise = require('bluebird');

// console.log(scrapers)
//Async data scraping

//console.log(db);

var fuzzy = require('fuzzyset.js'); //fuzzy matching for finding models that are similar.

var p = require('./pFactory.js'); //promise factory shortucts.

var Validator = require('./validator.js');




/*

linkFiller is used when artist/show ID's are linked to a fetched object, we have to try find those objects in OUR database and link them as well.


it gets called after all the scraper filters have been called back.
*/

var linkFiller = function(model_list,log){
	//console.log('IN LINK FILLER: ',model_list);

	_.each(model_list)


	return new Promise(function(res,rej){
		res(model_list);
	});

}






function main(opt){
	var filter_timeout = (opt.timeout || 20)*1000;
	var total = 0;
	var done = 0;

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
	// setInterval(function(){

	// 	console.log('getting...',Math.floor(((start_time - new Date().getTime())/1000)) );
	// }, 1100)


	//core update function.
	var update = function(plat,plat_name){

		//match options platform with scraper tag
		//console.log(scrapers)


		//check if we gethered all the data before we promise it back...



		if(scrapers[plat_name] != null){
			var scraper = scrapers[plat_name];
			found = true;


			var opt_endpoints = plat.endpoints;

			//go through all requested endpoints
			opt_endpoints.forEach(function(endpoint,i){
				

				//catch any scraper config errors.
				if(scraper.find == null) return console.error('SCRAPER ERR: '+plat_name+' does not have the method group "find" ');
				if(scraper.find[endpoint] == null) return console.error('SCRAPER ERR: '+plat_name+' does not have '+endpoint);


				//get the endpoint promise.
				var prom = scraper.find[endpoint](plat.params);
				total++;


				//pipe data through the filters.
				prom = prom.then(function(data){
					if(data.length == null) return console.error('UPDATE ERR:',plat_name,endpoint,'data must be an ARRAY!');
					//console.log('piping data through filters',data);


				

	
					return new Promise(function(exit_pipe,reject2){
						var data_total = data.length;
						var data_count = 0;
						var data_error = 0;
						var pipes = [];
						_.each(data,function(raw_obj,i){

							//create a transform pipe for each object in the data array
							var obj_pipe = new Promise(function(res,rej){
								res(raw_obj);
							}).cancellable();

							obj_pipe = obj_pipe.delay(i*5);


							//cycle through all the filters.
							_.each(scraper.filters[endpoint],function(filter){
								if(filter.then != null) obj_pipe = obj_pipe.then(filter.error(function(err,res){
									console.log("ERROR WTF")
								}));
								else obj_pipe = obj_pipe.then(function(dat){
									return new Promise(function(res,rej){
										data[i] = dat;
										res(filter(dat));
									});
								});
							}.bind(this));

							//when object has gone through all filters, replace with origional object.
							obj_pipe = obj_pipe.then(function(parsed_obj){
								if(parsed_obj == null){
									data.splice(i,1);
									console.log('FAILED PARSE',data_count);
									return;
								}
								data[i] = parsed_obj;
								data_count ++;
							}.bind(this));

							// obj_pipe = obj_pipe.done(function(resolve,reject){
							// 	console.log(resolve,reject)
							// });


							pipes.push(obj_pipe);

							//TIMEOUT (if filters did not respond within 10 seconds) EXIT ANYWAY....

						}.bind(this));
						
						Promise.settle(pipes).then(function(results){
							console.log(results.length)
							console.log('done scraping ',plat_name,'/',endpoint);
							console.log('resolved',results.length,'/',data_total);
							exit_pipe(data);
						});
					});
				});


				//run the pipe through the validator (checks if data exists in database)
				prom = prom.then(function(data){
					return Validator(data,opt.save)
				}.bind(this));


				//run the pipe through the linkFiller (finds linked models and associates it with the parent model)
				if(opt.link == false){}
				else prom = prom.then(function(data){
					return linkFiller(data,opt.linklog);
				}.bind(this));


				//step check...when EVERY platform endpoint update returns a promise, we return with the updated data.
				prom = prom.then(function(data){

				})
				
				return prom;
			}.bind(this));
		}else console.log('no scraper platform found: ',plat_name);
	}.bind(this)


	//return update promise
	return new Promise(function(res,rej){
		response = res;
		reject = rej;

		_.each(opt.platforms,update);
	}.bind(this))
}


module.exports = main;