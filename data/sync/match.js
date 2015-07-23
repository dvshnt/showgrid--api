var _ = require('lodash');
var Promise = require('bluebird');
var fuzzy = require('fuzzyset.js'); //fuzzy matching for finding models that are similar.
var p = require('../pFactory.js'); //promise factory shortucts.
var colors = require('colors');
var mongoose = require('mongoose');

/*

	MATCH FUNCTIONS.

*/

function fuzzyMatch(str1,str2){
	var fuzz = fuzzy([str1]);
	var match = fuzz.get(str2);
	if(match[0] != null){

	}
}

function sameGPS(coord1,coord2){
	var maxd = 0.0001;
	//console.log('check GPS',coord1,coord2);
	var d = Math.sqrt((coord1[0]-coord2[0])*(coord1[0]-coord2[0])+(coord1[1]-coord2[1])*(coord1[1]-coord2[1]));

	


	if(d<maxd){
		//console.log('same gps: ',d);
		return true
	} 
	else return false
}


var max_name_diff_count = 20; //string length variation leeway for matching names nested inside each other


function checkname(v1,v2,strength,strength2){

	var t_name1 = v1.replace(/\sand\s|\s&\s/,' ');
	var t_name2 = v2.replace(/\sand\s|\s&\s/,' ');

	var n_match = fuzzy([t_name1]).get(t_name2);
	var contains = t_name1.match(new RegExp(t_name2,'i')) || t_name2.match(new RegExp(t_name1,'i'));

	if(n_match != null && n_match[0][0] == 1){
		return true;
	}



	if( (contains != null && Math.abs(t_name2.length-t_name1.length) < max_name_diff_count && n_match != null && n_match[0][0] >= (strength2 || strength || 0.6)) || (n_match != null && n_match[0][0] >= (strength || 0.9))) return true;
	return false;
}




module.exports.checkname = checkname;




var match = {};
function sameArtists(art1,art2){
	var count = 0;

	_.each(art1,function(art){
		_.each(art2,function(artt){
			if(artt == art) return;
			var m = fuzzy([art.name]).match(artt.name);
			if(m != null && m[0][0] > 0.9) count++
			else count--
		});
	});

	return count;
};


match.event = function(ev1,ev2){
	//console.log(ev1,ev2)

	if(checkID(ev1,ev2)) return true;

	console.log('check events..',ev1.name,ev2.name);
	if(checkname(ev1.name,ev2.name)){
		console.log("CHECK TRUE")
		return true
	} 
	return false
};

function checkID(v1,v2){
	var match = false
	_.each(v1.platforms,function(plat1){
		if(match) return false;
		_.each(v2.platforms,function(plat2){
			if(plat2.name == plat1.name && plat2.id == plat1.id) match = true;
			if(match) return false		
		});
	});
	return match;
}

match.venue = function(v1,v2){


	

	if(v1.location == null || v2.location == null){
		console.log(v1,v2)
	}

	


	//check by ID's.
	if(checkID(v1,v2) == true){
		console.log('matched IDs'.bold.green,v1.name.inverse,v2.name)
		return true;
	}


	//is usually this case
	else if(v1.location.gps != null && v2.location.gps != null){
		
		//if venue GPS locations are similar...
		if(sameGPS(v1.location.gps,v2.location.gps)){
			//console.log("SAME GPS")
			var n_match = fuzzy([v1.name]).get(v2.name);
			//console.log("MATCH IS",n_match);
			if(n_match != null && n_match[0][0] > 0.5){
				console.log('matched GPS/Names'.bold.green,v1.name.inverse,v2.name);
				return true;
			}
			else return false
		}else{
			//console.log("CHECK NAME")
			if (checkname(v1.name,v2.name)){
				console.log('matched Names'.bold.green,v1.name.inverse,v2.name)
				return true
			} 
			else return false;
		}

	
	//small chance this will happen and and its not guaranteed to work. 
	}else{
		//console.log("CHECK NAME 2")
		if (checkname(v1.name,v2.name)){
			console.log('matched Names'.bold.green,v1.name.inverse,v2.name)
			return true
		} 
		else return false;
	}
}




match.artist = function(a1,a2){
	//ObjectID Scenario
	if(a1.constructor.name == 'ObjectID' || a2.constructor.name == 'ObjectID'){
		if(a1.equals(a2.toString())){
			return true;
		} 
		return false;	
	}

	//Checkname Scenario
	if(checkname(a1.name,a2.name)){
		
		return true;
	}
}





module.exports = match;



