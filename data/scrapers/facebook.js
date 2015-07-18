//facebook api
var cfg = require('../data_config.json').apis.facebook;
var Promise = require('bluebird');
var request = Promise.promisify(require('request').get);
var colors = require('colors');
var qs = require('querystring');
var p = require('../pFactory');
var gps = require('../gps');
var _ = require('lodash');

module.exports.getKey = p.sync(function(){
	//pass config settings to key.
	var q = {
		client_id: cfg.id,
		client_secret: cfg.secret,
		grant_type: 'client_credentials'
	};

	request({
		url : cfg.api + '/oauth/access_token?' + qs.stringify(q),
	}).spread(function(res,data){
		
		if(data == null) return this.resolve(data);
		return this.resolve(data)
	}.bind(this));

	return this.promise;
});



//get events
module.exports.findEvents = function(opt){

}


//get venues
module.exports.findVenues = function(opt){
	var pos = [null,null];
	
	opt.query_size = opt.query_size || 100;

	
	//get zip gps.
	var getGPS = p.sync(function(zip){
		gps(null,null,zip).then(function(loc){
			if(_.isString(loc)){
				console.log('FB GET VENUES ERR'.bgRed.bold,loc.red);
				return this.reject(loc);
			}
			pos = loc.gps;
			return this.resolve(pos);
		}.bind(this));

		return this.promise;
	})

	var venues = [];
	//get events

	var get = p.sync(function(pos){
		
		var q = {
			q: 'venue',
			type: 'place',
			center: pos[0]+','+pos[1],
			distance: Math.floor(opt.radius/0.000621371) || Math.floor(50/0.000621371),
			fields: 'id,name,picture,location,phone,about,events,category,mission,general_info,genre'
		}


		getOne(cfg.api + '/search?' + qs.stringify(q)+'&'+opt.key);

		var resolve = this.resolve;
		function getOne(url){
			return request({
				url : url,
				json: true
			}).spread(function(res,body){
				console.log(venues.length);
				//base cases
				if(body.data != null) venues = venues.concat(body.data);
				else if(body.error){
					console.log('FB GET VENUES ERR'.bgRed.bold,body.error.message.red);
					return resolve(venues);
				}else return resolve(venues);
				

				//resolve or get next page
				if(venues.length > opt.query_size || (!body.paging  || !body.paging.next)) resolve(_.takeRight(venues,opt.query_size));
				else if(body.paging && body.paging.next) getOne.bind(this)(body.paging.next);

			}.bind(this));	
		}





		return this.promise;
	});



	if(opt.zip != null){
		console.log(opt.zip)
		return getGPS(opt.zip).then(get);
	}else if(opt.gps != null){
		pos = opt.gps;
		return get();
	}else{
		return Promise.reject('FB GET VENUES ERR: no gps or zipcode in params');
	}
}

module.exports.getEvent = function(opt){

}

module.exports.getVenue = function(opt){

}



module.exports.parseVenue = function(venue){
	//console.log(venue);


	var parsed = {
		platforms:[{
			name: 'facebook',
			id: venue.id
		}],
		name: venue.name,
		location: {
			address: venue.location.street+' '+venue.location.city+' '+venue.location.country+' 'venue.location.zip,
			gps: [venue.location.latitude,venue.location.longitude]
		},


	};


	return p.pipe(venue);
}