var router = require('express').Router();
var data = require('../data/data');



function getVenues(req,res,next){
	res.status(200).send('test');
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