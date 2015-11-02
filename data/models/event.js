var _ = require('lodash'); 
var Promise = require('bluebird'); //promise methods
var p = require('../pFactory'); //p methods
var db = p.make(require('mongoose')); //database
var Artist = require('./artist'); //artist mongoose model
var colors = require('colors'); //color console
var merge = require('../sync/merge'); //merge methods
var match = require('../sync/match'); //match methods
var util = require('../util.js'); //util methods
var colors = require('colors');
var max_banners = 20;











var eventSchema = new db.Schema({
	//identification
	platformIds:[{type:String,required:true,_id:false}],
	platforms: [{
		name: 	{type:String,required:true},
		id: 	{type:String,required:true},
		_id: false
	}],
	name: {type:String},
	date: {
		start: {type: Date, required: true},
		end: {type: Date}
	},
	time: {
		created: { type: Date, default: Date.now },
		updated: Date,
	},
	tickets: [{
		_id:false,
		price: String,
		soldout: Boolean,
		url: {type:String,required:true},
		broker: String,
		sale: {
			start: Date,
			end: Date,
		}
	}],
	private: {type: Boolean, default: false},
	featured: {type:Boolean, default: false},
	age: {type: Number,max: 99, default: 0},
	description: String,
	users: [{type:db.Schema.Types.ObjectId, ref: 'User'}],  //users going
	artists: {
		headliners:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
		openers:[{type:db.Schema.Types.ObjectId, ref: 'Artist'}]
	},
	links: [{
		domain:String,
		url:String,
		_id: false
	}],
	tags: [String],
	demand: {type:Number},
	created: Date,
	banners: [{
		local:String,
		width: Number,
		height: Number,
		url: String,
	}],
});

















var extractArtists = function(types){


	function sync(artist){
		return validateArtist(artist).then(function(a){
			if(a == null) return p.pipe(null);
			return syncArtist(a)
		})
	}

	var a_pipe = p.pipe();



	_.each(types['venue'],function(venue,v_i){
		venue.events = null_filter(venue.events);
		_.each(venue.events,function(event,e){
			if(event.artists == null) return;

			//save headliners
			if(event.artists.headliners != null && event.artists.headliners.length != 0) a_pipe = a_pipe.then(function(){
				return Promise.reduce(_.clone(event.artists.headliners),function(total,artist){
				
					return sync(artist).then(function(a){
						if(a != null) total.push(a._id)
						a = undefined;
						artist = undefined;
						return total;
					})

				},[]).then(function(total){
					types['venue'][v_i].events[e].artists.headliners = total;
					return p.pipe()
				})
			});


			//save openers
			if(event.artists.openers != null && event.artists.openers.length != 0) a_pipe = a_pipe.then(function(){
				return Promise.reduce(_.clone(event.artists.openers),function(total,artist){
					return sync(artist).then(function(a){
						if(a != null) total.push(a._id)
						a = undefined;
						artist = undefined;
						return total;
					})
				},[]).then(function(total){
					types['venue'][v_i].events[e].artists.openers = total;
					return p.pipe()
				})
			});
			
		});
	});

	return a_pipe.then(function(){
		return p.pipe(types)
	});
};





eventSchema.statics.extractArtists = function(next){
	
}




eventSchema.statics.validateEvent = function(next){

	this.name = this.name.replace(/[\|]/gi,',');

	this.time.updated = Date.now();
	
	this.platformIds = _.map(this.platforms,function(plat){
		return plat.name+'/'+plat.id;
	});

	this.links = _.map(this.links,function(link){
		if(_.isString(link)) return {url:link}
		return link
	});

	if(_.isArray(this.tickets)){
		_.each(this.tickets,function(t,i){
			if(t == null || t.url == null) this.tickets[i] = undefined;
		}.bind(this))		
	}
	next();
}





//Event Middleware
eventSchema.pre('save',function(next){
	this.extractArtists().then(next);
});

eventSchema.pre('validate',function(next){
	this.validateEvent().then(next);
})







//TODO
/*
eventSchema.methods.parseOutArtists = function(){
	
	var names = this.name.split(',');
	console.log('extract...',names.length,this.name.inverse)
	var headliners = [];
	var openers = [];
	_.each(names,function(name){
		n2 = name.split(/\/w|with/);
		if(n2.length > 1){
			for(var i = 0;i<n2.length;i++){
				if(i%2 == 0){
					var nn2 = splitByAnd(n2[i]);
					if(nn2){
						for(var j = 0;j<nn2.length;j++){
							headliners.push(nn2[i]);
						}
					}else headliners.push(n2[i]);
				}else{
					var nn2 = splitByAnd(n2[i]);
					if(nn2){
						for(var j = 0;j<nn2.length;j++){
							openers.push(nn2[i]);
						}
					}else openers.push(n2[i]);					
				}
			}
		}else{
			headliners.push(n2[0]);
		}
	});

	console.log(headliners,'||',openers);

	var new_headliners = this.artists.headliners;
	var new_openers = this.artists.openers;




	var p1 = Promise.map(headliners,function(artist_name){
		
		return syncArtist(artist_name).finally(function(a){
			if(a != null){
				console.log('EVENT NAME HEADLINER ARTISTS -> GOT SPOTIFY'.bold.green)
				if(new_headliners.indexOf(a._id) == -1){
					if(new_openers.indexOf(a._id) != -1){
						new_openers[new_openers.indexOf(a._id)] = undefined;
					}
					new_headliners.push(a._id);				
				}else if(new_openers.indexOf(a._id) != -1){
					new_openers[new_openers.indexOf(a._id)] = undefined
				}

			}
		});	
	})

	// var p2 = Promise.map(openers,function(artist_name){
	// 	return syncArtist(artist_name).then(function(a){
	// 		if(a != null){
	// 			console.log('EVENT NAME OPENER ARTISTS -> GOT SPOTIFY'.bold.green)
	// 			if(new_openers.indexOf(a._id) == -1){
	// 				if(new_headliners.indexOf(a._id) != -1){
	// 					new_headliners[new_headliners.indexOf(a._id)] = undefined;
	// 				}
	// 				new_openers.push(a._id);				
	// 			}else if(new_headliners.indexOf(a._id) != -1){
	// 				new_headliners[new_headliners.indexOf(a._id)] = undefined
	// 			}
	// 		}
	// 	});
	// })

	return p1;

	// return Promise.settle([p1,p2]).then(function(){
	// 	this.artists.headliners = new_headliners;
	// 	this.artists.openers = new_openers;


	// 	console.log('EVENT NAME EXTRACTION DONE'.bold.cyan)
	// 	console.log(this.name.cyan);
	// 	console.log(this.artists);
	// }.bind(this));
}
*/













eventSchema.path('platforms').validate(function(value){
  return value.length;
},"'platforms' cannot be an empty array");


eventSchema.path('platformIds').validate(function(value){
  return value.length;x
},"'platforms' cannot be an empty array");