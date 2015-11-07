//this is a filler function for artist spotify data


//urls
var get_id_url = 'https://api.spotify.com/v1/search';
var get_tracks_url = 'https://api.spotify.com/v1/artists';
var get_artist_url = 'https://api.spotify.com/v1/artists';



var p = require('../pFactory');
var Promise = require('bluebird')
var request = p.make1(require('request').get);
var qs = require('querystring');
var _ = require('lodash');
var colors = require('colors');
var merge = require('../sync/merge');
var db = require('../data');
var match = require('../sync/match');




//grab the artist song links form spotify
function filler(artist,opt){
	opt = opt || {}
	this.overwrite = opt.overwrite || false;
	this.fields = null;
	this.artist = artist;
	this.country = opt.country || 'US';
	this.id = _.pluck(_.where(artist.platforms, { 'name' : 'spotify' }),'id')[0];

	if(this.id == null || !this.id.length){
		console.log('finding'.yellow,this.artist.name.inverse)
		return this.getId().then(function(){
			if(this.fields == null){
				console.log('spotify artist not found by name.')
				return p.pipe(null);
			} 
			else return this.getTracks().then(this.save.bind(this));
		}.bind(this));
	}else{
		console.log('updating'.cyan,this.artist.name)
		return this.getArtist().then(this.getTracks.bind(this)).then(this.save.bind(this));
	}
}


//save artist
var saveArtist = p.sync(function(doc){
	doc.status = 1;
	doc.save(function(err){
		if(err){
			//console.log('VENUE SAVE FAILED'.bgRed,doc.name.red,err);
			this.reject('ARTIST SAVE FAILED',err)
		}else{
			console.log('ARTIST SAVED'.cyan,doc.name);
			this.resolve(true)
		}
		
		doc = undefined;
	}.bind(this));
	return this.promise;
});



filler.prototype.save = function(){
	if(this.fields == null){
		console.log('no spotify data found for'.red,this.artist.name)
		return p.pipe(null);
	}

	if(this.overwrite === false){
		this.artist.merge(merge['artist'](this.artist,this.fields,false),{
			virtuals: true
		});
	}else{
		this.artist.merge(this.fields,{
			virtuals: true
		});	
	}
	
	return saveArtist(this.artist);
}



filler.prototype.getId = function(name){
	//console.log('get id ',this.artist.name)
	var q = {
		type: 'artist',
		q: (name || this.artist.name).split('\(')[0]
	}
	
	//console.log(get_id_url+'?'+qs.stringify(q))
	return request({
		url: get_id_url+'?'+qs.stringify(q),
		json:true
	})
	.then(function(res){
		var data = res.body
		if(data == null) return p.pipe(null);
		data = data.artists
		

		var fields = null;
		if(data == null || data.items == null || !data.items.length) return p.pipe(null);


		//match name
		_.each(data.items,function(artist){
			//console.log(artist.name,this.artist.name);
			if(match.checkname(artist,this.artist,0.7) == true){
				this.id = artist.id;
				this.fields = this.parse(artist);
				return false
			}
		}.bind(this));


		//return new fields
		return p.pipe(fields);

	}.bind(this))
	.catch(function(e){
		console.log('get spotify id error'.bgRed,e)
	});
};








filler.prototype.parse = function(artist){

	fields = {
		platforms: [{
			id: artist.id,
			name: 'spotify',
		}],
		name: artist.name,
		banners: artist.images,
		demand: artist.followers.total,
		links: _.map(artist.external_urls,function(link,key){
			return {domain: key,url: link}
		}),
		tags: artist.genres,
	}
	
	//console.log('spotify parse artist',artist.name.green,'\n');
	return fields;
}



filler.prototype.getArtist = function(){

	return request({
		url: get_artist_url+'/'+this.id,
		json: true
	}).then(function(res){
		var data = res.body
		if(data == null) return p.pipe(null);
		if(data.error != null) return p.stop(data.error.message)
		


		console.log('got artist by id')
		this.id = data.id;
		if(data.followers == null){
			console.log(data);
		}
		this.fields = this.parse(data);
		return p.pipe(this.fields);		
	}.bind(this)).catch(function(e){
		console.log('get spotify artist id error'.bgRed,e);
		if(e.stack != null){
			console.log(e.stack.split('\n')[1])
		}
		return p.pipe(null);
	})
}



filler.prototype.getTracks = function(){
	
	return request({
		url: get_tracks_url+'/'+this.id+'/top-tracks?country='+this.country,
		json: true
	}).then(function(res){
		var data = res.body
		if(data == null) return p.pipe(null)
		data = data.tracks
		if(data == null || !data.length) return p.pipe(null);

		this.fields.samples = _.map(data,function(track){
			return track.preview_url
		});

		return p.pipe(null);
	}.bind(this))
	.catch(function(e){
		console.log('get spotify id error',e);
		return p.pipe(null);
	})
};




module.exports = filler;
