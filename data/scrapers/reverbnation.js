/*
reliable venue and show scraper.
https://www.reverbnation.com/main/search?city=&country=US&filter_type=venue&geo=Local&page=45&postal_code=37064&q=&sort=relevance&state=&use_postal_code=1&utf8=%E2%9C%93
*/

var cfg = require('../config.json').apis.reverbnation;

//var cities = require('cities');
var cheerio = require('cheerio');
var Promise = require('bluebird');
var p = require('../pFactory.js');
var del = 300;

var request = Promise.promisify(require('request').get);

var colors = require('colors');
var qs = require('querystring');
var _ = require('lodash');
var url = require('url');
var fuzzy = require('fuzzyset.js');
var moment = require('moment');
var gps = require('../gps')

var pagination_count = 10;


var log = require('../util.js').log;


function search(type,opt){

	del = opt.get_delay || del;

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

	var total = null;

	var tries = {};
	var response;
	var reject;





	var getTotal = p.sync(function(){
		q.page = 0;

		request({
			url : url + '?' + qs.stringify(q),
		}).then(function(res){
			var body = res.body
			if(body == null) return this.resolve(-1);
			var $ = cheerio.load(body);
			if($('.content-container > .js-results-div > .alert-box > h5').html() == null) {
				if (body.match('automated requests') != null) console.log('REVERB SCRAPE ERR: '.bgRed.bold,'BANNED'.red)
				return this.resolve(-1);
			}
			total = $('.content-container > .js-results-div > .alert-box > h5').html().match(/^\d{0,4}/);
			if(total != null) total = parseInt(total[0]);
			this.resolve(total);
		}.bind(this));

		return this.promise;
	})




	function get(page,delay){




		tries[page] = tries[page] || 0;
		



		Promise
		.delay(delay)
		.then(function(){
			q.page = page;
			return request({
				url : url + '?' + qs.stringify(q),
			})
		}).catch(function(err){
			console.log(err);
			console.log('REVERB SCRAPE ERR:','venue page',page,' tries: ',tries[page],'page: ',page);
			if(tries[page] < 10){
				tries[page]++;
				get.bind(this)(page,opt.get_delay || 500)
			};
			return p.pipe(null);
		}.bind(this))
		


		.then(function(res){
			var body = res.body;
			if(body == null) return;
		
			if(results.length >= opt.query_size) return;
			sent_requests++;
			var $ = cheerio.load(body);
			var nodes = $('.content-container > .js-results-div > ul > li');
		
			
			
			_.each(nodes,function(node){
				if(results.length >= opt.query_size) return null;
				return results.push($.html(node))
			});



			//LOG
			console.log('reverbnation got venues'.green,String(results.length).gray,'/',String(opt.query_size).gray);
			


			

			if(results.length >= opt.query_size){
				console.log('\ngot REVERB ALL:'.green,results.length.toString().yellow.bold)
				return response(results);
			}
		}.bind(this))
	};

	var sent_requests_aprrox = 0;
	var sent_requests = 0;

	getTotal().then(function(total){
		console.log('rvrb: got max:'.gray,total.toString().yellow)
		total = total;
		
		//banned from reverbnation
		if(total < 0) return response([]);
		

		if(opt.query_size > total) opt.query_size = total;
		


		//how many pages?
		sent_requests_aprrox = Math.floor(opt.query_size/pagination_count+1);
		sent_requests = 0;
		console.log('fetching',sent_requests_aprrox,'pages')


		for(var i = 1;i<sent_requests_aprrox+1;i++){
			//console.log('GET PAGE',i)
			get(i,del*i)
		}




	}.bind(this))

	




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
var getVenueEvents = p.sync(function(venueid){

	//console.log('GET VENUE EVENTS')

	var page = 0;
	var current = 1;
	var events = [];
	var resolve;
	var reject;

	var tries = 0;

	function get(){

		
		var promise = request({url : cfg.api+'/venue/load_schedule/'+venueid+'?page='+current})

		.then(function(res){
			var err = null
			var body = res.body;

			if(err){
				console.log('reverb get venue events error ',venueid,tries,err);
				if(tries < 10){
					tries++;
					setTimeout(get.bind(this),del);
				};
				return this.resolve(null);
			}
			
			
		
			
			if(body == null) return;
			if(tries > 0) console.log('GOT VENUE EVENTS ON TRY #'.bgRed,venueid,tries);
			tries = 0;
			current++;

			var $ = cheerio.load(body);
			var nuggets = $('.show_nugget');

			if(nuggets.length == 0) return this.resolve([]);

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
							this.resolve(events);
						}else{
							//if no same events are found that means we can push that data and try and get more.

							events.push(data);
							//get more..
							get.bind(this)();
						}
					}else{
						events.push(data);
					}
				}.bind(this));
			}.bind(this));
		}.bind(this))
		.catch(function(e){
			console.log('REVERB EVENT SCRAPE ERR, trying again in 500'.bgRed,' tries:',tries,'page:',page,'err:',e);
			if(tries < 7){
				tries++;
				setTimeout(function() {get.bind(this)()}.bind(this), 500);
				return 
			};
		}.bind(this));
	};


	get.bind(this)();

	return this.promise;
});











var current_year = new Date().getFullYear()

/*

PARSE EVENT


*/

module.exports.parseEvent = function(nugget){
	var $ = cheerio.load(nugget);

	//console.log($.html());
	var event_id = $('meta[itemprop=url]').attr('content').match(/\/show\/(\d+)$/);
	if(event_id != null && event_id[1] != null) event_id = event_id[1];
	else event_id = null



	var event = {
		is: 'event',
		name: $('meta[itemprop=name]').attr('content') || null,
		description: $('meta[itemprop=description]').attr('content'),
		platforms: [{
			name:'reverbnation',
			id:event_id
		}],
		date: {
			start: new Date($('meta[itemprop=startDate]').attr('content')).toISOString(),
		},
		artists : {headliners:[]},
		tickets : [{
			url: $($('.shows_buttons_container > a')[2]).attr('href')
		}],

	};


	



	if(event.platforms[0].id == null) event.platforms[0].id = ((event.name || event.description)+event.date.start).split(' ').join('');




	event.name = event.name || event.description;
	





	var event_performers = $('.shows_bands_container_ > li');

	//console.log($.html(event_performers));

	var total = event_performers.length;
	var count = 0;

	_.each(event_performers,function(el){
		var name1 = $(el).find('span[itemprop=name]').text();
		var name2 = $(el).find('.fb_artist_name').text();

		var name =  name1 != '' ? name1 : name2

		var artist_link = $(el).find('.shows_bands_row_band_').attr('href');

		var artist = {
			platforms:[{name:'reverbnation',id: name}],
			name: name1 != '' ? name1 : name2,
		}
		if(artist_link != null){
			artist.links = [{domain:'reverbnation',url:'http://reverbnation.com'+artist_link}]
		}

		event.artists.headliners.push(artist);
	});

	//log(event);
	return p.pipe(event);
}












var p = require('../pFactory.js');
module.exports.getVenue = function(opt){

	var id = opt.id;
	var response;
	var reject;
	var tries = 0;

	//console.log(cfg.api+'/venue/'+id)
	function get(){
		// console.log(cfg.api+'/venue/'+id)
		// console.log(id)
		request({url : cfg.api+'/venue/'+id})
			.then(function(res){
				var body = res.body
				//console.log('got venue '+id+', try#',tries)
				if(body == null) return;
				return response(body);
			}.bind(this))
			.catch(function(error){
				console.log('failed to fetch venue '+id+', try#',tries)
				if(tries < 10){
					tries++;
					setTimeout(get.bind(this),del);
				}
				return [null,null];
			}.bind(this))
	}

	return new Promise(function(res,rej){
		response = res;
		reject = rej;
		get();
	})
}









var getVenueBanners = p.sync(function(photoid){
	
	var tries = 0;

	function get(){

		Promise.delay(del/2 || 200)
		
		.then(function(){
			return request({url : cfg.api+'/venue/view_photo_popup/photo_'+photoid})
		})
		
		.then(function(res){
			var body = res.body
			if(body == null) this.resolve([]);
			
			var banners  = parseVenuePhotos(body);
			this.resolve(banners);
		}.bind(this))
		.catch(function(){
			console.log('failed to fetch bannanas, try#',tries)
			if(tries < 10){
				tries++;
				get.bind(this)();
			}else this.resolve([]);
		}.bind(this))
	}


	get.bind(this)();
	return this.promise;
});























function parseVenuePhotos(body){
	if(body == null) return {};
	var $ = cheerio.load(body);
	var banners  = $('.photo_browser img');
	return _.map(banners,function(el){
		return {
			url: $(el).attr('lazy_load')
		}
	});
}



function parse(body,parsed,$,id){




	parsed = _.merge({
		is: 'venue',
		platforms:[{
			name: 'reverbnation',
			id: id
		}],
		name: $('.profile_user_name').text(),
		events: [],
		links: [],
	},parsed)

	if(body == null) return;

	var $ = cheerio.load(body);


	//address info...
	var addr = $('p[itemprop="address"] > span');
	//console.log(addr)
	parsed.location = {
		address: $(addr[0]).text(),
		components: {
			city: $(addr[1]).text(),
			statecode: $(addr[2]).text(),
			countrycode: $(addr[3]).text(),	
		}
	}

	parsed.events = [];

	//console.log()
	

	//contact info..
	if($($('.profile_section_container_contents > p')[1]).text() != null){
		var phone = $($('.profile_section_container_contents > p')[1]).text();
		if(phone != null){
			phone = phone.match(/\d/g);
			if(phone != null) parsed.phone = phone.join('');
		}
	}
	//console.log(parsed.phone);
	

	//age info..
	var age_match = $($('.profile_section_container_contents > .two_column > span')[1]).text().match(/\d+/);
	if(age_match != null) parsed.age = age_match[0];
	

	//links info... (social media linkes like twitter and facebook)
	var addr = $('.profile_section_container_contents > p > span');
	parsed.location = {
		address: $(addr[0]).text(),
		components: {
			city: $(addr[1]).text(),
			statecode: $(addr[2]).text(),
			countrycode: $(addr[3]).text(),					
		}
	}

	//console.log(parsed.name.green,parsed.location);

	var links = $('#profile_website_items a');
	var raw_links = _.map(links,function(link){
		return {
			
			url:$(link).attr('href')
		};
	});
	var link_groups = {};
	_.each(raw_links,function(link,i){
		var link = link.url;
		var domain = url.parse(link).hostname;
		link_groups[domain] = link_groups[domain] || [];
		link_groups[domain].push(link);
	});

	//if there are more than one link from same site....use the one with the venue name in it if there is one.
	_.each(link_groups,function(group,i){
		if(group.length == 1){
			parsed.links.push({url:group[0]});
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
			parsed.links.push({url:real_link})
		}else{
			var matches = fuzz.get(parsed.name);
			if(matches == null){
				parsed.links = parsed.links.concat(fuzz.values());
				//console.log(parsed.name,);
			}else{
				parsed.links.push({url:matches[0][1]});
			}
		}
	});	

	//console.log(parsed)
	var photos_link = $($('.profile_photos a')[0]).attr('onclick');
	var photos_linkid = null;
	if(photos_link != null) var photos_linkid = photos_link.match(/(?!photo_)\d+/);
	

	var promise = getVenueEvents(parsed.platforms[0].id)
	.then(p.sync(function(events){
		parsed.events = events || [];

	//	console.log('REVERB GOT EVNTS:'.cyan,parsed.events.length.toString().yellow.bold,parsed.name.gray)
		this.resolve(parsed);
		return this.promise;				
	}))

	if(photos_linkid != null){
		promise = promise
		.then(function(){
			return getVenueBanners(photos_linkid)
		})
		.then(p.sync(function(banners){
			parsed.banners = banners
		//	console.log('REVERB GOT BANNERS:'.cyan,parsed.banners.length.toString().yellow.bold,parsed.name.gray)
			this.resolve(parsed);
			return this.promise;
		}));
	}

	return promise;
}



//Parse Venue List Item
module.exports.parseVenueFindItem = p.sync(function(venue){
	
	var $ = cheerio.load(venue);
	//var cit = $('.ml1 > p > span').text().split(',');
	var parsed = {
		is: 'venue',
		platforms:[{name:'reverbnation',id:$('li').data('search-id')}],
		name: $('.ml1 > h4.mb1').text(),
		banners: [{
			url: $('img').attr('src')
		}],
		events: [],
		links: [],
	}

	module.exports.getVenue({
		id: parsed.platforms[0].id,
	}).then(function(body){ 
		return parse(body,parsed,$,parsed.platforms[0].id)
	}).then(function(parsed){
		console.log('reverbnation ',parsed.name,' has #',parsed.events.length)
		this.resolve(parsed);
	}.bind(this));

	return this.promise
});




//Parse Venue List Item
module.exports.parseVenueBody = p.sync(function(venue,id){
	var $ = cheerio.load(venue);
	return parse(venue,{},$,id)
});


