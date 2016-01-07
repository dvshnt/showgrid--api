var cfg = require('../data/config.json');

var router = require('express').Router();
var data = require('../data/data');
/*var update = require('../data/updateAll');*/
var cities = require('cities');
var Promise = require('bluebird');
var p = require('../data/pFactory');
var gps = require('../data/gps');
var _ = require('lodash');
var util = require('../data/util');
var pack = require('../package.json');



//error handling
function err(res,type,status,msg){
	if(status == 500){
		return res.status(status).json({error:msg||type.toUpperCase()+'_SERVER_FAULT'})
	}else if(status == 404){
		return res.status(status).json({error:msg||type.toUpperCase()+'_NOT_FOUND'})
	}else return res.status(500).json({error:msg||type.toUpperCase()+'_OTHER'});
}



//optional cursor parameter or feaults ot beginning.
function paginate(type, opt) {
	opt.limit = util.clamp(opt.limit || cfg.limits.venue[1], cfg.limits.venue[0], cfg.limits.venue[2]);
	
	return data
	.find[type](opt)
	.spread(function(count, dat) {
		var r = {
			total: count,
			type: type,
			data: dat || [],
		};

		if (dat.length >= opt.limit) {
			r.next = dat[dat.length-1]._id
		}

		return p.pipe(r)
	});
}





/*
MANUAL VENUE MERGE

@param from {ObjectId}
@param to {ObjectId}
@param overwrite {boolean}

*/


function mergeVenues(req,res,next){
	if(req.query.from == null)return err(res,'venue',500,'BAD_PARAMS');
	if(req.query.to == null)return err(res,'venue',500,'BAD_PARAMS');

	var overwrite = req.query.overwrite || false;

	function merge(from,to){
		
		if(overwrite){
			to.merge(from,{
				virtuals: true
			});
		}else{
			to.merge(merge['venue'](from,to),{
				virtuals: true
			})
		}

		to.save(function(e){
			if(e){
				console.log(e);
				err(res,'venue','505','SAVE_FAILED');
			}else return res.json(to.toJSON())
		})
	}

	db['venue'].findById(req.query.from)
	.then(function(doc1){
		if(doc1 == null) 
			err(res,'venue',404,'FROM_NOT_FOUND')
		else 
			db['venue'].findById(req.query.to)
			.then(function(doc2){
				if(doc2 == null) err(res,'venue',404,'TO_NOT_FOUND')
				else return merge(doc1,doc2)
			}.bind(this))
	}.bind(this))
	.catch(function(e){
		console.log('MERGE_VENUES_ERR'.bold.bgRed,e);
	})
}





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
function findVenues(req,res,next){
	//QUERY PARAMETER
	paginate('venue',req.query)
	.then(function(dat){
		if(dat == null) return err(res,'find_venues',404);
		else res.json(dat);	
	})
}


/**
 * CREATE VENUE
 * @constructor 

 */
function createVenue(req,res,next){
	return err(res,'venue',500,'TODO'); 
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

	//FIELD SELECTION [START]
	var selects = {
		__v: 0,
		platformIds: 0,
		'events.__v': 0,
		'events.platformIds': 0
	};

	if(req.query.select != null){
		_.each(req.query.select.split(','),function(field){
			selects[field] = 0
		});
	};
	//FIELD SELECTION [END]


	//FIND BY ID
	data['venue'].findById(req.params.id,selects).exec(function(e,doc){


		//ERROR HANDLER
		if(e){
			console.log(e)
			return err(res,'venue',500); 
		}


		//POPULATION
		if(req.query.full){
			data['venue'].populateAsync(doc,[{ path: 'events.artists.headliners'},{ path: 'events.artists.openers'}])
			.then(function(doc){
				res.json(data.sortEvents(doc,req.query));
			});
		}else{
			res.json(data.sortEvents(doc,req.query));
		} 
	});
}


function updateVenue(req,res,next){
	res.status(500).send('TODO');
}

function deleteVenue(req,res,next){

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
function findEvents(req,res,next){
	paginate('event',req.query)
	.then(function(dat){
		if(dat == null) err(res,'venue',404,'Invalid Query'); 
		else res.status(200).json(dat);	
	})
	.catch(function(e){
		console.log('FIND_EVENTS_ERR'.bgRed,e);
		err(res,'venue',500)
	})
}


var oneweek = 604800000;




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

	if(req.query.id != null){
		db_q.events._id = req.query.id;
	}else if(req.query.platname != null && req.query.platid != null){
		db_q.events.platformIds = req.query.platname+'/'+req.query.platid
	}else{
		return res.status(500).send(err('event','500'))
	}


	data['venue'].findOne(db_q).then(function(doc,err){
		if(err) return res.status(500).send(err('event','505'));
		if(doc == null) res.status(404).send(err('event','404'));
		res.json(doc);
	});
}

// function createEvent(req,res,next){
// 	res.status(500).send('TODO');
// }

// function updateEvent(req,res,next){
// 	res.status(500).send('TODO');
// }

// function deleteEvent(req,res,next){

// }





/*
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
	paginate('artist',req.query)
	.then(function(dat){
		if(dat == null) res.status(404).json({error:"ARTIST_NO_MATCH"}); 
		else res.status(200).json(dat);	
	});
}





function updateAll(req,res,next){
	res.send('TODO')
}







function createArtist(req,res,next){
	res.status(500).send('TODO');
}

function updateArtist(req,res,next){
	res.status(500).send('TODO');
}


router.get('/',function(req,res){
	res.send(pack.version)
})

//VENUE ROUTES
router.route('/venue')
	.get(findVenues)
	//.post(createVenue)
router.route('/venue/:id')
	.get(getVenue)
	//.put(updateVenue)

//router.put('/venue/merge',mergeVenues)


//EVENT ROUTES
router.route('/event')
	.get(findEvents)
	//.post(createEvent)
router.route('/event/:id')
	.get(getEvent)
	//.put(updateEvent)


//ARTIST ROUTES
router.route('/artist')
	.get(findArtists)
	//.post(createArtist)
router.route('/artist/:id')
	.get(getArtist)
	//.put(updateArtist)

//UPDATE ROUTES
/*router.route('/update')
	.get(updateAll)
*/

module.exports = router;

	
	// // VENUE ROUTES




