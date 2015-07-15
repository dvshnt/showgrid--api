var router = require('express').Router();

var db = require('../data/data');
var update = require('../data/update');

var cities = require('cities');




function findVenues(req,res,next){
	db['venue'].find()
}

function createVenue(req,res,next){

}

function getVenue(req,res,next){

}





function findEvents(req,res,next){

}

function createEvent(req,res,next){

}

function updateEvent(req,res,next){

}






function findArtists(req,res,next){

}

function createArtist(req,res,next){

}

function updateArtist(req,res,next){

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