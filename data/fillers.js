var p = require('./pFactory');
var Promise = require('bluebird');
var db = require('./data');
var _ = require('lodash')
var colors = require('colors');
var sync = require('./sync/sync.js')

var filler = function(opt){

	function find(type){

		//
		return db[type].findAsync({})

		.then(function(docs){
			if(opt.sync == true) var concurrency = 1;
			else concurrency = opt.concurrency ||  5;
			//synchronous updating
			
			var count = 0;
			var total = docs.length;

			return Promise.map(docs,function(doc,i){
				return new opt.filler(doc,opt)
				.finally(function(){
					count ++
				})
			},{concurrency: concurrency})


			//use sync/sync.js
			.then(function(parsed_docs){

				parsed_docs = _.flatten(parsed_docs);
				
				if(opt.use_sync){
					return sync.syncData({
						docs: parsed_docs,
						overwrite: opt.overwrite,
						filter_empty: false,
						bad_words: []
					})
				}else return p.pipe(parsed_docs)
				
			})
		})
	}

	//create a pipee
	var pipe = p.pipe(opt);

	//some fillers apply to several types, do we want them to run concurrently?
	return Promise.map(opt.types,function(type){
		return find(type)
	},{concurrency:opt.type_concurrency})
};



var spotify = require('./fillers/spotify'); //spotify filler
var amazons3 = require('./fillers/amazons3'); //spotify filler
var updateActive = require('./fillers/updateActive'); //update filler


//filler constructors.
var fillers = {
	spotify : function(opt){
		opt.sync = opt.sync || false;
		opt.types = ['artist'];
		opt.type_concurrency = 1 //no effect
		opt.filler = spotify;

		return filler(opt);
	},
	amazons3 : function(opt){
		opt.sync = opt.sync || false;
		opt.types = ['venue','artist'];
		opt.type_concurrency = 2 //update venues and artists asyncronously.
		opt.filler = amazons3;
		return filler(opt);
	},
	updateActive : function(opt){
		opt.types = ['venue'];
		opt.sync = opt.sync || false;
		opt.filler = updateActive;
		opt.type_concurrency = 1 //no effect
		return filler(opt);
	}
}




module.exports = fillers;