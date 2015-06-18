
var _ = require('lodash');

var db = require('./data.js');
//scraper endpoints
var scrapers = require('./scrapers');
var Promise = require('bluebird');

//Async data scraping

console.log(db);


//Validator checks parsed data
var Validator = function(endpoint,dataset){
	if(db[endpoint] == null){
		console.log(db);
		return console.error(endpoint, ' VALIDATOR/SAVE ERROR: no endpoint found');
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
	return new Promise(function (resolve, reject) {
		
		_.each(scrapers,function(scraper,scraper_tag){

			var countOptPlatforms = function(plat,plat_name){
				
				//match options platform with scraper tag
				console.log(plat_name,scraper_tag)

				if(plat_name.match(scraper_tag)){

					//go through all requested endpoints
					plat.endpoints.forEach(function(endpoint,i){
						
						if(scraper[endpoint] == null) return console.error('SCRAPER ERR: '+scraper_tag+' does not have '+endpoint);
						total++;
						
						var prom = scraper[endpoint](plat.params);
						if(opt.save == false){
						}else prom = prom.then(function(data){
							return Validator(endpoint,data)
						});
						
						prom = prom.then(function(){
							done++;
							if(done >= total){
								resolve();
							}
						});
						return prom;
					}.bind(this));
				};
			}.bind(this);
			
			if(opt.platforms == null) console.error('bad param : platforms');
			_.each(opt.platforms,countOptPlatforms);
			
		}.bind(this));
	}.bind(this));
}


module.exports = main;




