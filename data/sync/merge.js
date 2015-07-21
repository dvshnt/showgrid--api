var _ = require('lodash');
var Promise = require('bluebird');
var fuzzy = require('fuzzyset.js'); //fuzzy matching for finding models that are similar.
var p = require('../pFactory.js'); //promise factory shortucts.
var colors = require('colors');



/*

SMART MERGING

*/



var MergePriority = {'facebook':2.5,'eventful':1.5,'reverbnation':1,'jambase':1,'ticketfly':999};





/*
Merge Venue:
 	platforms ->
 	name ->
	location ->
	links ->
	tags ->
	phone ->
	banners ->
	age ->
	events ->
*/

var merge = {};

merge.venue = function(e1,e2,priority){//priority boolean defaults to true
	if(e1 == null || e2 == null) return e1 || e2 || null;
	

	var merged = {platforms:[],events:[]};

	//prioritize based on how many external links
	var weight = defaultWeight(e1,e2);
	var i1 = weight[0], i2 = weight[1];

	//prioritize based on creation date
	

	if(priority != null && priority == false) i2 = 1337;

	
	//priority dicision making.
	_.each(e1.platforms,function(plat){
		i1+= MergePriority[plat.name]
	});
	_.each(e2.platforms,function(plat){
		i2+= MergePriority[plat.name]
	});

	
	//platforms ->
	merged.platforms = _.uniq(_.union(e1.platforms,e2.platforms),'name','id');


	//names ->
	if(i1 >= i2) merged.name = e1.name
	else merged.name = e2.name


	//location ->
	var loc = null;
	if(e2.location.confirmed && e1.location.confirmed){
		if(i2 >= i1) loc = e2.location;
		else loc = e1.location;
	}
	else if(e2.location && e2.location.confirmed) loc = e2.location;
	else if(e1.location && e1.location.confirmed) loc = e1.location;
	else if( i2 >= i1){
		loc = e2.location
	}else{
		loc = e1.location
	}

	merged.location = loc;

	//links ->
	merged.links = _.uniq(e1.links,e2.links);

	//->tags
	if(e1.tags == null || e2.tags == null){
		merged.tags = e1.tags || e2.tags;
	}else{
		merged.tags = _.uniq(e1.tags,e2.tags,function(tag){
			if(_.isNumber(tag)) tag = tag.toString();
			return tag.toLowerCase();
		})		
	}


	//phone ->
	if(i1 >= i2 && e1.phone != null) merged.phone = e1.phone;
	else merged.phone = e2.phone;

	//banners ->
	if(e2.banners == null || e1.banners == null){
		merged.banners = e2.banners || e1.banners;
	}else{
		merged.banners = _.uniq(_.union(e1.banners,e2.banners));
	}
	

	//age ->
	if(i1 >= i2 && e1.age != null) merged.age = e1.age;
	else merged.age = e2.age;

	//events ->
	if(e2.events == null || e1.events == null){
		merged.events = e2.events || e1.events;
	}else{
		_.each(_.union(e2.events,e1.events),function(event){
			var good = true,
				matched = 0;
			_.each(merged.events,function(new_event,i){
				if(_.match['event'](new_event,event)){
					good = false;
					matched = i;
					return false;
				}
			});
			if(!good) merged.events[matched] = merge['event'](merged.events[matched],event,null,i1,i2);
			else merged.events.push(event);
		});	
	}


	return merged
};







/*
MERGE EVENTS: 


	platforms:-> 
	name: -> 
	date: -> 
	tickets: [{
		price: Number,
		soldout: Boolean,
		url: String,
		broker: String,
		sale: {
			start: Date,
			end: Date,
		},
	}],
	private: ->
	featured: ->
	age: ->
	description: ->
	banners: ->
	location: ->

	artists: {
		headliners:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
		openers:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}]
	},

*/

//search for event duplicates in venue event list and merge them if neccesary.
merge.event = function(e1,e2,priority,count1,count2){
	if(e1 == null || e2 == null) return e1 || e2 || null;
	

	var weight = defaultWeight(e1,e2);
	var i1 = weight[0], i2 = weight[1];
	
	var merged = {artists:{headliners:[],openers:[]}};
		
	if(priority != null && priority == false) i2 = 1337;


	//platforms ->
	merged.platforms = _.uniq(_.union(e1.platforms,e2.platforms),'name','id');

	//name -> (required)
	if(i1 >= i2) merged.name = e1.name
	else merged.name = e2.name

	//date -> (required)
	merged.date = {}
	if(i1 >= i2) merged.date.start = e1.date.start
	else merged.date.start = e2.date.start
	if(i1 >= i2) merged.date.end = e1.date.end
	else merged.date = e2.date.end

	//tickets ->
	merged.tickets = _.uniq(_.union(e1.tickets,e2.tickets),'url');

	//private ->
	if(i1 >= i2 && e1.private != null) merged.private = e1.private
	else merged.private = e2.private

	//featured ->
	if(i1 >= i2 && e1.private != null) merged.private = e1.private
	else merged.private = e2.private

	//age ->
	if(i1 >= i2 && e1.private != null) merged.private = e1.private
	else merged.private = e2.private

	//description ->
	if(i1 >= i2 && e1.description != null) merged.description = e1.description
	else merged.description = e2.pdescription

	//banners ->
	merged.banners = _.uniq(_.union(e1.banners,e2.banners));

	//location ->
	if(i1 >= i2 && e1.location != null) merged.location = e1.location
	else merged.location = e2.location

	//artists ->
		//headliners
		_.each(_.union(e2.artists.headliners,e1.artists.headliners),function(artist){

			var good = true, matched = 0;
			_.each(merged.artists.headliners,function(new_artist,i){
				if(_.match['artist'](new_artist,artist)){
					good = false;
					matched = i;
					return false;
				}
			});
			if(!good) merged.artists.headliners[matched] = merge['artist'](merged.artists.headliners[matched],artist);
			else merged.artists.headliners.push(artist);
		});

		//openers
		_.each(_.union(e2.artists.openers,e1.artists.openers),function(artist){
			var good = true, matched = 0;
			_.each(merged.artists.openers,function(new_artist,i){
				if(_.match['artist'](new_artist,artist)){
					good = false;
					matched = i;
					return false;
				}
			});
			if(!good) merged.artists.openers[matched] = merge['artist'](merged.artists.openers[matched],artist);
			else merged.artists.openers.push(artist);
		});
}





//SMART DEMAND MERGING BASED ON PLATFORM WEIGHT.
function mergeDemand(doc1,doc2){
	if(doc1 == null || ddoc2 == null) return doc1 || doc2 || null;
	
	var weight =  deafaultWeight(doc1,doc2);
	var i1 = weight[0],i2 = weight[1];
	

	//documents get weighted by platfoms
	return (doc1.demand*i1 + doc2.demand*i2)/(i1+i2);
}


function defaultWeight(e1,e2){

	var i1 = _.reduce(e1.platforms,function(total,plat){return total+MergePriority[plat.name]});
	var i2 = _.reduce(e2.platforms,function(total,plat){return total+MergePriority[plat.name]})
	
	return [i1,i2]
}

/*
merge Artists
platforms ->
name    ->
demand  ->
created ->
links   ->
banners ->
members ->
isGroup ->
*/




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



merge.artist = function(e1,e2,priority){
	if(e1 == null || e2 == null) return e1 || e2 || null;
	
	if(_.isString(e1) && _.isString(e2)){
		return e1;
	}
	
	var i1 = 0,i2 = 0;
	var merged = {};
	if(priority != null && priority == false) i2 = 1337;

	var weight = artistWeight(e1,e2);
	var i1 = weight[0], i2 = weight[1];



	//platforms ->
	merged.platforms = _.uniq(_.union(e1.platforms,e2.platforms),'name','id');

	if(i1 >= i2 && e1.name != null) merged.name = e1.name
	else merged.name = e2.name 

	//private ->
	if(i1 >= i2 && e1.private != null) merged.private = e1.private
	else merged.private = e2.private
	

	//demand ->
	merged.demand =  mergeDemand(e1.demand,e2.demand);


	//created->
	if(i1 >= i2 && e1.created != null) merged.created = e1.created
	else merged.created = e2.created

	//links ->
	merged.links = _.uniq(_.union(e1.links,e2.links));

	//banners ->
	merged.banners = _.uniq(_.union(e1.banners,e2.banners));

	//members ->
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

	//isGroup ->
	merged.isGroup = merged.members.length > 0 ? true : false;

}




module.exports = merge;


