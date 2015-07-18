var router = require('express').Router();
var db = require('../data/data');
var update = require('../data/update');
var cities = require('cities');
var Promise = require('bluebird');
var p = require('../data/pFactory');
var gps = require('../data/gps');
var _ = require('lodash');


/**
 * FIND VENUES
 * @constructor 

location queries
zipcode or lat and lon variables

 * @param {string} zip - zip code to search in 
 * @param {float} lat - latitude to search around 
 * @param {float} lon - longitude to search around 
 * @param {string} radius - radius around that zip code, defaults to 50


 * @param {int} limit - max amount of entries;
 * @param {string} active - only find venues that have active events.
 */





function findVenues(req,res,next,callback){
	if(req.query.zip != null){

		//FIND BY ZIP
		gps(null,null,req.query.zip).then(function(loc){
			if(_.isString(loc)) return res.status(500).send(loc)
			res.locals.location = loc.gps;
			return findVenues_GPS(req,res,next); 
		}.bind(this))
	}else if(req.query.lat != null && req.query.lon != null){
		
		//FIND BY GPS (a bit faster)
		res.locals.location = [req.query.lat,req.query.lon];
		return findVenues_GPS(req,res,next)
	}else{
		res.status(500).send('INVALID PARAMS');
	}
}

function findVenues_GPS(req,res,next){

	var db_q = {
		location:{gps:{
			$near : {
				$geometry : {type: "Point", coordinates : res.locals.location},
				$maxDistance : parseInt(req.query.radius) || 50
			}
		}}
	}
	if(req.query.active) db_q.events = {$exists: true, $not: {$size: 0}};


	return db['venue']
		.find(db_q).limit((req.query.limit != null && req.query.limit < 500) ? Math.floor(parseInt(req.query.limit)) : 100)
		.then(function(docs,err){
			if(err) return res.status(500).send('INTERNAL ERR');
			if(docs == null) return res.status(404).send('NOTHING FOUND');
			return res.status(200).json(docs);
		}.bind(this));
}



/**
 * CREATE VENUE
 * @constructor 

 */
function createVenue(req,res,next){
	res.status(500).send('TODO');
}


/**
 * GET VENUE
 * @constructor 


Searches for one venue with an id or a specifc platform and platform id

 * @param {string} id - id to search for
 * @param {string} platname - platform name
 * @param {string} platid - platform id
 */
function getVenue(req,res,next){

	var db_q = {};

	if(req.params.id != null){
		db_q._id = req.params.id;
	}else if(req.params.platname != null && req.params.platid != null){
		db_q.platformIds = req.params.platname+'/'+req.params.platid
	}else{
		return res.status(500).send('INVALID PARAMS')
	}


	db['venue'].findOne(db_q).then(function(doc,err){
		if(err) return res.status(500).send('INTERNAL ERR');
		if(doc == null) res.status(404).send('NOTHING FOUND');
		res.json(doc);
	});
}


function updateVenue(req,res,next){
	res.status(500).send('TODO');
}


/**
 * FIND EVENT
 * @constructor 

 * @param {string} zip - zip code to search in 
 * @param {float} lat - latitude to search around 
 * @param {float} lon - longitude to search around 
 * @param {string} radius - radius around that zip code, defaults to 50

 * @param {string} mindate - events that start after, default today
 * @param {string} maxdate - event that start before, default taday+ 604800000 (1 week)
 * @param {int} limit - max amount of entries;
 * @param {string} artists - only find events that have artists
 */
var oneweek = 604800000;


function findEvents(req,res,next){
	if(req.query.zip != null){
		//FIND BY ZIP
		gps(null,null,req.query.zip).then(function(loc){
			if(_.isString(loc)) return res.status(500).send(loc)
			res.locals.location = loc.gps;
			return findEvents_GPS(req,res,next); 
		}.bind(this))
	
	}else if(req.query.lat != null && req.query.lon != null){
		//FIND BY GPS (a bit faster)
		res.locals.location = [req.query.lat,req.query.lon];
		return findEvents_GPS(req,res,next)
	}else{
		res.status(500).send('INVALID PARAMS');
	}
}

function findEvents_GPS(req,res,next){

	var db_q = {
		location:{gps:{
			$near : {
				$geometry : {type: "Point", coordinates : res.locals.location},
				$maxDistance : parseInt(req.query.radius) || 50
			},
		}},
		events: {
			date : {$gt: req.params.mindate || new Date(Date()).toISOString(), $lt: req.params.maxdate || new Date(Date.parse(Date())+oneweek).toISOString()},
		},
	}

	if(req.query.active) db_q.events = {$exists: true, $not: {$size: 0}};

	return db['venue'].find(db_q)
		.select({events: 1})
		.then(function(docs,err){
			if(err) return res.status(500).send('INTERNAL ERR');
			if(docs == null) return res.status(404).send('NOTHING FOUND');
		

			var events = _.takeRight(
				_.sortBy(_.union(
					_.map(docs,function(doc){
						return doc.events
					})
				),function(event){
					return Date.parse(event.date)
				}),(req.query.limit != null && req.query.limit < 500) ? Math.floor(parseInt(req.query.limit)) : 100)


			res.json(events);
		})
}



/**
 * GET EVENT
 * @constructor 


Searches for one event with an id or a specifc platform and platform id

 * @param {string} id - id to search for
 * @param {string} platname - platform name
 * @param {string} platid - platform id
 */
function getEvent(req,res,next){
	var db_q = {};

	if(req.params.id != null){
		db_q.events._id = req.params.id;
	}else if(req.params.platname != null && req.params.platid != null){
		db_q.events.platformIds = req.params.platname+'/'+req.params.platid
	}else{
		return res.status(500).send('INVALID PARAMS')
	}


	db['venue'].findOne(db_q).then(function(doc,err){
		if(err) return res.status(500).send('INTERNAL ERR');
		if(doc == null) res.status(404).send('NOTHING FOUND');
		res.json(doc);
	});
}



function createEvent(req,res,next){
	res.status(500).send('TODO');
}

function updateEvent(req,res,next){
	res.status(500).send('TODO');
}





/**
 * FIND ARTISTS
 * @constructor 


Find the artists associated with any events in an area.


Performing in a specific location 
(required zip or lat/long)

 * @param {string} zip - zip code to search in (required / optional)
 * @param {number} lat - latitude to search around (required / optional)
 * @param {number} lon - longitude to search around (required / optional)
 * @param {number} radius - radius around that zip code, defaults to 50 (optional)


Performing in a specific time range 
(optional, default: current date -> one week ahead)

 * @param {date} mindate - artists whos events have a minimum date (optional)
 * @param {date} maxdate - artists whos events have a maximum date (optional)



 * @param {int} limit - max amount of entries; (optional, default: 500)
 */
function findArtists(req,res,next){
	if(req.query.zip != null){
		//FIND BY ZIP
		gps(null,null,req.query.zip).then(function(loc){
			if(_.isString(loc)) return res.status(500).send(loc)
			res.locals.location = loc.gps;
			return findEvents_GPS(req,res,next); 
		}.bind(this))
	
	}else if(req.query.lat != null && req.query.lon != null){
		//FIND BY GPS (a bit faster)
		res.locals.location = [req.query.lat,req.query.lon];
		return findArtists_GPS(req,res,next)
	}else{
		res.status(500).send('INVALID PARAMS');
	}
}



function findArtists_GPS(req,res,next){

	var db_q = {
		location:{gps:{
			$near : {
				$geometry : {type: "Point", coordinates : res.locals.location},
				$maxDistance : parseInt(req.query.radius) || 50
			},
		}},
		events: {
			date : {$gt: req.params.mindate || new Date(Date()).toISOString(), $lt: req.params.maxdate || new Date(Date.parse(Date())+oneweek).toISOString()},

		},
	}

	if(req.query.active) db_q.events = {$exists: true, $not: {$size: 0}};

	return db['venue']
		.find(db_q)
		.populate('events.artists.headliners','events.artists.openers')
		.then(function(docs,err){
			if(err) return res.status(500).send('INTERNAL ERR');
			if(docs == null) return res.status(404).send('NOTHING FOUND');
			
			var artists = [];

			_.each(docs,function(venue){
				_.each(venue.events,function(event){
					artists = artists.concat(_.union(event.artists.headliners,event.artists.openers));
				});
			});


			var artists = _.sortBy(_.takeRight(artists,(req.query.limit != null && req.query.limit < 500) ? Math.floor(parseInt(req.query.limit)) : 100),function(a){
				return a.demand || 0
			});

			res.json(artists);
		})
}


/**
 * GET ARTIST
 * @constructor 


Searches for one eartist with an id or a specifc platform and platform id

 * @param {string} id - id to search for
 * @param {string} platname - platform name
 * @param {string} platid - platform id
 */
function getArtist(req,res,next){
	var db_q = {};

	if(req.params.id != null){
		db_q._id = req.params.id;
	}else if(req.params.platname != null && req.params.platid != null){
		db_q.platformIds = req.params.platname+'/'+req.params.platid
	}else{
		return res.status(500).send('INVALID PARAMS')
	}


	db['artist'].findOne(db_q).then(function(doc,err){
		if(err) return res.status(500).send('INTERNAL ERR');
		if(doc == null) res.status(404).send('NOTHING FOUND');
		res.json(doc);
	});
}













function createArtist(req,res,next){
	res.status(500).send('TODO');
}

function updateArtist(req,res,next){
	res.status(500).send('TODO');
}









module.exports = function(){

	// VENUE ROUTES
	router.route('/venue')
		.get(findVenues)
		.post(createVenue)
	router.route('/venue/:id')
		.get(getVenue)
		.put(updateVenue)

	//EVENT ROUTES
	router.route('/event')
		.get(findEvents)
		.post(createEvent)
	router.route('/event/:id')
		.get(getEvent)
		.put(updateEvent)
	
	//ARTIST ROUTES
	router.route('/artist')
		.get(findArtists)
		.post(createArtist)
	router.route('/artist/:id')
		.get(getArtist)
		.put(updateArtist)

	//UPDATE ROUTES
	router.route('/update')
		.get(updateAll)

	return router
}