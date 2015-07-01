
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


//create similarity text search indicies


//var findbySmilarity = p.sync(function(obj){




// var populate_model = q.sync(function(){
// 	if(type == 'event'){
// 		model.lean().populate({path:'venue',select: 'name'}).exec(function(err,obj){
// 			if(err) return this.reject(console.log('populate model error: ',err));
// 			this.resolve(obj);
// 		}.bind(this));
// 	}else{
// 		this.resolve(model);
// 	}
// });






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
	



// 	populate_model().then(function(model){
// 		addToString(raw_obj,model);
		
// 		console.log('obj data:',obj_data);
// 		console.log('mod_data:',mod_data);
		
// 		this.resolve({obj_data: obj_data,mod_data: mod_data});
// 	}.bind(this));
	
	




// 	//var pipe = p.pipe();
// 	//id object has a name search a regex match for the longest word in the name.

// 	var findByNameWord = p.sync(function(){

// 		if(obj.name == null) this.resolve(null)

// 		var search_name = obj.name.split(/\W+/);
// 		var longest_word = search_name[0];
// 		console.log('seach name',search_name,obj.name)
// 		_.each(search,function(word){
// 			if(word.length > longest_word.length){
// 				longest_word = word
// 			}
// 		});
// 		console.log(longest_word)
// 		db[obj.is].find({
// 			name: new RegExp(longest_word,'i'),
// 		},function(err,model){
// 			if(err){
// 				console.error('database findbySimilarity error',err)
// 				this.reject(err)
// 			}else{
// 				this.resolve(model)
// 			}
// 		}.bind(this));
		
// 		return this.promise;
// 	});


// 	function compareModels(model){
// 		pipe = pipe.then(function(){

// 		})
// 	}



	
// 	var pipe = findByNameWord.then(function(models){
		
// 		//hmm... no findByNameWord matches, maybe try and find a match by location and date?
// 		if(model == null){
// 			pipe = pipe.then()
// 		}

// 		if(_.isArray(models)){

// 		}

// 	});
	

// 	db[obj.type].findOne({

// 	})
// });

// var findbyPlatformId =  p.sync(function(type,pid){

// 	db[type].findOne({
// 		platforms: pid
// 	},function(err,model){
// 		if(err){
// 			console.error('database findPlatformId error',err);
// 			this.reject(err); 
// 		}else this.resolve(model);
// 	}.bind(this));

// 	return this.promise;
// });


// //find similar objects in the database.
// var findSimilar = p.sync(function(obj){
// 	var fuzz = fuzzy();

// 	//first try and find models that have the same platform id.
// 	var pipe = p.pipe().then(findbyPlatformId(obj.is,_.values(obj.platforms)[0])).then(function(model){
// 		if(model != null) return this.resolve(model);
		
// 		//if not, find platforms that have a 99% data match...
// 		else pipe = pipe.then(findbySmilarity(obj));
// 	}.bind(this));


// 	return this.promise;
// });


// var createSchema = p.sync(function(raw_obj){

// 	var type = raw_obj.is;
// 	raw_obj.is = null;
// 	model = new db[raw_obj.is](raw_obj);	 
// 	this.resolve(model);

// 	return this.promise;
// });


// var mergeSchema = p.sync(function(model,raw_obj){

// });
















// var validateSaveModel = p.sync(function(raw_obj){
	

// 	if(raw_obj.platforms == null || _.size(raw_obj.platforms) > 1 || raw_obj.is == null || db[raw_obj.is] == null) return console.error('VALIDATE SAVE ERROR: data object has no platforms and/or is property, therefore it is not a schema!');
	

// 	//find nested schemas and recursively call them first.
// 	_.each(raw_obj,function(child,key){
// 		//recursively call them
// 		if(_.isArray(child)){
// 			_.each(child,function(obj,i){
// 				if(obj.platforms != null) child[i] = validateSaveModel(obj)
// 			});
// 		}else if(_.isObject(child)){
// 			if(child.platforms != null)	raw_obj[key] = validateSaveModel(obj)
// 		}
// 	});



// 	//find similar objects.
// 	var pipe = findSimilar(raw_obj).then(function(model){
// 		if(model == null) return(createSchema(raw_obj));
// 		else return(mergeSchema(model,raw_obj))
// 	}).then();



// 	return this.promise;
// })





var compareData = {
	'event' : ['venue.name','date','name'],
	'venue' : ['name','location.gps'],
	'artist' : ['name']
};







var fuzzy = require('fuzzyset.js');


function set_data(n,n2){
	var data = '';


	_.each(compareData[n.is],function(field){
		if(_.get(n,field) == null || (n2 != null && _.get(n2,field) == null)) {
			//console.error('bad object comparison data vairable',n.is,field);
			return;
		}

		if(field == 'location.gps' && n.location.gps != null){
			// var lat = parseInt(n.location.gps[0])
			// var lon = parseInt(n.location.gps[1])

			data += Math.round(parseInt(n.location.gps[0])*100)/100+' '+Math.round(parseInt(n.location.gps[1])*100)/100;
			
		}else{
			data += String(_.get(n,field))
		}
		data += ' ';
	});

	//console.log(data);
	return data;	
}


var fuse = require('./fuse.js')




function isMatch(obj,all){
	obj._data = set_data(obj);
	//console.log(obj._data);
	var entries = _.map(all,function(obj2,i){
		if(obj2 == obj) return '-----------------'
		return set_data(obj2,obj);
	});


	var fuzz = fuzzy(entries);
	var match = fuzz.get(obj._data);

	if(match == null){
		return null;
	}
	//console.log(obj.name,match[0])
	if(parseInt(match[0][0]) > 0.9){
		console.log('match:',match[1],'||',obj._data);
		return entries.indexOf(match[1]);
	}else if(parseInt(match[0][0]) > 0.5){
		console.log('semi match',match[0],obj._data);
	}else{
		return null;
	}
}






function compareRaw(dataset){
	//console.log(dataset);
	var overlap_log = {};
	



	_.each(dataset,function(obj,i){

		//console.log(obj.name)
		var match = isMatch(obj,dataset);

		if(match == null) return;
		
		var plat1 = obj.platforms[0]
		overlap_log[plat1] = overlap_log[plat1] || {};
		var overlaps = overlap_log[plat1][dataset[match].platforms[0]];
		if(overlaps != null) overlap_log[plat1][dataset[match].platforms[0]] +=1;
		else overlap_log[plat1][dataset[match].platforms[0]] = 1;

		obj = _.merge(obj,dataset[match]);
		dataset.splice(match,1);
	});





	//overlap log:
	// console.log('scraped overlaps:');
	// _.each(overlap_log,function(val,key){
	// 	console.log(key+':');
	// 	_.each(val,function(val2,key2){
	// 		console.log('   '+key2+': '+val2);
	// 	})
	// });

	return dataset;
}



var addressGPS = require('address-gps');


var getGPS = function(obj,delay){
	//console.log(obj.location);
	if(obj.is == 'venue' && obj.location != null){
		var addr = (obj.location.address || '') + ' ' + (obj.location.city || '') + ' ' + (obj.location.statecode||'')+' '+(obj.name || '');
		var tries = 0;
		function tryget(){
			addressGPS.getGPS(addr,function(location){
				if(_.isString(location)){
					console.log(location)
					if(location.match(/limit/i) != null && tries< 10){
						tries++;
						setTimeout(tryget.bind(this),200)
						return;
					}else{
						resolve(obj);
					}
				}else{
					
					obj.location.gps = [location.latitude,location.longitude];
					console.log('got gps',obj.name);
					resolve(obj);
				}

				
				
				
				
			}.bind(this));
		}
		setTimeout(tryget.bind(this),delay)
	}else if(obj.is == 'event'){
		var addr = obj.venue.location.address + ' ' +  obj.venue.name;
		
	}

	var resolve,reject;
	return new Promise(function(res,rej){
		resolve = res;
		reject = rej;
	});
};



var fillGPS = p.sync(function(dataset){
	var pipes = [];
	_.each(dataset,function(obj,i){
	//	if(obj.location == null || obj.location.gps != null) return;
		pipes.push(getGPS(obj,50*i).then(function(){
			console.log('done',i);
		}));
	});


	var has_address = 0;

	Promise.settle(pipes).then(function(results){
		_.each(dataset,function(obj,i){
			if(obj.location.gps != null) has_address++;
		});
		console.log('GPS DATA FOUND FOR : ',has_address,'/',dataset.length);
		this.resolve();
	}.bind(this));

	return this.promise;
});





//Validator checks parsed data based on gps
module.exports = p.async(function(dataset,save){
	fillGPS(dataset).then(function(){
		this.resolve();
	}.bind(this));


	return this.promise;
});









_.each(compareData,function(val,key){
	if(db[key]==null)return console.error('ERROR, ALLOWED DATA MUST BE IN DATABASE')
});