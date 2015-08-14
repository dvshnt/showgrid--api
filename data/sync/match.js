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


var max_name_diff_count = 15; //string length variation leeway for matching names nested inside each other


function checkname(v1,v2,strength,strength2){
	var d = Math.abs(v1.name.length-v2.name.length);
	if(d >= max_name_diff_count) return


	var n1 = v1._name || (v1._name = v1.name.replace(/\sand\s|\s&\s/,' '));
	var n2 = v2._name || (v2._name = v2.name.replace(/\sand\s|\s&\s/,' '));

	var reg1 = v1._reg || (v1._reg = new RegExp(n1,'i'));
	var reg2 = v2._reg || (v2._reg = new RegExp(n2,'i'));
	
	var contains = n1.match(reg2) || n2.match(reg1);

	if(contains && d < max_name_diff_count) return true

	var n_match = fuzzy([n1]).get(n2);

	if(n_match == null) return false;

	if(n_match[0][0] >= (strength || strength2 || 0.8)) return true;
	

	return false;
}









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


function checkID(v1,v2){
	for(var i = 0;i<v1.length;i++){
		if(i == j) continue;
		for(var j = 0;j<v2.length;j++){
			if(v2[j].name == v1[i].name && v2[j].id == v1[i].id){
				return true;
			}
		}
	}
	return false;
}








match.event = function(ev1,ev2){
	//console.log('match event',ev1.name,'||||||',ev2.name);


	if(checkID(ev1.platforms,ev2.platforms)) return true;

	//console.log('check events..',ev1.name,ev2.name);
	if(checkname(ev1,ev2)) return true
	
	//console.log('BAD')
	return false
};






match.venue = function(v1,v2){


	//check by ID's.
	if(checkID(v1.platforms,v2.platforms) == true){
		//console.log('matched Venue IDs'.bold.green,v1.name.inverse,v2.name)
		return true;
	}

	//quick return if same platforms.
	// if(v1.platforms.length == 1 && v2.platforms.length == 1){
	// 	if(v1.platforms[0].name == v2.platforms[0].name) return false;
	// }



	//is usually this case
	if(v1.location.gps != null && v2.location.gps != null){
		
		//if venue GPS locations are similar...
		if(sameGPS(v1.location.gps,v2.location.gps)){
			//console.log("SAME GPS")
			var n_match = fuzzy([v1.name]).get(v2.name);
			//console.log("MATCH IS",n_match);
			if(n_match != null && n_match[0][0] > 0.5){
				//console.log('matched Venue GPS/Names'.bold.green,v1.name.inverse,v2.name);
				return true;
			}
		}else{
			//console.log("CHECK NAME")
			if(checkname(v1,v2)){
				//console.log('matched Venue Names'.bold.green,v1.name.inverse,v2.name)
				return true
			} 
		}
		return false;
	}

	//check name again
	if(checkname(v1,v2)){
		//console.log('matched Venue Names 2'.bold.green,v1.name.inverse,v2.name)
		return true
	} 
	
	return false;
}







match.artist = function(a1,a2){
	//ObjectID Scenario
	if(a1.constructor.name == 'ObjectID' || a2.constructor.name == 'ObjectID'){
		if(a1.equals(a2.toString())) return true;
		return false;	
	}


	//check by ID's.
	if(checkID(a1.platforms,a2.platforms) == true){
		console.log('matched Artist IDs'.bold.green,a1.name.inverse,a2.name);
		return true;
	}

	//Checkname Scenario
	if(checkname(a1,a2,1)) return true;
		
	return false;
}


module.exports = match;
module.exports.checkname = checkname;