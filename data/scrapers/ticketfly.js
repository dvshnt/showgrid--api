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



module.exports.findEvents = p.sync(function(opt){
	var limit = opt.query_size || 1000, radius = opt.radius || 50;
	var maxpages = opt.max || null;
	var totalpages = 0;
	var coords = [];
	var events = [];


	function get(page){
		//console.log(coords);
		request({
			url: cfg.api+"/events/list?orgId=1&pageNum="+page+"&maxResults=5&distance="+radius+"mi&location=geo:"+coords[0]+","+coords[1],
			json: true
		}).spread(function(res,dat,err){
			if(err != null){
				console.log('TICKETFLY GET ERR',err);
				return this.reject();
			}

			totalpages = dat.totalPages;


			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			process.stdout.write('tickfly getEvents: '+dat.pageNum.toString().yellow+'/'+totalpages.toString().cyan);
			

			events = events.concat(dat.events);
			console.log('TEST2')
			
			if(dat.pageNum >= totalpages || events.length >= limit){
				this.resolve(events);
			}else{
				get.bind(this)(dat.pageNum+=1);
			}
		}.bind(this));
	}



	//if we gps is passed, do not fetch gps data from google.
	if(opt.gps != null){
		coords = opt.gps;
		get.bind(this)(1).then(function(events){
			this.resolve(events);
		}.bind(this))

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
});









//fetch all venues from city
module.exports.getVenues = p.async(function(opt){

	var limit = opt.limit || 1000;
	var loc = opt.zip || opt.gps;

	var q;




	var totalpages = 0;
	var venues = [];

	
	function get(page){
		request({
			url: cfg.api+"/venues?pageNum="+page+"&maxResults=200&"+q,
			json: true
		}).spread(function(res,dat,err){
			if(err) this.reject(err);
			else if(dat != null){
				process.stdout.clearLine();
				process.stdout.cursorTo(0);
				process.stdout.write('tickfly getVenues: '+dat.pageNum.toString().yellow+'/'+totalpages.toString().cyan);
				//totalpages = dat.totalPages

				totalpages = dat.totalPages
				venues = venues.concat(dat.venues);

				
				if(dat.pageNum >= totalpages || venues.length >= limit){
					this.resolve(venues);
				}else{
					get.bind(this)(dat.pageNum+=1);
				}
			}

		}.bind(this));
	}

	getCityStateCountry(loc).then(function(location){
		if(location == null){
			q = ''
		}else{
			q = qs.stringify({
				city: location.city,
				stateProvince: location.state,
				country: location.country
			})
		}
		
		return p.pipe(1)
	}).then(get.bind(this));


	return this.promise;
});







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



	console.log(parsed.date);
//	console.log(util.inspect(parsed.date, { showHidden: true, depth: null }));
	return parsed;

}











module.exports.parseVenue = function(venue){
	//var nameParts = venue.name.split('"');
	//if(nameParts.length == 3) venue.name = nameParts[1];


	//parse any nested events.
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


