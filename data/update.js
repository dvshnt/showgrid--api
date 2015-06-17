
var _ = require('lodash');


//scraper endpoints
var scrapers = require('./scrapers');
var Promise = require('promise');

//Async data scraping1




//Validator checks parsed data
var Validator = function(models){
	console.log('IN VALIDATOR')

	return new Promise(function(res,rej){
		res(models);
	})
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
						if(opt.save == true){
							prom = prom.then(Validator);
						}else{
							prom = prom.then(function(){
								done++;
								if(done >= total){
									resolve();
								}
							});
						}
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