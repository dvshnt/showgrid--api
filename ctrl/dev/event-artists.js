var Promise = require('bluebird');
var db = require('../data/data');
var _ = require('lodash');
var colors = require('colors');


db['venue'].find().limit(20).exec(function(err,docs){
	var total = docs.length;
	var count = 0;
	return Promise.map(docs,function(d,i){

		return Promise.map(d.events,function(e,i){
			return e.extractArtists();
		},{concurrency:1}).finally(function(){
			count++;
			console.log('done with all events extractions for '.bgGreen,d.name,count,total)
		});

	},{concurrency:1}).finally(function(){
		console.log('DONE W/ EXTRACTIONS'.bgCyan);
	});

});