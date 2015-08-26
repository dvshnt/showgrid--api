//database setup
var cfg = require('./config.json');
var opt_dev = true;



var Promise = require('bluebird');
Promise.longStackTraces();
var mongoose = Promise.promisifyAll(require('mongoose'));
var merge = require('mongoose-merge-plugin');
mongoose.plugin(merge);

var Promise = require('bluebird');
var p = require('./pFactory');
var gps = require('./gps').get;
var _ = require('lodash');
var colors = require('colors');



var Venue = require('./models/venue-event');
var User = require('./models/user');
var Artist = require('./models/artist');


function connect(){
	if(process.env.NODE_ENV == 'development' || opt_dev == true){
		mongoose.connect(cfg.dev_db);
	}else{
		mongoose.connect(cfg.live_db);
	}

	mongoose.connection.on('error',console.error.bind(console,'connection error'));	
}



connect()






Promise.longStackTraces();






var onemonth = 604800000*4;
var oneweek = 604800000;
var oneyear = onemonth*12;
var meters_in_a_mile = 1609.34;
var max_venue_query_limit = 50;








/*
Find Venues Query

@param limit {number}
@param full {bool}
@param q {string}
@param zip {string}
@param lat {number}
@param lon {number}
*/
var findVenues = function(opt){


	//FIND BY ZIP
	var fill = function(count,docs){
		
		if(!opt.full) return p.pipe([count,docs]);

		return Promise.settle(_.map(docs,function(doc){
			return Venue.populate(doc,[{ path: 'events.artists.headliners'},{ path: 'events.artists.openers'}])
		})).then(function(results){
			return p.pipe([count,_.map(results,function(r){
				try{
					return r.value();
				}catch(e){
					console.log('populate error',e);
					return null
				}
				return r.value();
			})])
		});
	};


	



	//FIND BY GPS (a bit faster)
	return findVenues_GPS(opt).spread(fill);
};


function sortEvents(doc,opt){
	//console.log(opt.mindate,',',opt.maxdate);
	
	if(doc.events == null || doc.events.length == 0) return doc;


	//Only disaply events whose date is grater than now or a date that has been set in the query
	doc.events = _.filter(doc.events,function(e){
		if( e.date.start > new Date(opt.mindate || Date.now()) && (e.date.end  || e.date.start ) < new Date(opt.maxdate || Date.now()+oneyear)) return true
			return false
	});
	

	//Sort venue events by date
	doc.events = _.sortBy(doc.events,function(event){
		return Date.parse(event.date.start)
	});

	return doc
}



var findVenues_GPS = p.async(function(opt){
	this.total = 2;
	//console.log(opt)
	var db_q = {};
	var fields = {};



	if(opt.lon != null && opt.lat != null){
		db_q["location._gps"] = {
			$nearSphere : {
				$geometry : {type: "Point", coordinates : [opt.lon,opt.lat]},
				$maxDistance : parseInt(opt.radius*meters_in_a_mile) || 50*meters_in_a_mile
			}
		}
	}else if(opt.zip != null){
		db_q["location.components.zip"] = opt.zip
	}


	// db_q.events= {
	// 	date : {$gt: opt.mindate || new Date().toISOString(), $lt: opt.maxdate || new Date(Date.now()+oneyear).toISOString()},
	// }
	

	

	//query option
	if(opt.q != null){
		fields.score = { $meta: "textScore" };
		db_q.$text = { $search : opt.q };
	} 



	if(opt.active) db_q.events = {$exists: true, $not: {$size: 0}};



	//count venues
	Venue.count(db_q).exec(function(err,count){
		if(err){
			console.log('COUNT VENUES ERR',err);
			this.reject(err);
		}else{
			this.data[0] = count;
		} 
		this.checkAsync();
	}.bind(this));



	if(opt.cursor != null){
		db_q._id = {$gt: opt.cursor}
	}


	
	//field selection
	var selects = {
		'__v': 0,
		'platforms': 0,
		'events.__v': 0,
		'events.platformIds': 0
	};

	if(opt.select != null){
		_.each(opt.select.split(','),function(field){
			selects[field] = 0
		});
	}
		


	

	//console.log(db_q);
	var promise = Venue.find(db_q,fields).limit((opt.limit != null && opt.limit < max_venue_query_limit ) ? Math.floor(parseInt(opt.limit)) : max_venue_query_limit ).select(selects)

	if(opt.q != null) promise = promise.sort({ score: { $meta: "textScore" } })
	promise.exec(function(err,docs){
		if(docs == null) this.data[1] = null;
		else{
			_.each(docs,function(doc,i){
				docs[i] = sortEvents(doc,opt)
			});
			this.data[1] = docs
		}
		this.checkAsync();
	}.bind(this));


	return this.promise;
});



























//FIND EVENTS
var findEvents = p.sync(function(opt){
	if(opt.zip != null){
		//FIND BY ZIP
		gps(null,null,opt.zip).then(function(loc){
			if(_.isString(loc)) return this.resolve(null,loc);
			opt.lat = loc.gps.lat;
			opt.lon = loc.gps.lon;
			this.resolve(findEvents_GPS(opt))
		}.bind(this));

	}else if(opt.lat != null && opt.lon != null){
		//FIND BY GPS (a bit faster)
		this.resolve(findEvents_GPS(opt));
	}else{
		return this.resolve([null,'INVALID PARAMS']);
	}

	return this.promise;
});



//FIND EVENTS GPS
var findEvents_GPS = p.sync(function(opt){
	
	var db_q = {
		location:{gps:{
			$nearSphere : {
				$geometry : {type: "Point", coordinates : [opt.lat,opt.lon]},
				$maxDistance : parseInt(opt.radius) || 50
			},
		}},
		events: {
			date : {$gt: opt.mindate || Date.now(), $lt: opt.maxdate || Date.now()+oneyear},
		},
	}

	if(opt.cursor != null){
		db_q._id = {$gt: opt.cursor}
	}



	if(opt.active) db_q.events = {$exists: true, $not: {$size: 0}};

	return Venue.find(db_q)
		.select({events: 1})
		.spread(function(docs){
			if(err) this.resolve([null,'INTERNAL ERR']);
			if(docs == null) this.resolve([[],null]);
			var events = _.takeRight(
				_.sortBy(_.union(
					_.map(docs,function(doc){
						return doc.events
					})
				),function(event){
					return Date.parse(event.date.start)
				}),(opt.limit != null && opt.limit < 500) ? Math.floor(parseInt(opt.limit)) : 100)
			this.resolve([events,null]);
		}.bind(this));
});


























var findArtists = p.sync(function(opt){
	if(opt.zip != null){
		//FIND BY ZIP
		gps(null,null,opt.zip).then(function(loc){
			if(_.isString(loc)) return res.status(500).send(loc)
			res.locals.location = loc.gps;
			this.resolve(findArtists_GPS(opt)); 
		}.bind(this))
	
	}else if(opt.lat != null && opt.lon != null){
		//FIND BY GPS (a bit faster)
		res.locals.location = [opt.lat,opt.lon];
		this.resolve(findArtists_GPS(opt));
	}else{
		res.status(500).send('INVALID query');
	}

	return this.promise
});


var findArtists_GPS = p.sync(function(opt){

	var db_q = {
		location:{gps:{
			$near : {
				$geometry : {type: "Point", coordinates : res.locals.location},
				$maxDistance : parseInt(opt.radius) || 50
			},
		}},
		events: {
			date : {$gt: opt.mindate || Date.now(), $lt: opt.maxdate || new Date(Date.parse(Date())+oneweek)},
		},
	}

	if(opt.active) db_q.events = {$exists: true, $not: {$size: 0}};


	return db['artist']
	.find(db_q)
	.populate('events.artists.headliners','events.artists.openers')
	.then(function(docs){
		if(docs == null) this.resolve(null)
		else{
			var artists = [];

			_.each(docs,function(venue){
				_.each(venue.events,function(event){
					artists = artists.concat(_.union(event.artists.headliners,event.artists.openers));
				});
			});


			var artists = _.sortBy(_.takeRight(artists,(opt.limit != null && opt.limit < 500) ? Math.floor(parseInt(opt.limit)) : 100),function(a){
				return a.demand || 0
			});

			this.resolve(artists)
		}
	
	})

	return this.proomise;
});













Promise.promisifyAll(Venue);
Promise.promisifyAll(Venue.prototype);


Promise.promisifyAll(User);
Promise.promisifyAll(User.prototype);

Promise.promisifyAll(Artist);
Promise.promisifyAll(Artist.prototype);





//export our models to the controllers
module.exports = {
	sortEvents: sortEvents,

	find : {'event':findEvents,'venue':findVenues,'artist':findArtists},
	get : {'event':null,'venue':null},
	push : {'event':null,'venue':null,'artist':null},
	update : {'event':null,'venue':null,'artist':null},

	venue: Venue,
	user: User,
	artist: Artist
}




