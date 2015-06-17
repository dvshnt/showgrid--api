
var _ = require('lodash');


//scraper endpoints
var scrapers = require('./scrapers');


//Async data scraping

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
						console.log(endpoint,plat);
						scraper.module[endpoint](plat.params).done(function(data){
							count++;
							console.log('COUNT : ',count)
							if(count >= total){
								resolve(data);
							}
							return scraper.parsers[endpoint](data);
						}.bind(this));
					})
				}
			}.bind(this);
			


			_.each(opt.platforms,countOptPlatforms);

		}.bind(this));
	}.bind(this));
}


module.exports = main;