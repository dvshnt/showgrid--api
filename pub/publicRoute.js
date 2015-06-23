var router = require('express').Router();
var data = require('../data/data');

var reverbnation = require('../data/scrapers/reverbnation');

function getVenues(req,res,next){
	reverbnation.findVenues({
		zip: '37064',
		country: 'US',
		radius: 50,
		query_size: 1,
	}).then(function(data){
		res.status(200).send(data[0]);
	})
}

function getShows(req,res,next){
	
}

function getUsers(req,res,next){

}

function getArtists(req,next,res){

}






module.exports = function(){
	router.get('/venues',getVenues);

	router.get('/users',getUsers);

	return router
}