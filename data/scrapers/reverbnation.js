/*
reliable venue and show scraper.
https://www.reverbnation.com/main/search?city=&country=US&filter_type=venue&geo=Local&page=45&postal_code=37064&q=&sort=relevance&state=&use_postal_code=1&utf8=%E2%9C%93
*/

var cfg = require('../data_config.json').apis.reverbnation;

//var cities = require('cities');
var cheerio = require('cheerio');
var Promise = require('bluebird');

var del = 50;

var request = Promise.promisify(require('request').get);


var qs = require('querystring');
var moment = require('moment');
var _ = require('lodash');
var url = require('url');
var fuzzy = require('fuzzyset.js');


var pagination_count = 10;

function search(type,opt){

	var results = [];
	var url = cfg.api+'/main/search';
	opt.query_size = opt.query_size || 50;
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

	var tries = {};
	var response;
	var reject;

	function get(page){
		tries[page] = tries[page] || 0;
		q.page = page;
		request({
			url : url + '?' + qs.stringify(q),
		})
		.delay(del)
		.catch(function(e){
			console.log('error getting venue list. tries: ',tries[page],'page: ',page);
			if(tries[page] < 10){
				tries[page]++;
				get(page);
			};
			return [null,null];
		})
		.spread(function(res,body){
			if(body == null) return;
			q.page++;
			sent_requests++
			var $ = cheerio.load(body)
			var nodes = $('.content-container > .js-results-div > ul > li')
			total = $('.content-container > .js-results-div > .alert-box > h5').html().match(/^\d{0,4}/) || total
			if(total != null) total = parseInt(total[0])
			
			_.each(nodes,function(node){
				if(results.length >= opt.query_size) return null;
				return results.push($.html(node))
			});

			if(opt.query_size > total){
				opt.query_size = total
			}

			if(results.length >= (opt.query_size || total)){
				return response(results);
			}else if(sent_requests >= sent_requests_aprrox){
				get()
			}
		}.bind(this))
	};


	var sent_requests_aprrox = Math.floor(opt.query_size/pagination_count+1);
	var sent_requests = 0;


	//async
	for(var i = 0;i<sent_requests_aprrox;i++){
		get(i);
	}




	return new Promise(function(res,rej){
		response = res;
		reject = rej;
	});
}



module.exports.findVenues = function(opt){
	return search('venue',opt);
}

module.exports.findShows = function(opt){
	return search('show',opt);
}






//go through all pages and get all the events from the venue
function getVenueEvents(venueid){

	var page = 0;
	var current = 1;
	var events = [];
	var resolve;
	var reject;
	var tries = 0;

	function get(){
		//console.log('get',cfg.api+'/venue/load_schedule/'+venueid+'?page='+current);

		

		var promise = request({url : cfg.api+'/venue/load_schedule/'+venueid+'?page='+current})
		.catch(function(e){
			//console.log('get venue events error ',venueid,tries);
			if(tries < 10){
				tries++;
				get();
			};
			return [null,null];
			//console.log('try again:',venueid,tries)
		}.bind(this))
		.delay(del)
		.spread(function(res,body){
			if(body == null) return;
			if(tries > 0) console.log('GOT VENUE EVENTS ON TRY #',venueid,tries);
			current++;

			var $ = cheerio.load(body);
			var nuggets = $('.show_nugget');

			if(nuggets.length == 0) return resolve({});

			var loaded_count = 0; 
			var loaded_total = nuggets.length;
			_.each(nuggets,function(nugget){
				module.exports.parseEvent($.html(nugget)).then(function(data){
					loaded_count++;
					
					if(loaded_count >= loaded_total){
						if(_.find(events,{
							date: data.date
						}) != null){
							//console.log('all events found.. resolve venue events.')
							resolve(events);
						}else{
							//if no same events are found that means we can push that data and try and get more.

							events.push(data);
							//get more..
							get();
						}
					}else{
						events.push(data);
					}
				});
			});
		}.bind(this));
	};

	return new Promise(function(res,rej){
		resolve = res;
		reject = rej;
		get();
	});
};




//parse through a group of show entries.
module.exports.parseEvent = function(nugget){
	var $ = cheerio.load(nugget);


	var event_id = $($('.shows_buttons_container > a')[0]).attr('href');
	var event = {
		is: 'event',
		platform: {'reverbnation': event_id != null ? event_id.match(/\d+/)[0] : null},
		date: moment(new Date($('.shows_date_').text()+' '+new Date().getFullYear())).utc().format(),
		artists : {headliners:[]},
		tickets : [{
			url: $($('.shows_buttons_container > a')[2]).attr('href')
		}]
	};



	var event_performers = $('.shows_bands_container_ > li');


	var total = event_performers.length;
	
	var count = 0;



	return new Promise(function(res,rej){
		_.each(event_performers,function(el){
			var artist_link = $(el).find('.shows_bands_row_band_');


			event.artists.headliners.push({
				platforms:{'reverbnation':artist_link.attr('href')},
				name: $(el).find('.fb_artist_name').text(),
			});

		});
		//console.log(event);
		res(event);
	});
	
	
}
// module.exports.getArtistBody = function(artisthref){
// 	//console.log('GET ARTIST',artisthref);
// 	function get(resolve,reject){
// 		request({
// 			url : cfg.api+artisthref,
// 		},function(err,res,body){
// 			console.log(cfg.api+artisthref);
// 			if(err) return reject(new Promise.CancellationError());
// 			resolve(body);
// 		});
// 	};
// 	return new Promise(get).cancellable();
// };














var p = require('../pFactory.js');

module.exports.getVenue = function(id){

	var response;
	var reject;
	var tries = 0;
	function get(){
		
		request({url : cfg.api+'/venue/'+id})
			.catch(function(error){
				console.log('failed to fetch venue page, try#',tries)
				if(tries < 10){
					tries++;
					get();
				}
				return [null,null];
			}.bind(this))
			.spread(function(res,body){
				if(body == null) return;
				return response(body);
			}.bind(this))
	}

	return new Promise(function(res,rej){
		response = res;
		reject = rej;
		get();
	})
}

function getVenueBanners(photoid,object){
	var tries = 0;
	var response;
	var reject;
	function get(){
		request({url : cfg.api+'/venue/view_photo_popup/photo_'+photoid})
		.delay(del)
		.catch(function(error){
			console.log('failed to fetch banenrs, try#',tries)
			if(tries < 10){
				tries++;
				get();
			}else response();
			
			return [null,null];
		}.bind(this))
		.spread(function(res,body){
			if(body == null) return;
			object.banners = parseVenuePhotos(body);
			response();
		}.bind(this))
	}

	new Promise(function(res,rej){
		response = res;
		reject = rej;
		get();
	});
};
















var util = require('util');

function parseVenuePhotos(body){
	if(body == null) return {};
	var $ = cheerio.load(body);
	var banners  = $('.photo_browser img');
	return _.map(banners,function(el){
		return {
			height: 0,
			width: 0,
			url: $(el).attr('lazy_load')
		}
	});
}

//Parse Venue List Item
module.exports.parseVenueFindItem = function(venue){
	

	var $ = cheerio.load(venue);



	var cit = $('.ml1 > p > span').text().split(',');
	var parsed = {
		is: 'venue',
		platforms:{'reverbnation' : $('li').data('search-id')},
		name: $('.ml1 > h4.mb1').text(),
		banners: [$('img').attr('src')],
		events: [],
		links: [],
	}


	return new Promise(function(resolve,reject){
		module.exports.getVenue(parsed.platforms['reverbnation']).then(function(body){
			if(body == null) return;
	
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
			if($($('.profile_section_container_contents > p')[1]).text() != null){
				var p_with_space = $($('.profile_section_container_contents > p')[1]).text().split('.').join('-');
				if(p_with_space.match(/[^\s]+/) != null){
					parsed.phone = p_with_space.match(/[^\s]+/)[0];
				}else{
					parsed.phone = p_with_space;
				}
			}
			

			//age info..
			var age_match = $($('.profile_section_container_contents > .two_column > span')[1]).text().match(/\d+/);
			if(age_match != null) parsed.age = age_match[0];
			

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
					if(matches == null){
						parsed.links = parsed.links.concat(fuzz.values());
						//console.log(parsed.name,);
					}else{
						parsed.links.push(matches[0][1]);
					}
				}
			});	

			//console.log(parsed)
			var photos_link = $($('.profile_photos a')[0]).attr('onclick');
			if(photos_link != null){
				var photos_linkid = photos_link.match(/(?!photo_)\d+/);
			}
			if(photos_linkid != null){
				var promise = getVenueEvents(parsed.platforms['reverbnation'])
					.then(getVenueBanners(photos_linkid,parsed));
			}else{
				var promise = getVenueEvents(parsed.platforms['reverbnation']);
			}
			
			

			//fill in venue banners and events!
			promise.then(function(data){
				parsed.events = data;
				//console.log(parsed.banners.length);
				
				//link events with venue
				_.each(parsed.events,function(event){
					event.venue = _.clone(parsed);
				});
				//console.log('got..',parsed.banners);
				resolve(parsed);
			});
		});
	});
}