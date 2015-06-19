
var _ = require('lodash');

var db = require('./data.js');
//scraper endpoints
var scrapers = require('./scrapers');
var Promise = require('bluebird');

//Async data scraping

//console.log(db);


//Validator checks parsed data
var Validator = function(endpoint,dataset){
	if(db[endpoint] == null){
		//console.log(db);
		return console.error('VALIDATOR/SAVE ERROR: no data endpoint found for ',event);
	}
//	console.log('IN VALIDATOR',endpoint,model);


	var models = _.each(dataset,function(obj){
		return new db[endpoint](obj);
	});

//	console.log(models);

	return new Promise(function(res,rej){
		res(models);
	});
}








function main(opt){
	var total = 0;
	var done = 0;
	
	var response;
	var reject;

	//core update function.
	var update = function(plat,plat_name){
		
		//match options platform with scraper tag
		//console.log(plat_name,scraper_tag)

		if(scrapers[plat_name] != null){
			var scraper = scrapers[plat_name];
			found = true;

			//go through all requested endpoints
			plat.endpoints.forEach(function(endpoint,i){
				
				if(scraper[endpoint] == null) return console.error('SCRAPER ERR: '+plat_name+' does not have '+endpoint);
				total++;
				
				var prom = scraper[endpoint](plat.params);
				if(opt.save == false){
				}else prom = prom.then(function(data){
					return Validator(endpoint,data)
				});
				
				prom = prom.then(function(){
					done++;
					if(done >= total){
						response();
					}
				});
				return prom;
			}.bind(this));
		}else console.log('no scraper platform found: ',scraper_tag);;
	}.bind(this)


	//return update promise
	return new Promise(function(res,rej){
		response = res;
		reject = rej;

		_.each(opt.platforms,update);
	}.bind(this))
}


module.exports = main;




