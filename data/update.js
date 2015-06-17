
var _ = require('lodash');


//scraper endpoints
var scrapers = require('./scrapers');
var Promise = require('promise');

//Async data scraping

var Validator = function(){

}





function main(opt){
	var total = 0;
	var done = 0;
	return new Promise(function (resolve, reject) {
		

		_.each(scrapers,function(scraper,scraper_tag){
			

			var countOptPlatforms = function(plat,plat_name){
				
				//match options platform with scraper tag
				if(plat_name.match(scraper_tag)){

					//go through all requested endpoints
					plat.endpoints.forEach(function(endpoint,i){
						
						if(scraper.parsers[endpoint] == null) return console.error('SCRAPER ERR: '+scraper_tag+' does not have '+endpoint);
						total++;
						
						var prom = scraper.module[endpoint](plat.params)
							.then(scraper.parsers[endpoint](data))
							
						if(plat.save == true){
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
					})
				}else return console.error('scraper platform does not exist: ', scraper_tag);
			}.bind(this);
			
			if(opt.platforms == null) console.error('bad param : platforms')
			_.each(opt.platforms,countOptPlatforms);
			

		}.bind(this));
	}.bind(this));
}


module.exports = main;