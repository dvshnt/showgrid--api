
//settings
var MergeDemandPriority = {
	'facebook':1,
	'eventful':1,
	'reverbnation':1,
	'jambase':1,
	'ticketfly':1,
	'spotify':1
};

var MergePriority = {
	'facebook':1,
	'eventful':3.5,
	'reverbnation':1,
	'jambase':1,
	'ticketfly':2,
	'spotify':5
};










var _ = require('lodash')
,Promise = require('bluebird')
,fuzzy = require('fuzzyset.js') // fuzzy matching
,p = require('../pFactory.js')
,colors = require('colors')
,match = require('./match')
,util = require('../util')
,readline = require('readline')
Promise.longStackTraces();
var rl = require('readline');



/*
CONFIRM

this method cofirms merges to double check that we are not merging bad stuff items.

- type     : venue,event,artist
- merged_v : merged object,
- old_v    : old object (this usually means the one thats stored in the database or has the most old data)
- new_v    : fresh data
- check    : do we double check that we are not doing a BAD merge? otherwise this whole function gets ignored at the beginning base case

*/
var max_char_count = 7000;
function confirm(type,merged_v,old_v,new_v,check){
	//console.log(old_1.name.bgRed,old_2.name.bgRed)
	if(check == false){
		console.log((type == 'venue' ? type.bold.cyan : type.bold.yellow),'auto-merge'.green,old_v.name.yellow,' + ',new_v.name.cyan);
		return merged_v;
	}
	var o_string = JSON.stringify(old_v,null,4);
	var n_string = JSON.stringify(new_v,null,4);
	var m_string = JSON.stringify(merged_v,null,4);

	
	
	

	console.log('\n\n\nCURRATING MERGE '.bgRed,old_v.name.green,' + ',new_v.name.cyan,'(new)',' -> ',merged_v.name.yellow)



	// console.log('\nOLD\n---------\n'.green);
	// if(o_string.length > max_char_count){
	// 	console.log('do you want to display this model? (over',max_char_count,')');
	// 	var answer = rl.question('[n | no for no] | [.* for yes]\n: ');
	// 	if(answer === 'no' || answer === 'n'){}
	// 	else console.log(o_string.green)
	// }

	// console.log('\nNEW\n---------\n'.cyan);
	// if(n_string.length > max_char_count){
	// 	console.log('do you want to display this model? (over',max_char_count,')');
	// 	var answer = rl.question('[n | no for no] | [.* for yes]\n: ');
	// 	if(answer === 'no' || answer === 'n'){}
	// 	else console.log(n_string.cyan)
	// }
	
	// console.log('\nMERGED\n---------\n'.yellow);
	// if(m_string.length > max_char_count){
	// 	console.log('do you want to display this model? (over',max_char_count,')');
	// 	var answer = rl.question('[n | no for no] | [.* for yes]\n: ');
	// 	if(answer === 'no' || answer === 'n'){}
	// 	else 	
	// 		_.each(m_string.split('\n'),function(str){
	// 			var n_matched = n_string.indexOf(str);
				
	// 			var o_matched = o_string.indexOf(str);


	// 			if(n_matched != -1 && o_matched != -1) return console.log(str.yellow);
	// 			if(n_matched != -1) return console.log(str.cyan);
	// 			if(o_matched != -1) return console.log(str.green);
				

	// 			console.log(str.yellow);
	// 		});

	// }


	function ask(){
		if(old_v.location != null){
			console.log(JSON.stringify(old_v.location, null, 4).green,'\n',JSON.stringify(new_v.location,null,4).cyan)
		}
		if( old_v.events != null ) console.log( ('old events # '+old_v.events.length).blue )
		if( new_v.events != null ) console.log( ('new events # '+new_v.events.length).green )
		if( merged_v.events != null) console.log( ('merged (old+new) events # '+ merged_v.events.length).yellow )

		console.log('do you want to merge \n',old_v.name.green,' + ',new_v.name.cyan,'(new) \n='.gray,'\n',merged_v.name.yellow);
		console.log('[n or no for NO] | [yes or y for YES]: ');
		var answer = util.getLine();
		if(answer == 'no\n' || answer == 'n\n'){
			console.log("NO".red,' will create new entry');
			return(false)
		}else if(answer == 'yes\n' || answer == 'y\n'){
			console.log("YES".green,' the new model is', merged_v.name.yellow);
			return(merged_v)
		}else{

			console.log('wrong answer, try again'.red);
			return ask();
		} 
	}

	return ask()	
};





/*

CHECKS

these get called inside merge.[venue,event,artist]

*/
var check = {};


//venue double check after merge (NOT A MATCHER)
check.venue = function(e1,e2){
	if(e1.name == e2.name) return false;
	var name_match = fuzzy([e1.name]).get(e2.name);
	if(name_match[0][0] > 0.9) return false;

	if(e1.location.address == e2.location.address && name_match[0][0] > 0.6) return false;

	if((e1.location.status == 2 && e1.location.status == 2) && (e1.location.address != e2.location.address)) return true
	return true
}

//event double check after merge (NOT A MATCHER)
check.event = function(e1,e2,check_val){
	if(match.checkID(e1.platforms,e2.platforms)) return false;

	if(e1.date.start == e2.date.start){
		console.log('MATCHED EVENTS BY DATE'.bold.yellow,e1.name,e2.name.inverse);
		return false;
	}

	return false;
}

//artist double check after merge (NOT A MATCHER)
check.artist = function(e1,e2){
	if(e1.name == e2.name) return false;
	var name_match = fuzzy([e1.name]).get(e2.name);
	if(name_match[0][0] > 0.9) return false;
	
	console.log('fuzzy match:',name_match)

	return true;
}




/*

MERGE

- e1         : old object
- e2         : new object (fresh data)
- priority   : e2 overwrites e1 ? (exported object WILL be e2, not a merged object)
- check_val  : double check if we are merging correctly?

*/
var merge = {};


//MERGE VENUE
merge.venue = function(e1,e2,priority,check_val){
	var merged,weight;


	merged = {};
	merged.platforms = [];
	//null exception
	if(e1 == null || e2 == null) return e1 || e2 || null;
	
	

	//priority overwrite or decide
	if(priority != null && priority == false){
		i2 = 9999;
		i1 = 0;
	}else{
		_.each(e1.platforms,function(plat){
			i1+= MergePriority[plat.name]
		});
		_.each(e2.platforms,function(plat){
			i2+= MergePriority[plat.name]
		});	
		weight = defaultWeight(e1,e2);
		var i1 = weight[0], i2 = weight[1];	
		if(i1 == i2) i2++;
	}

	//platforms 1
	merged.platforms = _.uniq(_.union(e1.platforms,e2.platforms),function(obj){
		return obj.name+'/'+obj.id
	});

	//description
	if(i1 >= i2 && e1.description != null) merged.description = e1.description
	else merged.description = e2.description

	
	//time 2
	merged.time = {}
	if(match.checkID(e1.platforms,e2.platforms)){
		merged.time.created = e1.time.created || e2.time.created;
	}
	
	
	//names 3
	if(e1.location.status == 2) merged.name = e1.name;
	else if(e1.location.status == 2) merged.name = e2.name;
	else if(i1 >= i2) merged.name = e1.name
	else merged.name = e2.name


	//location 4
	var loc = null;
	if(e2.location != null && e2.location.status > e1.location.status) loc = e2.location;
	else if(e1.location != null && e1.location.status > e2.location.status) loc = e1.location;
	else if(e2.location.gps == null || e1.location.gps == null){
		loc = e2.location || e1.location
	}
	else loc = e2.location
	

	merged.location = loc;

	//links 5
	merged.links = _.uniq(_.union(e1.links,e2.links),'url');

	//tags 6
	if(e1.tags == null || e2.tags == null){
		merged.tags = e1.tags || e2.tags;
	}else{
		merged.tags =_.uniq(util.null_filter(_.union(e1.tags,e2.tags)),function(tag){		
			if(_.isString(tag)) return tag.toLowerCase();
			return tag;
		})
	}


	//phone 7
	if(i1 >= i2 && e1.phone != null) merged.phone = e1.phone;
	else merged.phone = e2.phone;

	//banners 8
	if(e2.banners == null || e1.banners == null){
		merged.banners = e2.banners || e1.banners;
	}else{
		merged.banners = _.uniq(_.union(e1.banners,e2.banners),'url');
	}
	

	//age 9
	if(i1 >= i2 && e1.age != null) merged.age = e1.age;
	else merged.age = e2.age;




	//events 10
	if(!_.isArray(e2.events) || !_.isArray(e1.events)){

		merged.events = _.clone(e2.events || e1.events);
	
	}else{
		merged.events = [];
		var events = _.union(e2.events,e1.events);
		
		//console.log(events);
		var l = events.length;
		console.log('merge venue events','total:',l,'e1:',e1.events.length,'e2:',e2.events.length);
		for(var i = 0;i<l;i++){
			if(events[i] == null) continue;
			for(var j = 0;j<l;j++){
				if(j == i || events[j] == null || events[i] == null) continue;
				if(match['event'](events[i],events[j])){
					var new_e = merge['event'](events[i],events[j]);
					if(new_e != false){
						events[i] = new_e;
						events[j] = undefined;
					}
				}
			}
		}

		merged.events = util.null_filter(events);
	}

	//colors 11
	if(i1 >= i2 && e1.phone != null) merged.colors = e1.colors;
	else merged.phone = e2.colors;

	//users 12
	merged.users = _.uniq(_.union(e1.users,e2.users),'_id');	


	//demand 13
	merged.demand =  mergeDemand(e1,e2) || 0;


	//double check to make sure everything is okay before we merge!	
	if(check_val !== false) check_val = check.venue(e1,e2);
	return confirm('venue',merged,e1,e2,check_val);
};


//MERGE EVENT
merge.event = function(e1,e2,priority,check_val){
	var merged = {},weight;
	//null exception
	if(e1 == null || e2 == null) return e1 || e2 || null;



	if(priority != null && priority == false){
		i2 = 9999;
		i1 = 0;
	}else{
		_.each(e1.platforms,function(plat){
			i1+= MergePriority[plat.name]
		});
		_.each(e2.platforms,function(plat){
			i2+= MergePriority[plat.name]
		});	
		weight = defaultWeight(e1,e2);
		var i1 = weight[0], i2 = weight[1];	
		if(i1 == i2) i2++;
	}



	//id 0
	
	merged._id = e1._id || e2._id;
	


	//platforms 1
	merged.platforms = _.uniq(_.union(e1.platforms,e2.platforms),function(obj){
		return obj.name+'/'+obj.id
	});

	//name 2


	
	//if names are completly different, combine them with a ,
	if(!match.checkname(e1,e2,0.75,0.75)){
	
		
		if(e1.name.indexOf(e2.name) != -1){
			merged.name = e2.name.replace(e1.name, "");
		}else if(e2.name.indexOf(e1.name) != -1){
			merged.name = e1.name.replace(e2.name, "");
		}else{
			merged.name = e1.name +' , '+e2.name;
		}

	}
	//else if e2 is part of e1 or e1 is more important
	else if(i1 >= i2 || e1.name.indexOf(e2.name) != -1) merged.name = e1.name;
	else merged.name = e2.name;	
	



	//date 3
	merged.date = {}
	if(e1.date.start < e2.date.start) merged.date.start = e1.date.start;
	else merged.date.start = e2.date.start;
	


	//timestamp 4
	merged.time = {}
	if(match.checkID(e1.platforms,e2.platforms)){
		if(e1.time.created < e2.time.created){
			merged.time.created = e1.time.created;
		}else{
			merged.time.created = e2.time.created;
		}
		
	}

	//tickets 5
	merged.tickets = _.uniq(_.union(e1.tickets,e2.tickets),'url');


	//private 6
	if(i1 >= i2 && e1.private != null) merged.private = e1.private
	else merged.private = e2.private

	//featured 7
	if(i1 >= i2 && e1.private != null) merged.private = e1.private
	else merged.private = e2.private

	//age 8
	if(i1 >= i2 && e1.private != null) merged.private = e1.private
	else merged.private = e2.private

	//description 9
	if(i1 >= i2 && e1.description != null) merged.description = e1.description
	else merged.description = e2.description

	//banners 10
	if(e2.banners == null || e1.banners == null){
		merged.banners = e2.banners || e1.banners;
	}else{
		merged.banners = _.uniq(_.union(e1.banners,e2.banners),'url');
	}

	//location 11
	if(i1 >= i2 && e1.location != null) merged.location = e1.location
	else merged.location = e2.location


	merged.artists = {}
	//artists 12
	var headliners = _.union(e2.artists.headliners,e1.artists.headliners);
	var l = headliners.length;

	for(var i = 0;i<l;i++){
		if(headliners[i] == null) continue;
		for(var j = 0;j<l;j++){
			if(j == i || headliners[j] == null || headliners[i] == null) continue;
			if(match['artist'](headliners[i],headliners[j])){
				var n_a =  merge.artist(headliners[i],headliners[j])
				if(n_a != false){
					headliners[j] = null;
					headliners[i] = n_a
				}
			}
		}
	}

	merged.artists.headliners = util.null_filter(headliners);



	var openers = _.union(e2.artists.openers,e1.artists.openers);
	//console.log(openers);
	var l = openers.length;

	for(var i = 0;i<l;i++){
		if(openers[i] == null) continue;
		for(var j = 0;j<l;j++){
			if(j == i || openers[j] == null || openers[i] == null) continue;
			if(match['artist'](openers[i],openers[j])){
				var n_a =  merge.artist(openers[i],openers[j])
				if(n_a != false){
					openers[j] = null;
					openers[i] = n_a
				}
			}
		}
	}
	
	merged.artists.openers = util.null_filter(openers);


	//users 13
	merged.users = _.uniq(_.union(e1.users,e2.users),'_id');	


	//demand 14
	merged.demand =  mergeDemand(e1,e2) || 0;


	//tags 15
	if(e1.tags == null || e2.tags == null){
		merged.tags = e1.tags || e2.tags;
	}else{
		merged.tags =_.uniq(util.null_filter(_.union(e1.tags,e2.tags)),function(tag){		
			if(_.isString(tag)) return tag.toLowerCase();
			return tag;
		})
	}


	try{
		if(check_val !== false) check_val = check.event(e1,e2);
		return confirm('event',merged,e1,e2,check_val);
	}catch(e){
		console.log('BAD EVENT'.bgRed)
		console.log(e1.name)
		console.log(e2.name);
		console.log(e);
	}
	
}


//MERGE ARTIST
merge.artist = function(e1,e2,priority,check_val){
	if(e1 == null || e2 == null) return e1 || e2 || null;
	
	//either are object ids
	if(e1.constructor.name == 'ObjectID' || e2.constructor.name == 'ObjectID'){
		return e1;
	}

	//either null case
	if(e1 == null || e2 == null) return e1 || e2 || null;
	

	
	var i1 = 0,i2 = 0;
	var merged = {};

	

	if(priority != null && priority == false){
		i2 = 9999;
		i1 = 0;
	}else{
		_.each(e1.platforms,function(plat){
			i1+= MergePriority[plat.name]
		});
		_.each(e2.platforms,function(plat){
			i2+= MergePriority[plat.name]
		});	
		weight = defaultWeight(e1,e2);
		var i1 = weight[0], i2 = weight[1];	
		if(i1 == i2) i2++;
	}


	//platforms 1
	merged.platforms = _.uniq(_.union(e1.platforms,e2.platforms),function(obj){
		return obj.name+'/'+obj.id
	});


	//name 2
	if(i1 >= i2 || e1.status == 1) merged.name = e1.name
	else merged.name = e2.name 

	//private 3
	if(i1 >= i2 && e1.private != null) merged.private = e1.private
	else merged.private = e2.private
	

	//demand 4
	merged.demand =  mergeDemand(e1,e2) || 0;
	
	//links 5
	merged.links = _.uniq(_.union(e1.links,e2.links),'url');

	//banners 6
	merged.banners = _.uniq(_.union(e1.banners,e2.banners),'url');

	//members 7
	merged.members = [];

	_.each(_.union(e1.members,e2.members),function(membr){
		var duplicate = null;
		_.each(merged.members,function(new_membr,i){
			if(match['artist'](membr,new_membr)){
				duplicate = i;
				return false;	
			}
		})
		if(duplicate != null) merged.members[duplicate] = merge['artist'](merged.members[duplicate],membr);
		else merged.members.push(membr);
	});



	//isGroup 8
	merged.isGroup = merged.members.length > 0 ? true : false;


	//samples 9
	merged.samples = _.uniq(_.union(e1.samples,e2.samples));

	//description 10
	if(i1 >= i2 && e1.created != null) merged.description = e1.description
	else merged.description = e2.description


	//tags
	if(e1.tags == null || e2.tags == null){
		merged.tags = e1.tags || e2.tags;
	}else{
		merged.tags =_.uniq(util.null_filter(_.union(e1.tags,e2.tags)),function(tag){		
			if(_.isString(tag)) return tag.toLowerCase();
			return tag;
		})
	}


	if(check_val !== false) check_val = check.artist(e1,e2);
	return confirm('artist',merged,e1,e2,check_val);
}
















/*
not very smart demand merging

demand wieght is equal to merge priority of each platform

This will probably need more work!

*/
function mergeDemand(doc1,doc2){


	var i1 = _.reduce(doc1.platforms,function(total,plat){return total+MergeDemandPriority[plat.name]});
	var i2 = _.reduce(doc2.platforms,function(total,plat){return total+MergeDemandPriority[plat.name]});
	
	if(doc1.demand == null || doc1.demand == 0) return doc2.demand;
	else if(doc2.demand == null || doc2.demand == 0) return doc1.demand;
	//documents get weighted by platfoms
	else return (doc1.demand*i1 + doc2.demand*i2)/(i1+i2);
}












function defaultWeight(e1,e2){

	var i1 = _.reduce(e1.platforms,function(total,plat){return total+MergePriority[plat.name]});
	var i2 = _.reduce(e2.platforms,function(total,plat){return total+MergePriority[plat.name]})
	
	return [i1,i2]
}














function artistWeight(e1,e2){
	var w = defaultWeight(e1,e2)
	i1 = w[0]
	i2 = w[1]



	if(e1.created != null && e2.created != null){
		if(e1.created < e2.created){
			i1*= 1.5; //TEST
		}
	}
	
	

	return [i1,i2]
}





module.exports = merge;


