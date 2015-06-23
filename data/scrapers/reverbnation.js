/*
reliable venue and show scraper.
https://www.reverbnation.com/main/search?city=&country=US&filter_type=venue&geo=Local&page=45&postal_code=37064&q=&sort=relevance&state=&use_postal_code=1&utf8=%E2%9C%93
*/

var cfg = require('../data_config.json').apis.reverbnation;
var request = require('request');
//var cities = require('cities');
var cheerio = require('cheerio');
var Promise = require('bluebird');
var qs = require('querystring');
var moment = require('moment');
var _ = require('lodash');
var url = require('url');
var fuzzy = require('fuzzyset.js');


var pagination_count = 10;

function search(type,opt){

	var results = [];
	var url = cfg.api+'/main/search';
	opt.query_size = 2;
	var q = {
		country: opt.country_code || 'US',
		filter_type: type,
		geo: 'Local',
		image_sizes: 'large',
		q:'',
		sort:'relevance',
		state:opt.state,
		postal_code: opt.zip,
		city: opt.city,
		use_postal_code: opt.zip != null ? 1 : 0,
		page:0
	};

	var total = 0;
	function get(resolve,reject){

		request.get({
			url : url + '?' + qs.stringify(q),
		},function(err,res,body){
			q.page++;
			var $ = cheerio.load(body);
			var nodes = $('.content-container > .js-results-div > ul > li');
			total = $('.content-container > .js-results-div > .alert-box > h5').html().match(/^\d{0,4}/) || total;
			if(total != null) total = parseInt(total[0]);
			
		
			_.each(nodes,function(node){
				if(results.length >= opt.query_size) return null;
				return results.push($.html(node));
			});


			
			if(opt.query_size > total){
				opt.query_size = total;
			}

			console.log(results.length,opt.query_size)
			if(results.length >= (opt.query_size || total)){
				return resolve(results);
			}else{
				get(resolve,reject);
			}



			
		});
	};

	return new Promise(get);
}



module.exports.findVenues = function(opt){
	return search('venue',opt);
}



module.exports.getVenueBody = function(id){
	function get(resolve,reject){
		request.get({
			url : cfg.api+'/venue/'+id,
		},function(err,res,body){
			resolve(body);
		});
	};
	return new Promise(get);
}


module.exports.parseEventBody = function(nugget){
	
}




module.exports.parseVenueFindItem = function(venue){


	var $ = cheerio.load(venue);



	var cit = $('.ml1 > p > span').text().split(',');
	var parsed = {
		platforms:{'reverbnation' : $('li').data('search-id')},
		name: $('.ml1 > h4.mb1').text(),
		banners: [$('img').attr('src')],
		events: [],
		links: [],
	}
	//console.log($('.js-results-div > .alert-box > h5,h3,h4,h2,h1').html());

	return new Promise(function(resolve,reject){
		module.exports.getVenueBody(parsed.platforms['reverbnation']).then(function(body){
			var $ = cheerio.load(body);
			




			//address info...
			var addr = $('.profile_section_container_contents > p > span');
			parsed.location = {
				address: $(addr[0]).text(),
				city: $(addr[1]).text(),
				statecode: $(addr[2]).text(),
				countrycode: $(addr[3]).text(),	
			}


			//contact info..
			parsed.phone = $($('.profile_section_container_contents > p')[1]).text().split('.').join('-').match(/[^\s]+/)[0];


			//links info... (social media linkes like twitter and facebook)
			var addr = $('.profile_section_container_contents > p > span');
			parsed.location = {
				address: $(addr[0]).text(),
				city: $(addr[1]).text(),
				statecode: $(addr[2]).text(),
				countrycode: $(addr[3]).text(),	
			}

			var links = $('#profile_website_items a');
			var raw_links = _.map(links,function(link){
				return $(link).attr('href');
			});
			var link_groups = {};
			_.each(raw_links,function(link,i){
				var domain = url.parse(link).hostname;
				link_groups[domain] = link_groups[domain] || [];
				link_groups[domain].push(link);
			});

			//if there are more than one link from same site....use the one with the venue name in it if there is one.
			_.each(link_groups,function(group,i){
				if(group.length == 1){
					parsed.links.push(group[0]);
					return
				} 

				var real_link = null;
				var fuzz = null
				_.each(group,function(link,i){
	
					if(real_link == null && link.match(/pages\/page/) != null){
						
						real_link = link;
						return false;
					}else if(real_link != null){
						return false;
					}else{
						fuzz = fuzz || fuzzy()
						fuzz.add(link);
					}
				});

				if(real_link != null){
					parsed.links.push(real_link)
				}else{
					var matches = fuzz.get(parsed.name);
					parsed.links.push(matches[0][1]);
				}
			});


			//event info
			_.each($('#shows_container > li'),function(nugget){
				
				module.exports.parseEventBody(nugget).then(function(events){
					parsed.events = parsed.events.concat(events);
					
					console.log(parsed);

				}.bind(this));

			}.bind(this));



				
				
			//console.log(parsed);
			resolve(parsed);
		});
	});
}



module.exports.findEvents = function(){
	
}