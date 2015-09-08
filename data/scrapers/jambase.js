/*
JAMBASE API 
*/


var cfg = require('../config.json').apis.jambase;
var request = require('request');
//var cities = require('cities');
var Promise = require('bluebird');
var qs = require('querystring');
var moment = require('moment');

var p = require('../pFactory')

var _ = require('lodash')
var log = require('../util').log;

var colors = require('colors');

var req = Promise.promisify(request.get);
//Promise.longStackTraces();

//GET VENUES

var one_month = 2.62974e9

var find = p.async(function(type,opt){
	var limit = opt.query_size || 1000, radius = opt.radius != null ? opt.radius : 50;
	var url = cfg.api+(type == 'venue' ? '/venues' : '/events');
	var q = {
		api_key:opt.key,
		radius:opt.radius || 10
	};


	if(type == 'event'){
		var start_date = opt.start_date || new Date();
		var end_date = opt.end_date || new Date(Date.parse(start_date) + one_month*6);

		console.log(start_date)
		console.log(start_date.getUTCDay())
		var start_date = start_date.getUTCFullYear()+'-'+(start_date.getUTCMonth()+1)+'-'+end_date.getDate();
		var end_date = end_date.getUTCFullYear()+'-'+(end_date.getUTCMonth()+1)+'-'+end_date.getDate();

		q.startDate = start_date;
		q.endDate = end_date;
	}



	if(opt.zip != null) q.zipCode = opt.zip;
	if(opt.radius != null) q.radius = opt.radius;


	var pagination = 50;



	var totalpages = Math.floor(limit/pagination+1);

	function get(page,delay,tries){
		//console.log('jambase get page',page);
		console.log(url + '?' + qs.stringify(q)+'&page='+page);
		var tries = tries || 0;
		p.pipe({
			url : url + '?' + qs.stringify(q)+'&page='+page,
			json: true
		})
		.delay(delay)
		.then(req)
		.spread(function(res,dat,err){
			tries ++;
			if(dat == null){
				console.log('jambase get '+type+' ERR'.bgRed,err)
				return this.resolve(null);
			}

			if( (type == 'venue' ? dat.Venues : dat.Events) == null || dat.Info == null){
				if(_.isString(dat) && dat.match('<h1>Developer Over Rate</h1>') != null || dat.match('Developer Over Qps') != null){
					if(tries < 2){
						console.log('jambase over rate, try again in 600.',tries)
						get.bind(this)(page,(opt.get_delay || 600),tries+1);
						return 
					}else{
						console.log("Jambase find ".bgRed.bold+type+"s","ERR:".bgRed.bold,dat)
						this.checkAsync();
						return
					}
				}else{
					console.log('jambase get '.bgRed+type+' ERR'.bgRed,dat)
				}
			}

			if(page == 0){
				maxpages = Math.floor(dat.Info.TotalResults/pagination+1);
				totalpages = maxpages < totalpages ? maxpages : totalpages;
				//log(dat
				this.total = totalpages;
				if(dat.Info.TotalResults < pagination){
					this.total = 0;
				}else{
					for(var pge = 1;pge<this.total;pge++){
						get.bind(this)(pge,(opt.get_delay || 800)*pge);
					}
				}
			}


			var d = (type == 'venue' ? dat.Venues: dat.Events);

			this.data = this.data.concat(d);
			
			this.checkAsync();

			
			console.log('page #'+dat.Info.PageNumber,this.data.length,'/',dat.Info.TotalResults);
		}.bind(this)).catch(function(e){
			console.log('jambase get err',e)
			this.resolve(this.data);
		}.bind(this));	
	}


	get.bind(this)(0,0)

	return this.promise;	
})



module.exports.getVenue = function(opt){

	return req({
		url: 'http://api.jambase.com/venues?id='+opt.id+'&api_key='+opt.key,
		json: true		
	}).spread(function(res,dat,err){
		if(dat == null || err) return Promise.reject(err);
		return dat;
	});
	
}




//FIND SHOWS
module.exports.findEvents = function(opt){
	return find('event',opt);
}

module.exports.findVenues = function(opt){
	return find('event',opt).then(function(events){
		var venues = [];

		//flip
		_.each(events,function(e){
			var found = false;
			_.each(venues,function(v){
				if(v.Id == e.Venue.Id){
					v.Events.push(e);
					delete e.Venue;
					found = true
					return false
				}
			});
			
			if(!found){
				var nv= _.clone(e.Venue);
				venues.push(nv);
				nv.Events = [e];
				delete e.Venue;
			} 
			
			
		});
		return p.pipe(venues);
	});
}




//PARSE A VENUE
module.exports.parseVenue = function(venue){
	
	var v = {
		is: 'venue',
		name: venue.Name,
		platforms:[{name:'jambase',id:venue.Id}],
		location: {
			address: venue.Address || [venue.City,venue.StateCode,venue.ZipCode,venue.CountryCode].join(' , '),
			components: {
				city: venue.City,
				zip: venue.ZipCode,
				statecode: venue.StateCode,
				countrycode: venue.CountryCode,
			},
			gps: {lat:venue.Latitude,lon:venue.Longitude},
		},

	};

	if(_.isArray(venue.Url)){
		v.links = _.map(venue.Url,function(url){ 
			return {domain:'website',url:url}
		});
	}else if(_.isString(venue.Url)){
		v.links = [{domain:'website',url:venue.Url}]
	}

	venue = null;
	return v;
}





//PARSE AN ARTIST
module.exports.parseArtist = function(artist){
	return{
		is: 'artist',
		platforms:[{name:'jambase',id:artist.Id}],
		name: artist.Name,
	};		
}





//PARSE A SHOW
module.exports.parseEvent = function(event){
	var e = {
		is: 'event',
		platforms:[{name:'jambase',id:event.Id}],
		date: {
			start: moment(event.Date).utc().format(),
		},
		name: event.Name || _.map(event.Artists,function(artist){
			return artist.Name
		}).join(' | '),
		age: null,
		tickets: [{
			url: event.ticketUrl
		}],
		artists: {
			//everything defaults to headliners for jambase
			headliners: _.map(event.Artists,function(artist){
				return module.exports.parseArtist(artist);
			})
		},
		venue: module.exports.parseVenue(event.Venue)
	};

	event = null
	return e;
};



