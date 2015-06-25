
var _ = require('lodash');

var db = require('./data.js');
//scraper endpoints
var scrapers = require('./scrapers');
var Promise = require('bluebird');

// console.log(scrapers)
//Async data scraping

//console.log(db);



/*

Model validator for events/venues/artists finds a similar model and if one is found that has a definite match, (like for example same name)
then the preexisting model is updated and saved.

If no matches are found the function saves the model.

Returns a promise that resolves when the data is saved or updated into the database.

*/

var validateSaveModel = function(model){
	console.log(model.name);


	return new Promise(function(resolve){
		resolve()
	});
}




//Validator checks parsed data
var Validator = function(endpoint,dataset,save){

	//console.log(dataset)


	if(db[endpoint] == null){
		//console.log(db);
		return console.error('VALIDATOR/SAVE ERROR: no data endpoint found for ',event);
	}
	//console.log('IN VALIDATOR',endpoint,dataset);
	
	var response,total = dataset.length,count=0;

	var models = _.map(dataset,function(obj){
		var model = new db[endpoint](obj);
		validateSaveModel(model).then(function(){
			count++;
			if(count >= total){
				response(models);
			}
		});
		return model;
	});


	return new Promise(function(res,rej){
		response = res;
	});
}



/*

this is what linkFiller is used when artist/show ID's are linked to a fetched object, we have to try find those objects in OUR database and link them as well.


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
						_.each(data,function(raw_obj,i){

							//create a transform pipe for each object in the data array
							var obj_pipe = new Promise(function(res,rej){
								res(raw_obj);
							});


							//cycle through all the filters.
							_.each(scraper.filters[endpoint],function(filter){
								if(filter.then != null) obj_pipe = obj_pipe.then(filter);
								else obj_pipe = obj_pipe.then(function(dat){
									return new Promise(function(res,rej){
										data[i] = dat;
										res(filter(dat));
									});
								});
							}.bind(this));

							//when object has gone through all filters, replace with origional object.
							obj_pipe = obj_pipe.then(function(parsed_obj){
								data[i] = parsed_obj;
								//console.log('DONE PARSE');
								//console.log(parsed_obj);
								//console.log(data_count);
								data_count ++;
								if(data_count >= data_total){
									exit_pipe(data); 
								}
							}.bind(this));

							//TIMEOUT (if filters did not respond within 10 seconds) EXIT ANYWAY....

						}.bind(this));
						setTimeout(function() {
							console.log('CHECK TIMEOUT',data_count,data_total);
							if(data_count < data_total){
								console.error('TIMEOUT IN FILTER PIPE',endpoint,plat_name,'\n','done',data_count,'\\',data_total);
								exit_pipe(data);
							} 
						}, filter_timeout);
					});
				});


				//run the pipe through the validator (checks if data exists in)
				prom = prom.then(function(data){
					//console.log('in vali',data);
					return Validator(endpoint,data,opt.save)
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