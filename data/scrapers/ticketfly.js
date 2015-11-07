

//ticketfly ticketing
var cfg = require('../config.json').apis.ticketfly;
var Promise = require('bluebird');
var request = Promise.promisify(require('request').get);
var colors = require('colors');
var qs = require('querystring');
var p = require('../pFactory');
var gps = require('../gps').get;
var _ = require('lodash');
var util = require('util');

var getter = require('../data');
var moment = require('moment');
require('moment-timezone')

/*

Get all ticketfly events in a sepcific radius.

max_query only applies to how many venues to search for.

*/


var one_month = 2.62974e9







var getCityStateCountry = p.sync(function(loc){
	
	//get by GPS..
	if(_.isObject(loc)){
		gps(null,null,null,loc.lat+','+loc.lon).then(function(addr){
			this.resolve(addr);
		}.bind(this))
	}


	//get by zipcode
	else if(_.isString(loc) || _.isNumber(loc)){
		gps(null,null,loc).then(function(addr){
			this.resolve(addr)
		}.bind(this))
	}

	return this.promise;
});







/*

DISTANCE PARAM DOES NOT WORK HERE.

TO FETCH ALL, SET DISTANCE = -1;

TO FETCH STATE,  SET DISTANCE = 0;

*/


function getVenueEvents(id,delay){
	return p.pipe({
		url: cfg.api+"/events/upcoming.json?venueId="+id,
		json: true
	}).delay(delay).then(request).then(function(res){
		var dat = res.body
		var err = null
		if(err){
			console.log('ticketfly get venue events err'.bgRed,err);
			return p.pipe(null);
		}
		if(dat == null || dat.events == null || dat.events.length == 0) return p.pipe(null);
		else return dat.events
	});
}

//fetch all venues from city
module.exports.getVenues = p.async(function(opt){
	var limit = opt.query_size || 1000,radius = opt.radius != null ? opt.radius : 0;
	var loc = opt.zip || opt.gps;
	var q;
	var totalpages = Math.floor(limit/200);
	this.data = [];

	if(radius <= 0){
		totalpages = 999;
	}

	







	function get(page){
		var url = cfg.api+"/venues?pageNum="+page+"&maxResults="+(limit > 200 ? 200 : limit)+"&distance="+radius+"mi&"+q;
		//console.log(url);
		request({
			url: url,
			json: true
		}).then(function(res){
			var err = null;
			var dat = res.body;

			if(err) return this.reject(err);
			if(dat == null) this.reject('no data');

			//async pagination
			if(page == 1){
				var amount = dat.totalResults > limit ? limit : dat.totalResults;
				totalpages = Math.floor(amount/dat.maxResults+1)
				this.total = totalpages;
				for(var p2 = 2;p2<=totalpages;p2++){
					p.pipe(p2).delay(200*(p2-2)).then(get.bind(this));
				}
			}


	
			//reduce venues
			console.log('total venues',dat.venues.length)

			//pipes to get all venues with delay intervals
			var pipes = _.map(dat.venues,function(venue,i){
				return getVenueEvents(venue.id,i*50).then(function(events){
					if(events == null) return p.pipe();
					venue.events = events;
					this.data.push(venue);
					console.log('ticketfly got venue events for :',venue.name,'#'+venue.id,'|',events.length);
					return p.pipe()
				}.bind(this));
			}.bind(this));

			//settle all pipes.
			Promise.settle(pipes).then(function(results){
				console.log('venues with events',this.data.length);
				this.checkAsync();
			}.bind(this));

		}.bind(this));
	}




	getCityStateCountry(loc).then(function(loc){


		if(loc == null){
			q = ''
		}else{
			q = {country: loc.components.countrycode}
			if(radius == -1){
				
			}else if(radius == 0){
				q.stateProvince = loc.components.statecode

			}else{
				q.stateProvince = loc.components.statecode
				q.city = loc.components.city
			}
			q = qs.stringify(q);	
		}
		
		return get.bind(this)(1)	
	}.bind(this));



	return this.promise;
});






module.exports.getVenue = function(opt){
	var url = cfg.api+"/venues?venueId="+opt.id+'&key='+opt.key;
	return request({
		url: url,
		json: true
	}).then(function(res){
		var err = null;
		var dat = res.body;

		if(err) return Promise.reject(err);
		if(dat == null || dat.venues.length == 0) return Promise.reject(new Error('no data'));

		var venue = dat.venues[0];

		//get the events for the venue with a 500ms delay
		return p.pipe(null)
		.delay(500)
		.then(getVenueEvents.bind(null,opt.id))

		//link events w/ raw venue data for later parsing.q
		.then(function(events){
			
			venue.events = events;
			console.log(venue.events.length);

			return p.pipe(venue)
		});

	});


	function getVenueEvents(id){
		//console.log(cfg.api+"/events/upcoming.json?venueId="+id)
		return p.pipe({
			url: cfg.api+"/events/upcoming.json?venueId="+id,
			json: true
		})
		.then(request)
		.then(function(res){
			err = null
			dat = res.body
		//	console.log(dat.events)

			//return p.stop(new Error('stop'))
			if(err){
				console.log('ticketfly get venue events err'.bgRed,err);
				return p.pipe(null);
			}
			if(dat == null || dat.events == null || dat.events.length == 0) return p.pipe(null);
			else return p.pipe(dat.events)
		});
	}
}


/*

PARSE FUNCTIONS

*/








module.exports.parseArtist = function(artist){

	parsed = {
		is: 'artist',
		platforms: [{
			name: 'ticketfly',
			id: artist.id
		}],
		name: artist.name,
		description: artist.eventDescription,

		links: _.filter([
			{domain: 'music', url:artist.urlAudio},
			{domain: 'website', url: artist.urlOfficialWebsite},
			{domain: 'music', url: artist.urlPurchaseMusic},
			{domain: 'myspace', url: artist.urlMySpace},
			{domain: 'twitter', url: artist.urlTwitter},
			{domain: 'facebook', url: artist.urlFacebook},
		],function(link){
			return link.url != null && link.url != '';
		}),

		samples: _.filter(_.flatten(_.filter([
			artist.embedVideo,
			_.map(artist.youtubeVideos,function(video){
				return video.embedCodeIframe
			}),
			artist.embedAudio
		])),function(link){
			return link != null && link != ''
		}),

		banners: _.isArray(artist.image) ? _.map(artist.image,function(img,key){
			return {
				height: img.height,
				width: img.width,
				url: img.path
			}
		}) : null,
	}

	return parsed;
}




Promise.longStackTraces();


module.exports.parseEvent = function(event){

	var parsed = {

		is: 'event',
		
		platforms: [{
			name: 'ticketfly',
			id: event.id
		}],

		description: event.description,

		name: event.name,

		venue: module.exports.parseVenue(event.venue),
		
		created: event.dateCreated,

		banners: _.isArray(event.image) ? _.map(event.image,function(img,key){
			return {
				height: img.height,
				width: img.width,
				url: img.path,
			}
		}) : null,


		artists: {
			openers: _.isArray(event.supports) ? _.map(event.supports,function(artist){
				return module.exports.parseArtist(artist);
			}) : null,
			headliners: _.isArray(event.headliners) ? _.map(event.headliners,function(artist){
				return module.exports.parseArtist(artist);
			}) : null
		},

		tags: [event.showType],
		
		tickets: _.union([{
			price: event.ticketPrice,
			sale: {
				start: event.onSaleDate != null ? moment(event.onSaleDate).tz(event.venue.timeZone).utc().format() : null,
				end: event.offSaleDate != null ? moment(event.offSaleDate).tz(event.venue.timeZone).utc().format() : null,
			},
			broker: 'ticketfly',
			url: 'http://www.shareasale.com/r.cfm?B=02&U=1118395&M=01&urllink='+event.ticketPurchaseUrl,
		}], _.isArray(event.externalTicketingUrls) ? _.map(event.externalTicketingUrls,function(obj){
			return {
				url: obj.url
			}
		}) : []),

		age: (_.isString(event.ageLimit) && event.ageLimit.match(/\d+/g) != null ) ? event.ageLimit.match(/\d+/g)[0] : null,
	}


	parsed.date = {
		start: event.startDate != null ? moment(event.startDate).tz(event.venue.timeZone).utc().format() : null,
		end: event.endDate != null ? moment(event.endDate).tz(event.venue.timeZone).utc().format() : null
	}

	return parsed;
}











module.exports.parseVenue = function(venue){

	var parsed = {
		is: 'venue',
		platforms: [{
			name: 'ticketfly',
			id: venue.id
		}],
		name: venue.name,
		location: {
			address: venue.address1 + ' ' + venue.address2 + ' '+venue.city+ ' '+venue.stateProvince+' '+venue.postalCode,
			gps: {lat:venue.lat,lon:venue.lng}
		},
		description: venue.blurb,
		links: _.filter([
			{domain: 'website', url: venue.url},
			{domain: 'twitter', url: venue.urlTwitter},
			{domain: 'facebook', url: venue.urlFacebook},
		],function(link){
			return link.url != null && link.url != '';
		}),
	}

	

	parsed.events = _.map(venue.events,function(event){
		return module.exports.parseEvent(event);
	});

	return parsed;
}


