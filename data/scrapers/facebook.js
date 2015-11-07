//facebook api
var cfg = require('../config.json').apis.facebook;
var Promise = require('bluebird');
var request = Promise.promisify(require('request').get);
var colors = require('colors');
var qs = require('querystring');
var p = require('../pFactory');
var gps = require('../gps').get;
var _ = require('lodash');
var util = require('../util');
var moment = require('moment');
var cheerio = require('cheerio');

var key_string = cfg.token;

module.exports.getKey = p.sync(function(){
	//pass config settings to key.
	var q = {
		client_id: cfg.id,
		client_secret: cfg.secret,
		grant_type: 'client_credentials'
	};

	var url = cfg.api + '/oauth/access_token?' + qs.stringify(q);

//	console.log('fetching facebook key... ' + '\n\n' + url + '\n\n');


	request({
		url : url,
	}).then(function(res){
		if(res.data == null) return this.resolve(res.data);
		if(res.body != null) key_string = res.body; 

		console.log('FB Key set to [',key_string,']\n\n')

			return this.resolve(res.body)
	}.bind(this));

	return this.promise;
});






//GETTER FIELDS
var event_fields = [
	"id",
	"name",
	"cover",
	"description",
	"start_time",
	'end_time',
	"timezone",
	"ticket_uri",
]

var venue_fields = [
	"link",
	"id",
	"name",
	"picture",
	"location",
	"phone",
	"about",
	"category",
	"mission",
	"general_info",
	'description_html',
	"genre",
	"photos.limit(100){link}",
	"website",
	"likes"
]

//nested event in venue query string
venue_event = ",events.limit(100){"+event_fields.join(',')+"}",

//nested venue in event query string
event_venue = ",place{"+venue_fields.join(',')+"}"


Promise.longStackTraces();






//get venues or events
var Getter = function(type,opt){
	
	
	opt.query_size = opt.query_size || 100;

	
	//get zip gps.



	var docs = [];
	

	var get = p.sync(function(pos){
		var pos = pos.gps

		
		var q = {
			q: '',
			type: type == 'venue' ? 'place' : 'event',
			center: pos.lat+','+pos.lon,
			distance: Math.floor(opt.radius/0.000621371) || Math.floor(50/0.000621371),
			fields: type == 'venue' ? venue_fields.join(',')+venue_event : event_fields.join(',')+event_venue
		}

		getOne(cfg.api + '/search?' + qs.stringify(q)+'&'+key_string);

		var resolve = this.resolve;
		function getOne(url){
			//console.log(url);
			return request({
				url : url,
				json: true
			}).then(function(res){

				if(res.body.data != null) docs = docs.concat(res.body.data);

				else if(res.body.error || !res.body.data.length){
					console.log('FB GET '+(type+"s").toUpperCase()+' ERR'.bgRed.bold,res.body.error.message.red);
					return resolve(docs);
				}else return resolve(docs);
				

				//resolve or get next page
				//console.log(docs.length);
				if(docs.length > opt.query_size || (!res.body.paging  || !res.body.paging.next)) resolve(_.takeRight(docs,opt.query_size));
				else if(res.body.paging && res.body.paging.next) getOne.bind(this)(res.body.paging.next);

			}.bind(this));	
		}

		return this.promise;
	});



	if(opt.zip != null){
		//console.log(opt.zip)
		return gps(null,null,opt.zip).then(get);

	}else if(opt.gps != null){
		pos = opt.gps;
		return get(pos);
	}else{
		return Promise.reject('FB GET '+(type+"s").toUpperCase()+' ERR: no gps or zipcode in params');
	}
}





module.exports.getVenue = function(opt){


		
	return request({
		url : cfg.api + '/' + opt.id + '?fields='+venue_fields.join(',')+'&' + key_string,
		json: true
	}).then(function(res){


		if(err){
			return Promise.reject(err);
		}else if( res.body.error || !res.body.data.length ) {
			return Promise.reject(res.body.error);
		}

		return p.pipe(res.body);

	})
}





module.exports.findVenues = function(opt){
	return Getter('venue',opt);
}

module.exports.findEvents = function(opt){
	return Getter('events',opt);
}









module.exports.parseVenue = function(venue){
	//console.log(venue.events.data);


	var parsed = {
		is: 'venue',
		platforms:[{
			name: 'facebook',
			id: venue.id
		}],
		name: venue.name,
		location: {
			address: venue.location.street+' '+venue.location.city+' '+venue.location.country+' '+venue.location.zip,
			gps: {lat:venue.location.latitude,lon:venue.location.longitude}
		},
		phone: venue.phone,
		about: venue.about,
		demand: venue.likes,
		tags: [venue.category],
		links: [{domain: 'website',url:venue.website},{domain: 'facebook',url:venue.link}],
		banners: (venue.photos != null && venue.photos.data !=  null) ? _.map(venue.photos.data,function(photo){
			return {
				//TODO
				id: photo.id
				//url: photo.link
			}
		}) : null,
		events: (venue.events != null && venue.events.data != null) ? _.map(venue.events.data,function(event){
			return module.exports.parseEvent(event);
		}): [],
	};

//	console.log(venue.photos)
	//console.log(parsed.name,'EVENTS:',parsed.events.length);


	function getPhotos(){
		if(parsed.banners == null || parsed.banners.length == 0) return p.pipe();
		return Promise.settle(_.map(parsed.banners,function(banner){
			//console.log('https://graph.facebook.com/'+banner.id+'/picture?type=normal');
			return request({
				url:'https://graph.facebook.com/'+banner.id+'/picture?type=normal',
				headers:{
					'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/44.0.2403.155 Safari/537.36'
				}
			}).then(function(res){
				//console.log(res.request.uri);
				return p.pipe(res.request.uri.href);
			}).catch(function(err){
				//console.log('got facebook photo url error'.bgRed)
				return p.pipe(null)
			});
		})).then(function(results){
			parsed.banners = util.null_filter(_.map(results,function(r){
				if(r.isFulfilled() && r.value() != null) return {url:r.value()};
				else return null
			}));
			return p.pipe();
		});
	}

	return getPhotos().then(function(){ return p.pipe(parsed)});
}








module.exports.parseEvent = function(event){
	//console.log(event.start_time,event.timezone);
	var parsed = {
		platforms:[{
			name: 'facebook',
			id: event.id
		}],
		name: event.name,
		venue: event.place != null ? module.exports.parseVenue(event.place) : null,
		date: {
			start: event.start_time != null ? (event.timezone != null ? moment(event.start_time).tz(event.timezone).utc().format() : moment(event.start_time).utc().format()) : null,
			end: event.end_time != null ? (event.timezone != null ? moment(event.end_time).tz(event.timezone).utc().format() : moment(event.end_time).utc().format()) : null
		},
		// artists: [{
		// 	headliners: null,
		// 	openers: null
		// }],
		description: event.description,
	}


	if(event.ticket_uri != null){
		parsed.tickets = [{
			url: event.ticket_uri
		}]
	}
	//console.log('END PARSE s')

	return parsed;
}


