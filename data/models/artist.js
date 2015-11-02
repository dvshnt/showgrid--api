var Promise = require('bluebird');
var db = Promise.promisifyAll(require('mongoose'));
var _ = require('lodash');
var scrapers = require('../scrapers.js')
var p = require('../pFactory.js')
var util = require('../util')
var colors = require('colors')


/* JSON SCHEMA */
var artistSchema = new db.Schema({

	platformIds:[{type:String}],
	platforms: [{name:String,id:String,_id:false}],
	description: String,
	isGroup: {type: Boolean,default: false}, //artist Schema can be a band/group and an artist at the same time.
	name: {type:String, required: true, index: 1},
	demand: {type:Number}, //how much demand for this artist?
	time: {
		created: { type: Date, default: Date.now },
		updated: Date,
	},
	status:{type:Number,default:0},
	links: [{
		domain:String,
		url:String,
		_id: false,
	}],
	banners: [{
		width: Number,
		height: Number,
		url: String,
		local:String,
	}],
	tags: [String],
	samples: [{type:String}],
	members: [{type:db.Schema.Types.ObjectId, ref: 'Artist'}],
}); 

artistSchema.index({
	name: 'text',
});


/* VALIDATION */

//make sure platfoms is not empty.
artistSchema.path('platforms').validate(function(value){
  return value.length;
},"'platforms' cannot be an empty array");


//make sure platform Ids have been properly assigned
artistSchema.path('platformIds').validate(function(value){
  return value.length;
},"'platformIds' cannot be an empty array");


artistSchema.pre('save',function(next){
	if(this.members.length > 1) this.isGroup = true;
	else this.isGroup = false;

	if(!this.time.created) this.time.created = Date.now(); //add timestamp
	this.time.updated = Date.now();
	next();
});


//PRE VALIDATION FILLERS
artistSchema.pre('validate',function(next){
	this.name = this.name.replace(/[\\\+\!\@\#\^\*\(\)\;\/\|]/,'')
	this.platformIds = _.map(this.platforms,function(plat){
		return plat.name+'/'+plat.id;
	});

	next();
});





/* FILLERS */
var spotify = require('../fillers/spotify');
artistSchema.statics.getSpotify = function(){
	return new spotify(this);
}


artistSchema.statics.update = function(){
	return new spotify(this);
}


artistSchema.methods.findByPlatformIds = function(artist){
	return this.findOneAsync({
		platformIds: {$in : artist.platformIds}
	}).then(function(doc){
		return p.pipe(doc);
	}.bind(this));
}



//find artists in DB by name
artistSchema.methods.findByName = function(artist){
	
	//search by name
	return this.find(
		{ $text : { $search : util.trimName(artist.name) }}, 
    	{ score : { $meta: "textScore" }}
    )
    .limit(5)
    .sort({ score: { $meta: "textScore" } })
    .execAsync()
    .then(function(artistlist){
    	if(artistlist == null) return p.pipe(null)
		var found = [];
		
		_.each(artistlist,function(a,i){
			console.log(a.name)
			if(a.score > 2.5) return p.pipe(a);
		});
		return p.pipe(null);

    }).catch(function(err){
    	console.log('find artist by name err'.bgRed,err);
		return p.pipe(null);
    });
};











//Find an artist based off of model...OR,
artistSchema.methods.Sync = function(artist){
	var self = this;

	artist = new Artist(artist);

	p.sync(function(){
		artist.validate(function(err){
			if(err) return this.reject(new Error('artist validation error'));
			else this.resolve(artist)
		}.bind(this))

		return this.promise;
	})

	.then(self.findByPlatformIds.bind(self,artist))


	.then(function(found_artist){
		if(found_artist != null) return found_artist
		else return self.findByName({name:artist.name})
	})

	.then(function(found_artists){
	

		//if found length is 0, means we could not find anything return a new artist from the data
		if(found_artists == null || found_artists.length == 0){
			console.log('NEW ARTIST'.bold.cyan,artist.name);
			var pipe = p.pipe(new Artist(artist));
		//otherwise we merge the artist
		}else{

			var pipe = null;
			_.each(found_artists,function(a,i){
				
				var new_a = merge.artist(found_artist,artist,null,1);
				if(new_a != false){
					a.set(new_a);
					pipe = p.pipe(a);
					return false;
				}
			});

			//if merging fails (NO Prompt happens for all qualifiers)...we return a null pipe. 
			if(pipe == null) return p.pipe(artist);
		}


		//SAVE
		return pipe.then(p.sync(function(doc){
			

			doc.save(function(err){
				
				if(err){
					console.log('ARTIST SAVE FAILED'.bgRed,doc.name.red,err);
					this.resolve(null)
				}else{
					console.log('ARTIST SAVED'.cyan,doc.name);
					this.resolve(doc);
				}

			}.bind(this));

			return this.promise;
		}));
		
	})
}















/* EXPORT */
var Artist = db.model('Artist',artistSchema);

Promise.promisifyAll(Artist);
Promise.promisifyAll(Artist.prototype);

module.exports = Artist;