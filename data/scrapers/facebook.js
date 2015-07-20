//facebook api
var cfg = require('../data_config.json').apis.facebook;
var Promise = require('bluebird');
var request = Promise.promisify(require('request').get);
var colors = require('colors');
var qs = require('querystring');
var p = require('../pFactory');
var gps = require('../gps');
var _ = require('lodash');
var util = require('util');


var key_string = '';

module.exports.getKey = p.sync(function(){
	//pass config settings to key.
	var q = {
		client_id: cfg.id,
		client_secret: cfg.secret,
		grant_type: 'client_credentials'
	};

	request({
		url : cfg.api + '/oauth/access_token?' + qs.stringify(q),
	}).spread(function(res,data,err){
		if(err) return this.reject(err);
		
		if(data == null) return this.resolve(data);
		key_string = data;
		return this.resolve(data)
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
	"timezone",
	"ticket_uri",
]

var venue_fields = [
	"id",
	"name",
	"picture",
	"location",
	"phone",
	"about",
	"category",
	"mission",
	"general_info",
	"genre",
	"photos{link}.lmit(100)",
	"website",
	"likes"
]

//nested event in venue query string
venue_event = ",events{"+event_fields.join(',')+"}.limit(100)",

//nested venue in event query string
event_venue = ",place{"+venue_fields.join(',')+"}"







//get venues or events
var Getter = function(type,opt){
	var pos = [null,null];
	
	opt.query_size = opt.query_size || 100;

	
	//get zip gps.
	var getGPS = p.sync(function(zip){
		gps(null,null,zip).then(function(loc){
			if(_.isString(loc)){
				console.log('FB GET '+(type+"s").toUpperCase()+' ERR'.bgRed.bold,loc.red);
				return this.reject(loc);
			}
			pos = loc.gps;
			return this.resolve(pos);
		}.bind(this));

		return this.promise;
	})

	var docs = [];
	

	var get = p.sync(function(pos){
		



		var q = {
			q: type == 'venue' ? 'Venues' : 'Events',
			type: type == 'venue' ? 'place' : 'event',
			center: pos[0]+','+pos[1],
			distance: Math.floor(opt.radius/0.000621371) || Math.floor(50/0.000621371),
			fields: type == 'venue' ? venue_fields.join(',')+venue_event : event_fields.join(',')+event_venue
		}


		getOne(cfg.api + '/search?' + qs.stringify(q)+'&'+key_string);

		var resolve = this.resolve;
		function getOne(url){
			return request({
				url : url,
				json: true
			}).spread(function(res,body){
				//console.log(docs.length);
				//base cases
				if(body.data != null) docs = docs.concat(body.data);
				else if(body.error){
					console.log('FB GET '+(type+"s").toUpperCase()+' ERR'.bgRed.bold,body.error.message.red);
					return resolve(docs);
				}else return resolve(docs);
				

				//resolve or get next page
				if(docs.length > opt.query_size || (!body.paging  || !body.paging.next)) resolve(_.takeRight(docs,opt.query_size));
				else if(body.paging && body.paging.next) getOne.bind(this)(body.paging.next);

			}.bind(this));	
		}

		return this.promise;
	});



	if(opt.zip != null){
		//console.log(opt.zip)
		return getGPS(opt.zip).then(get);
	}else if(opt.gps != null){
		pos = opt.gps;
		return get();
	}else{
		return Promise.reject('FB GET '+(type+"s").toUpperCase()+' ERR: no gps or zipcode in params');
	}
}






module.exports.findVenues = function(opt){
	return Getter('venue',opt);
}

module.exports.findEvents = function(opt){
	return Getter('events',opt);
}












module.exports.parseVenue = function(venue){
	console.log(venue);

	var parsed = {
		is: 'venue',
		platforms:[{
			name: 'facebook',
			id: venue.id
		}],
		name: venue.name,
		location: {
			address: venue.location.street+' '+venue.location.city+' '+venue.location.country+' '+venue.location.zip,
			gps: [venue.location.latitude,venue.location.longitude]
		},
		phone: venue.phone,
		about: venue.about,
		demand: venue.likes,
		tags: [venue.category],
		links: [venue.website],
		banners: venue.photos !=  null ? (function(data){
			return _.map(data,function(photo){
				return photo.link
			})
		})(venue.photos.data) : null,
		events: venue.events != null ? (function(events){
			return _.map(events,function(event){
				return module.exports.parseEvent(event);
			})
		})(venue.events.data) : null,


	};
	console.log('------------------')
	console.log(util.inspect(parsed, { showHidden: true, depth: null }));

	//console.log(parsed);
	return p.pipe(parsed);
}


module.exports.parseEvent = function(event){
	var parsed = {
		platforms:[{
			name: 'facebook',
			id: event.id
		}],
		name: event.name,
		venue: event.place != null ? (function(place){
			return module.exports.parseVenue(place);
		})(event.place) : null,
		tickets: [{
			url: event.ticket_uri
		}],
		description: event.description,

	}

	return p.pipe(parsed)
}
