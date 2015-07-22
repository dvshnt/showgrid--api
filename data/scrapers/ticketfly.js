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


/*

Get all ticketfly events in a sepcific radius.

max_query only applies to how many venues to search for.

*/



module.exports.findEvents = p.sync(function(opt){
	var limit = opt.query_size || 5000, radius = opt.radius || 50;
	var maxpages = opt.max || null;
	var totalpages = 0;
	var coords = [];
	var events = [];


	function get(page){
		//console.log(coords);
		request({
			url: cfg.api+"/events/list?orgId=1&pageNum="+page+"&maxResults=5&distance="+radius+"mi&location=geo:"+coords[0]+","+coords[1],
			json: true
		})


		.spread(function(res,dat,err){


			if(err != null){
				console.log('TICKETFLY GET ERR',err);
				return this.reject();
			}



			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			process.stdout.write('tickfly getEvents: '+dat.pageNum.toString().yellow+'/'+totalpages.toString().cyan);
			

			events = events.concat(dat.events);
			console.log('TEST2')
			
			if(dat.pageNum >= 1/*totalpages*/ || events.length >= limit){
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

	var loc = opt.zip || opt.gps;

	var q;




	var totalpages = 10;
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

				venues = venues.concat(dat.venues);

				
				if(dat.pageNum >= totalpages){
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
	
}







module.exports.parseEvent = function(event){
	
	console.log(util.inspect(event, { showHidden: true, depth: null }));
	

	var parsed = {
		is: 'event',
		platforms: [{
			name: 'ticketfly',
			id: event.id
		}],
		


		name: event.name,

		venue: module.exports.parseVenue(event.venue),
		
		created: event.dateCreated,

		banners: _.map(event.image,function(img,key){
			return img.path;
		}),

		
		artists: {
			openers: [],
			headliners: []
		},
		
		tickets: {
			sale: {
				start: event.onSaleDate,
				end: event.offSaleDate
			},
			url: ticketPurchaseUrl,

		},

		age: event.ageLimit,

		date: {
			start: new Date(event.startDate).toISOString(),
			end: new Date(event.endDate).toISOString()
		},

	}


	


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




