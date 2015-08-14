

//ticketfly ticketing
var cfg = require('../config.json').apis.ticketfly;
var Promise = require('bluebird');
var request = Promise.promisify(require('request').get);
var colors = require('colors');
var qs = require('querystring');
var p = require('../pFactory');
var gps = require('../gps');
var _ = require('lodash');
var util = require('util');

var getter = require('../data');
var moment = require('moment');
require('moment-timezone')

/*

Get all ticketfly events in a sepcific radius.

max_query only applies to how many venues to search for.

*/



module.exports.findEvents = p.async(function(opt){
	var limit = opt.query_size || 1000, radius = opt.radius != null ? opt.radius : 50;
	var maxpages = opt.max || null;
	var totalpages = 0;
	var coords = [];
	this.data = []
	var totalpages = Math.floor(limit/200);

	function get(page){
		console.log(cfg.api+"/events/list?orgId=1&pageNum="+page+"&maxResults=200&distance="+radius+"mi&location=geo:"+coords[0]+","+coords[1]);
		request({
			url: cfg.api+"/events/list?orgId=1&pageNum="+page+"&maxResults=200&distance="+radius+"mi&location=geo:"+coords[0]+","+coords[1],
			json: true
		}).spread(function(res,dat,err){
			if(err != null){
				console.log('TICKETFLY GET ERR',err);
				return this.reject();
			}


			//async paginations
			if(page == 1){
				totalpages = (dat.totalPages < totalpages) ? dat.totalPages : totalpages;
				this.total = totalpages;
				for(var p = 2;p<=totalpages;p++){
					get.bind(this)(p);
				}
			}
	
			console.log('tickfly getEvents: '+dat.pageNum.toString().yellow+'/'+totalpages.toString().cyan);
	

			this.data = _.takeRight(this.data.concat(dat.events),limit);
			this.checkAsync();

		}.bind(this));
	}


	//if we gps is passed, do not fetch gps data from google.
	if(opt.gps != null){
		coords = opt.gps;
		get.bind(this)(1);

	//otherwise fetch gps data from google.
	}else if(opt.zip != null){
		gps(null,null,opt.zip,null).then(function(addr){
			coords = addr.gps;
			get.bind(this)(1);	
		}.bind(this));
	}

	return this.promise;
});









var getCityStateCountry = p.sync(function(loc){
	
	//get by GPS..
	if(_.isArray(loc)){
		gps(null,null,null,loc[0]+','+loc[1]).then(function(addr){
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
		console.log(cfg.api+"/venues?pageNum="+page+"&maxResults=200&distance="+radius+"mi&"+q)
		request({
			url: cfg.api+"/venues?pageNum="+page+"&maxResults=200&distance="+radius+"mi&"+q,
			json: true
		}).spread(function(res,dat,err){
			if(err) return this.reject(err);
			if(dat == null) this.reject('no data');

			//async pagination
			if(page == 1){
				console.log(dat.totalPages)
				totalpages = (dat.totalPages < totalpages) ? dat.totalPages : totalpages;
				this.total = totalpages;
				for(var p = 2;p<=this.total;p++){
					get.bind(this)(p);
				}
			}

			console.log('tickfly getVenues: '+dat.pageNum.toString().yellow+'/'+this.total.toString().cyan);
			
			this.data = this.data.concat(dat.venues);
			this.checkAsync();
		}.bind(this));
	}




	getCityStateCountry(loc).then(function(location){
		
		if(location == null){
			q = ''
		}else{
			q = {country: location.country}
			if(radius == -1){
				
			}else if(radius == 0){
				q.stateProvince = location.state

			}else{
				q.stateProvince = location.state
				q.city = location.city
			}
			q = qs.stringify(q);	
		}
		
		return get.bind(this)(1)	
	}.bind(this));



	return this.promise;
});








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
			artist.urlAudio,
			artist.urlMyspace,
			artist.urlPurchaseMusic,
			artist.urlTwitter,
			artist.urlFacebook,
		],function(link){
			return link != null && link != '';
		}),

		streams: _.filter(_.flatten(_.filter([
			artist.embedVideo,
			_.map(artist.youtubeVideos,function(video){
				return video.embedCodeIframe
			}),
			artist.embedAudio
		])),function(link){
			return link != null && link != ''
		}),

		banners: _.isArray(artist.image) ? _.map(artist.image,function(img,key){
			return img.path;
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
			return img.path;
		}) : null,


		artists: {
			openers: _.isArray(event.openers) ? _.map(event.openers,function(artist){
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
		}], _.isArray(event.externalTicketingUrls) ? _.map(event.externalTicketingUrls,function(url){
			return {
				url: url
			}
		}) : []),

		age: (_.isString(event.ageLimit) && event.ageLimit.match(/\d+/g) != null ) ? event.ageLimit.match(/\d+/g)[0] : null,
	}


	parsed.date = {
		start: event.startDate != null ? moment(event.startDate).tz(event.venue.timeZone).utc().format() : null,
		end: event.endDate != null ? moment(event.endDate).tz(event.venue.timeZone).utc().format() : null
	}



	//console.log(parsed.date);
	return parsed;
}











module.exports.parseVenue = function(venue){

	_.each(venue.events,function(event,i){
		venues.events[i] = module.exports.parseEvent(event);
	});

	var parsed = {
		is: 'venue',
		platforms: [{
			name: 'ticketfly',
			id: venue.id
		}],
		banners: [

		],
		name: venue.name,
		location: {
			address: venue.address1 + ' ' + venue.address2 + ' '+venue.city+ ' '+venue.stateProvince+' '+venue.postalCode,
			gps: [venue.lat,venue.lng]
		},
	}

	return parsed;
}