
var db = require('./data');
var update = require('./update');
var Promise = require('bluebird');
var p = require('./pFactory');
var gps = require('./gps');
var _ = require('lodash');


var oneweek = 604800000;


var findEvents = p.sync(function(opt){
	if(opt.zip != null){
		//FIND BY ZIP
		gps(null,null,opt.zip).then(function(loc){
			if(_.isString(loc)) return this.resolve(null,loc);
			res.locals.location = loc.gps;
			return findEvents_GPS(opt)
		}.bind(this));

	}else if(opt.lat != null && opt.lon != null){
		//FIND BY GPS (a bit faster)
		res.locals.location = [opt.lat,opt.lon];
		return findEvents_GPS(opt)

	}else{
		return this.resolve([null,'INVALID PARAMS']);
	}

	return this.promise;
});


var findEvents_GPS = p.sync(function(opt){

	var db_q = {
		location:{gps:{
			$near : {
				$geometry : {type: "Point", coordinates : res.locals.location},
				$maxDistance : parseInt(opt.radius) || 50
			},
		}},
		events: {
			date : {$gt: opt.mindate || new Date(Date()).toISOString(), $lt: opt.maxdate || new Date(Date.parse(Date())+oneweek).toISOString()},
		},
	}

	if(opt.active) db_q.events = {$exists: true, $not: {$size: 0}};

	return db['venue'].find(db_q)
		.select({events: 1})
		.spread(function(docs,err){
			if(err) this.resolve([null,'INTERNAL ERR']);
			if(docs == null) this.resolve([[],null]);
		

			var events = _.takeRight(
				_.sortBy(_.union(
					_.map(docs,function(doc){
						return doc.events
					})
				),function(event){
					return Date.parse(event.date)
				}),(opt.limit != null && opt.limit < 500) ? Math.floor(parseInt(opt.limit)) : 100)


			this.resolve([events,null]);
		}.bind(this));
});













var findVenues = p.sync(function(opt){
	if(opt.zip != null){

		//FIND BY ZIP
		gps(null,null,opt.zip).then(function(loc){
			if(_.isString(loc)) return res.status(500).send(loc)
			res.locals.location = loc.gps;
			return findVenues_GPS(opt); 
		}.bind(this))
	}else if(opt.lat != null && opt.lon != null){
		
		//FIND BY GPS (a bit faster)
		res.locals.location = [opt.lat,opt.lon];
		return findVenues_GPS(opt)
	}else{
		this.resolve([null,'INVALID query']);
	}
});




var findVenues_GPS = p.sync(function(opt){

	var db_q = {
		location:{gps:{
			$near : {
				$geometry : {type: "Point", coordinates : res.locals.location},
				$maxDistance : parseInt(opt.radius) || 50
			}
		}}
	}
	
	if(opt.active) db_q.events = {$exists: true, $not: {$size: 0}};

	var promise = db['venue'].find(db_q).limit((opt.limit != null && opt.limit < 500) ? Math.floor(parseInt(opt.limit)) : 100)

	if(opt.select != null) promise = promise.select(opt.select);
	promise.then(function(docs,err){
		if(err) return this.resolve([null,'INTERNAL ERR']);
		if(docs == null) this.resolve([[],null]);
		return this.resolve([docs,null]);
	}.bind(this));

	return this.promise;
});









module.exports.find = {'event':findEvents,'venue':findVenues};
module.exports.get = {'event':null,'venue':null};
module.exports.push = {'event':null,'venue':null,'artist':null};
module.exports.update = {'event':null,'venue':null,'artist':null};

