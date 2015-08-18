var _ = require('lodash');
var Promise = require('bluebird');
var fuzzy = require('fuzzyset.js'); //fuzzy matching for finding models that are similar.
var p = require('../pFactory.js'); //promise factory shortucts.
var colors = require('colors');

/*

	MATCH FUNCTIONS.

*/

Promise.longStackTraces();

function fuzzyMatch(str1,str2){
	var fuzz = fuzzy([str1]);
	var match = fuzz.get(str2);
	if(match[0] != null){

	}
}


function sameGPS(coord1,coord2){
	var maxd = 0.0001;
	//console.log('check GPS',coord1,coord2);
	var d = Math.sqrt((coord1.lat-coord2.lat)*(coord1.lat-coord2.lat)+(coord1.lon-coord2.lon)*(coord1.lon-coord2.lon));

	


	if(d<maxd){
		//console.log('FOUND SAME GPS')
		return true
	} 
	else return false
}


var max_name_diff_count = 15; //string length variation leeway for matching names nested inside each other

var trimName = require('../util').trimName;

function checkname(v1,v2,strength,strength2,points){

	if(v1.name == null && v2.name == null) return true;
	if(v1.name == v2.name) return true;
	if(v1.name == null || v2.name == null) return false;

	if(points != null && points >= (strength || strength2 || 0.8)) return true;

	var d = Math.abs(v1.name.length-v2.name.length);
	if(d >= max_name_diff_count) return


	var n1 = v1._name || (v1._name = trimName(v1.name));
	var n2 = v2._name || (v2._name = trimName(v2.name));


	//console.log('Check Name',n1,n2,v1._name,v2._name);
	try{
		var reg1 = v1._reg || (v1._reg = new RegExp(n1,'i'));
		var reg2 = v2._reg || (v2._reg = new RegExp(n2,'i'));
	}catch(e){
		console.log('CHECK NAME REGEX ERR'.bgRed)
		console.log(n1);
		console.log(n2);
	}

	
	
	var contains = n1.match(reg2) || n2.match(reg1);

	if(contains && d < max_name_diff_count && strength < 0.9 && strength2 < 0.9) return true

	if(points != null) return false;

	var n_match = fuzzy([n1]).get(n2);


	if(n_match == null) return false;

	if(n_match[0][0] >= (strength || strength2 || 0.8)) return true;
	
	return false;
}

function contains(v1,v2){
	var n1 = v1._name || (v1._name = trimName(v1.name));
	var n2 = v2._name || (v2._name = trimName(v2.name));
	var reg1 = v1._reg || (v1._reg = new RegExp(n1,'i'));
	var reg2 = v2._reg || (v2._reg = new RegExp(n2,'i'));
	var contains = n1.match(reg2) || n2.match(reg1);
	if(contains != null) return true;
	else return false;
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
}


function checkID(v1,v2){
	for(var i = 0;i<v1.length;i++){
		//if(i == j) continue;
		for(var j = 0;j<v2.length;j++){
			if(v2[j].name == v1[i].name && v2[j].id == v1[i].id){
				return true;
			}
		}
	}
	return false;
}
module.exports.checkID = checkID;

var one_hour = 3600000;

match.event = function(ev1,ev2,fast){

	if(checkID(ev1.platforms,ev2.platforms)) return true;

	var n1 = ev1._name || (ev1._name = trimName(ev1.name));
	var n2 = ev1._name || (ev2._name = trimName(ev2.name));
	//create a temporary date object for comparing.
	var d1 = ev1._d || (ev1._d = new Date(ev1.date.start).getTime()); 
	var d2 = ev2._d || (ev2._d = new Date(ev2.date.start).getTime());
	var reg1 = ev2._reg || (ev1._reg = new RegExp(n1,'i'));
	var reg2 = ev2._reg || (ev2._reg = new RegExp(n2,'i'));
	

	if(d1 == d2){
		console.log('MATCHED EVENTS BY DATE'.bold.yellow,ev1.name,ev2.name.inverse);
		return true;
	}else if(Math.abs(d2-d1) <= one_hour){
		if(n1.match(reg2) != null || n2.match(reg1) != null) return true;
	}
	
	return false
};










match.venue = function(v1,v2,fast){

	if(v1.name == v2.name){
		return true

	}
	//check by ID's.
	else if(checkID(v1.platforms,v2.platforms) == true){
		//console.log('matched Venue IDs'.bold.green,v1.name.inverse,v2.name)
		return true;
	}else if(v1.location.gps != null && v2.location.gps != null && sameGPS(v1.location.gps,v2.location.gps)){
		if(checkname(v1,v2,0.6)){
			return true
		}
	}else if(fast){
		return false
	}else if(checkname(v1,v2,0.75)){
		return true
	}
	
	return false;
}











match.artist = function(a1,a2){
	if(a1 == null || a2 == null) return a1 || a2;
	
	//ObjectID Scenario
	if(a1.constructor.name == 'ObjectID' || a2.constructor.name == 'ObjectID'){
		if(a1.equals(a2.toString())){
			return true;
		}
		return false;	
	}
	

	//check by ID's.
	if(checkID(a1.platforms,a2.platforms) == true){
		//console.log('matched Artist IDs',a1.name,a2.name.inverse,a1.platforms,a2.platforms);
		return true;
	}


	//Checkname Scenario
	if(checkname(a1,a2,0.8)) return true;

	return false;
};




module.exports.venue = match.venue;
module.exports.event = match.event;
module.exports.artist = match.artist;
module.exports.checkname = checkname;


