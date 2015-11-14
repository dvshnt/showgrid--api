/*

EVENTFUL API

*/
var p = require('../pFactory.js');


var cfg = require('../config.json').apis.eventful;
var request = require('request');
//var cities = require('cities');
var Promise = require('bluebird');
var qs = require('querystring');
var moment = require('moment');
var _ = require('lodash');
var gps = require('../gps');
var req_get = p.make1(require('request').get);
var colors = require('colors')

var events_paging_delay = 50;
var events_get_delay = 200;


var current_key = cfg.keys[0];
















var HAS_EVENTS = false;
var GET_EMPTY = true;
var default_host_city = 'nashville';

module.exports.findVenues = function(opt){
	default_host_city = opt.host_city;
	current_key = opt.key;

	var url = cfg.api+'/venues/search';
	if(opt.get_empty != null) GET_EMPTY = opt.get_empty;
	opt.query_size = opt.query_size || 50;
	opt.get_delay = opt.get_delay || 0;
	if(_.isBoolean(opt.has_events)) HAS_EVENTS = opt.has_events;



	//QUERY
	var q = {
		app_key:opt.key,
		page_number:0,
		page_size: opt.query_size < 50 ? opt.query_size : 50,
		sort_order: 'popularity',
		sort_direction: 'descending',
		units: 'miles',
		//category: 'music'
	};

	if(opt.query_size < 100) q.page_size = opt.query_size;
	
	if(opt.zip != null) q.location = opt.zip;
	
	if(opt.radius != null) q.within = opt.radius;
	
	if(opt.sort != null) q.sort_order = opt.sort;

	var limit = opt.query_size;
	//console.log(limit);


	//GET PAGE
	var getAll  = p.async(function(page){


		function get(page){
			q.page_number = page;
			console.log('get eventful page : '.yellow, (url + '?' + qs.stringify(q) ).grey )
			request.get({
				url : url + '?' + qs.stringify(q),
				json: true
			},function(err,res,dat){
				

				if(err){
					console.log('EVENTFUL GET VENUES ERR'.bgRed,err);
					return this.resolve(null);
				};


				if(dat.venues == null || (dat.venues != null && dat.venues.venue == null)){
					console.log('EVENTFUL NO VENUES FOUND'.bgRed,dat);
					return this.resolve(null);
				};


				if(page == 0){
					var max_p = Math.floor(limit/dat.page_size+0.99999)
					this.total = dat.page_count > max_p ? max_p : dat.page_count;
					console.log('eventful got pages '.magenta,this.total,'/',dat.total_items);
					for(var pge = 1;pge<this.total;pge++){
						p.pipe(pge).delay(opt.get_delay*(pge-1)).then(get.bind(this));
					};
				};



				this.data = this.data.concat(dat.venues.venue);
				this.checkAsync();
				//console.log('eventful got page',this.count,'/',this.total);

			}.bind(this));			
		}



		get.bind(this)(0);

		return this.promise
	});



	//GET FULL VENUES
	return getAll().then(p.async(function(raw_venues){
		if(raw_venues == null){
			console.log('eventful tried to get individual venues but was piped null..(no venues)'.bgRed)
			return p.pipe(null);
		}
		console.log('got all eventful venues'.magenta,raw_venues.length);

		this.data = [];
		this.total = raw_venues.length;

		_.each(raw_venues,function(v,i){
			if(v.event_count == 0 && GET_EMPTY == false){
				this.total--;
				return;
			}
			p.pipe({key:opt.key,id:v.id})
			.delay(opt.get_delay/2*i)
			.then(module.exports.getVenue)
			.then(function(v_full){
				this.data.push(v_full);
				this.checkAsync();
				console.log('eventful got venue'.green,this.count,'/',this.total,'(',raw_venues.length,')');
			}.bind(this));
		}.bind(this))

		this.cb = function(){
			delete raw_venues;
		}

		return this.promise;
	}));
};









//GET
var get = p.sync(function(uri,opt){
	var opt = opt;
	var url = cfg.api+uri;
	var tries = 0;
	var q = {
		app_key: opt.key || current_key,
		id: opt.id,
		image_sizes: 'large',
	};
	
	//console.log(url + '?' + qs.stringify(q));
	var get_fn = function(){
		request.get({
			url : url + '?' + qs.stringify(q),
			json: true
		},function(err,res,data){
			tries++;
			if(_.isString(data) && data.match('<title>500 - Internal Server Error</title>') != null){
				console.log('get event internal error, retry in 500 (up to 6)')
				if(tries <= 6){
					p.pipe()
					.delay(500)
					.then(get_fn.bind(this));
					return
				}else{
					if(tries > 1){
						console.log('eventful get retry success'.cyan,'(',tries,')')
					}
					return this.resolve(null)
				}
			}
			//console.log('eventful get ',uri);
			if(err){
				console.log( ('EVENTFUL GET ERR retry in 500 '+err.code).red , ('TRY #'+tries).yellow );
				p.pipe()
				.delay(500)
				.then(get_fn.bind(this));
			}else this.resolve(data);
		}.bind(this)); 
	}

	get_fn.bind(this)();
	



	return this.promise;
});


//GET ARTIST
module.exports.getArtist = function(opt){
	return get('/performers/get',opt);
}


//GET EVENT
module.exports.getEvent = function(opt){
	return get('/events/get',opt);
}


//GET VENUE
module.exports.getVenue = function(opt){
	return get('/venues/get',opt);
}















http://nashville.eventful.com/json/esi/venues/list_events/V0-001-000169428-5?page_number=2%20HTTP/1.1%20Host:%20nashville.eventful.com



//PARSE ARTIST
module.exports.parseArtist = function(artist){
	var parsed =  {
		name: artist.name,
		platforms:[{name:'eventful',id:artist.id}],
		demand: artist.demand_count,
		banners : event.images != null && _.isArray(artist.images.image) ? _.map(artist.images.image,function(img){
			
			var img = img.large || img.medium || img.small
			if(img == null) return null
			return {
				url: img.url,
				width: img.width,
				height: img.height
			}
		}) : null,

		links : event.links != null && _.isArray(artist.links.link) ? _.map(artist.links.link,function(link){
			return {url:link.url}
		}) : null,
		created : artist.created,

	}

	return parsed;
}

















//FILTER EVENT
module.exports.parseEvent = function(event){
	//if(event.title == null) console.log(event);
	if(event == null) return null;
	


	//console.log(event.start_time,event.tz_olson_path,'&',moment(event.start_time).utc().format())

	//console.log(event.venue)
	var n_event =  {
		is: 'event',
		name: event.title,
		platforms:[{
			name:'eventful',
			id: event.id || event.title.replace(/' '/g,'')
		}],
		description: event.description,
		
		date: {
			start: event.start_time != null ? (event.tz_olson_path != null ? moment(event.start_time).tz(event.tz_olson_path).utc().format() : moment(event.start_time).utc().format()) :  null,
			end: event.end_time != null ? (event.tz_olson_path != null ? moment(event.end_time).tz(event.tz_olson_path).utc().format() : moment(event.end_time).utc().format()) : null
		},
		
		created: event.created,

		artists: {
			headers: (function(){
			
				if(event.performer == null) return null;

				if(event.performer.length != null){
					var performers = _.each(event.performer,function(artist){
						return {
							platforms:[{name:'eventful',id:artist.id}],
						}
					});
					return performers;
				}else
					return [{
						platforms:[{name:'eventful',id:event.performer.id}],
					}]
				
			})(),
		},

		banners : event.images != null && _.isArray(event.images.image) ? _.map(event.images.image,function(img){
			var img = img.large || img.medium || img.small
			if( img == null) return null
			return {
				height: img.height,
				width: img.width,
				url : img.url
			};
		}) : null,

		links : event.links != null && _.isArray(event.links.link) ? _.map(event.links.link,function(link){
			return {url:link.url}
		}) : null,
	}

	//console.log(event.start_time,event.tz_olson_path,n_event.date);


	if(event.venue != null){
		n_event.venue = event.venue
	}
	delete event;
	return n_event;
}














//FILTER VENUE DATA
module.exports.parseVenue = function(venue){
	if(venue == null){
		console.log('parse null venue')
		venue = null;
		return null;
	} 



	var n_venue = {
		is: 'venue',
		platforms:[{name:'eventful',id:venue.id}],
		name: venue.name,	
		location: {
			address:venue.address,
			components: {
				city: venue.city,
				zip: venue.postal_code,
				statecode: venue.region_abbr,
				countrycode: venue.country_abbr,
			},
			gps: (venue.latitude != 0 && venue.longitude != 0) ? {lat:venue.latitude,lon:venue.longitude} : null		
		},
		description: venue.description,
		created : venue.created,
		tags: _.union([venue.venue_type],_.map(venue.tags,function(tag){
			return tag.name
		}))
	};

	//venue events






	//console.log(lol++)
	//get links	
	if(venue.links != null && _.isArray(venue.links.link)){
		n_venue.links = _.map(venue.links.link,function(link){
			if(link.type == 'Tickets'){
				return {domain:'tickets' , url:link.url};
			}else{
				return {url:link.url};
			}
			
		});				
	}else if(venue.links != null && venue.links.link != null ){
		n_venue.links = [{url:venue.links.link.url}];
	} 

	//console.log(lol++)
	//get banners
	if(venue.images != null && _.isArray(venue.images.image))
	{
		n_venue.banners = _.map(venue.images.image,function(img){
			var img = img.large || img.medium || img.small;
			if(img == null) return null
			return {
				url: img.url,
				width: img.width,
				height: img.height
			}
		});
	}

	else if(venue.images != null && venue.images.image != null){
		var img = venue.images.image.large || venue.images.image.medium || venue.images.image.small || null;
		if(img != null) n_venue.banners = [{url: img.url,width: img.width,height:img.height}]
	}



	
	var getAllEvents = p.sync(function(city,id){
		var data = [];
		//console.log('GET EVENTS FOR ',id)


		//get
		function get(page){
			var url = 'http://'+city+'.eventful.com/json/esi/venues/list_events/'+id+'?page_number='+page;
			req_get({
				url: url,
				json: true
			}).then(function(res){
				//console.log('GET PAGE ',page,id)
				var dat = res.body

				if(dat == null){
					this.resolve(data);
				}else if(dat.events != null && dat.events.length != 0){

					data = data.concat(dat.events);
					// _.each(dat.events,function(e){
					// 	console.log(e.title.green);
					// })
					p.pipe(page+1).delay(events_paging_delay).then(get.bind(this));

				}else{
					return this.resolve(data)
				}
			}.bind(this)).catch(function(e){
				if(e.code == 'ECONNRESET'){
					console.log('get eventful venue events con reset, retrying in 500');
					p.pipe(page).delay(500).then(get.bind(this));

				}else{
					console.log('get eventful venue events err'.bgRed,e,url);
					this.resolve(data);
				}
				
			}.bind(this));
		}

		get.bind(this)(1);

		return this.promise;
	});



	var TIMEZONE = null; 


	function getTimeZone(){
		return gps.tz(n_venue.location.gps).tap(function(tz){
			TIMEZONE = tz;
		})
	}





	//GET VENUE EVENTS
	var getEvents = p.async(function(events){

		if(events == null || events.length == 0) return p.pipe(null);
		_.each(events,function(e,index){
			if(e == null){
				this.checkAsync();
				return;
			}


			this.total++;
			//GET EVENT
			module.exports.getEvent({
				id: e.seid,
				delay: this.total*events_get_delay
			})

			//PUSH
			.then(function(e){
				e.tz_olson_path = e.tz_olson_path || TIMEZONE;
				if(e != null) this.data.push(module.exports.parseEvent(e))
				this.checkAsync();
			}.bind(this));

		}.bind(this));

		return this.promise;
	});



	var host_city = venue.url.match('http:\/\/(.*)\.eventful\.com');

	if(host_city == null){
		host_city = default_host_city;
		if(host_city == null){
			console.log('VENUE HAS NO HOST CITY FROM URL and PARAMS, cannot get events!'.bgRed);
			console.log(venue.url);
			return p.pipe(null);
		}
	}else{
		host_city = host_city[1]
	}





	//get all events.
	return getTimeZone()
	.then(function(){
		return getAllEvents(host_city,venue.id)
	})
	.tap(function(evnts){
		if(evnts!= null) console.log('eventful got events'.green,'(',evnts.length,')');
		else console.log('no events');
	})
	.then(getEvents)
	.then(function(dat){

		if(GET_EMPTY == false && (dat == null || dat.length == 0)){
			console.log('no events for',n_venue.name,'??')
			return p.pipe(null);
		} 
		n_venue.events = dat;
		venue = null;
		return p.pipe(n_venue);
	});
};






