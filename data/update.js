
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



/*
Model validator for events/venues/artists finds a similar model and if one is found that has a definite match, (like for example same name)
then the preexisting model is updated and saved.

If no matches are found the function saves the model.

Returns a promise that resolves when the data is saved or updated into the database.

*/


/*

Very Heavy Similarity Query

*/
var findbySmilarity = p.sync(function(obj){


var fuzzy_A = 90;
var fuzzy_B = 80;
var fuzzy_C = 70;


/*
	pipe logic:
		
	1.
	find by platform id:
		1 match:
			DONE:
		0 match:
			find by name word



	find by name word:
		n match:
			compare data strings
				< 80% and best match
					brute force fuzzy name search
				> 80% and best match
					DONE
		0 match:
			brute fuzzy name search


	brute fuzzy name search:

		> 90%
			n match:
				compare data strings
					> 90%
						DONE
		< 90% && > 70%
			n match:
				compare data strings
					> 90% and best match
						DONE
					< 90% and best match
						NEW
		<70%
			NEW
	

	compare data strings:
		PIPE 3: (NEVER FUZZY SEARCH DATA STRINGS ON ENTIRE COLLECTIONS, ITS A PERFORMANCE RISK)
		construct data string for each object and its database similar entry and fuzzy search.
			(date) + (name) + (events) + (artists[.name]) + (venue.data_string);
*/


	//create data string based on data thats available in both objects
	var comparedData = {
		'event' : {
			'venue' : {'name':true},
			'date' : true,
			'name' : true,		
		},
		'venue' : {
			'name' : true,
			'location' : {
				'city': true,
				'zip': true,
				'gps': {
					'lon': true,
					'lat': true,
				}
			}
		},
		'artist' : {
			'name' : true
		}
	};

	_.each(comparedData,function(val,key){
		if(db[key]==null)return console.error('ERROR, ALLOWED DATA MUST BE IN DATABASE')
	})

	var createDataStrings = p.sync(function(raw_obj,model){
		
		var obj_data = '';
		var mod_data = '';

		var type = raw_obj.is;
		var resolve = this.resolve;
		function addToString(obj,model,a_branch){
			_.each(obj,function(val,key){

				if(val == null || model[key] == null) return;


				var allow = a_branch[key] || comparedData[type][key];

				if(allow == null) return
				else if(_.isObj(allow) && _.isObj(val) && _.isObj(model[key])){
					addToString(val,model[key],allow); // fuck yea.... recursion >.>
					return;
				}

				if(model[key] != null){
					obj_data += val;
					mod_data += model[key];
				}
			});
		}

	

		var populate_model = q.sync(function(){
			if(type == 'event'){
				model.lean().populate({path:'venue',select: 'name'}).exec(function(err,obj){
					if(err) return this.reject(console.log('populate model error: ',err));
					this.resolve(obj);
				}.bind(this));
			}else{
				this.resolve(model);
			}
		});


		populate_model.then(function(model){
			addToString(raw_obj,model);
			
			console.log('obj data:',obj_data);
			console.log('mod_data:',mod_data);
			
			this.resolve({obj_data: obj_data,mod_data: mod_data});
		}.bind(this));

		
		return this.promise;
	});



	
	




	//var pipe = p.pipe();
	//id object has a name search a regex match for the longest word in the name.

	var findByNameWord = p.sync(function(){

		if(obj.name == null) this.resolve(null)

		var search_name = obj.name.split(/\W+/);
		var longest_word = search_name[0];
		console.log('seach name',search_name,obj.name)
		_.each(search,function(word){
			if(word.length > longest_word.length){
				longest_word = word
			}
		});
		console.log(longest_word)
		db[obj.is].find({
			name: new RegExp(longest_word,'i'),
		},function(err,model){
			if(err){
				console.error('database findbySimilarity error',err)
				this.reject(err)
			}else{
				this.resolve(model)
			}
		}.bind(this));
		
		return this.promise;
	});


	function compareModels(model){
		pipe = pipe.then(function(){

		})
	}



	
	var pipe = findByNameWord.then(function(models){
		
		//hmm... no findByNameWord matches, maybe try and find a match by location and date?
		if(model == null){
			pipe = pipe.then()
		}

		if(_.isArray(models)){

		}

	});
	

	db[obj.type].findOne({

	})
});

var findbyPlatformId =  p.sync(function(type,pid){

	db[type].findOne({
		platforms: pid
	},function(err,model){
		if(err){
			console.error('database findPlatformId error',err);
			this.reject(err); 
		}else this.resolve(model);
	}.bind(this));

	return this.promise;
});


//find similar objects in the database.
var findSimilar = p.sync(function(obj){
	var fuzz = fuzzy();

	//first try and find models that have the same platform id.
	var pipe = p.pipe().then(findbyPlatformId(obj.is,_.values(obj.platforms)[0])).then(function(model){
		if(model != null) return this.resolve(model);
		
		//if not, find platforms that have a 99% data match...
		else pipe = pipe.then(findbySmilarity(obj));
	}.bind(this));


	return this.promise;
});


var createSchema = p.sync(function(raw_obj){

	var type = raw_obj.is;
	raw_obj.is = null;
	model = new db[raw_obj.is](raw_obj);	 
	this.resolve(model);

	return this.promise;
});


var mergeSchema = p.sync(function(model,raw_obj){

});
















var validateSaveModel = p.sync(function(raw_obj){
	

	if(raw_obj.platforms == null || _.size(raw_obj.platforms) > 1 || raw_obj.is == null || db[raw_obj.is] == null) return console.error('VALIDATE SAVE ERROR: data object has no platforms and/or is property, therefore it is not a schema!');
	

	//find nested schemas and recursively call them first.
	_.each(raw_obj,function(child,key){
		//recursively call them
		if(_.isArray(child)){
			_.each(child,function(obj,i){
				if(obj.platforms != null) child[i] = validateSaveModel(obj)
			});
		}else if(_.isObject(child)){
			if(child.platforms != null)	raw_obj[key] = validateSaveModel(obj)
		}
	});



	//find similar objects.
	var pipe = findSimilar(raw_obj).then(function(model){
		if(model == null) return(createSchema(raw_obj));
		else return(mergeSchema(model,raw_obj))
	}).then();



	return this.promise;
})
























//Validator checks parsed data
var Validator = p.async(function(dataset,save){


	//console.log('IN VALIDATOR',endpoint,dataset);
	var total = dataset.length,count=0;
	var models = [];
	_.each(dataset,function(obj){
		validateSaveModel(obj).then(function(model){
			models.push(model);
			if(this.checkAsync()) this.resolve(models);
		}.bind(this));
	}.bind(this));

	return this.promise;
});








































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
								console.log('DONE PARSE');
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


				//run the pipe through the validator (checks if data exists in database)
				prom = prom.then(function(data){
					//console.log('in vali',data);
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