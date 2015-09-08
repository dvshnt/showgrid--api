var p = require('./pFactory');
var Promise = require('bluebird');
var db = require('./data');
var _ = require('lodash')

var filler = function(opt){

	function find(type){
		return db[type].findAsync({}).then(function(docs){
			if(opt.sync == true) var concurrency = 1;
			else concurrency = opt.concurrency ||  5;
			//synchronous updating
			
			var count = 0;
			var total = docs.length;
			return Promise.map(docs,function(doc,i){
				return new opt.filler(doc,opt).finally(function(){
					count ++
					console.log('fill',count,'/',total)
				})
			},{concurrency: concurrency}).finally(function(results){

				console.log(type+'filler done')
			});

		})
	}

	//create a pipee
	var pipe = p.pipe(opt);

	//create a settle pipe for each end point
	if(opt.sync == true){
		_.each(opt.types,function(type){
			pipe = pipe.then(function(){
				return find(type);
			});
		});
	}else{
		pipe = Promise.map(opt.types,function(type){
			return find(type);
		});
	}

	return pipe.tap(function(){
		'DONE FILLER'.bgCyan
	});
};



var spotify = require('./fillers/spotify'); //spotify filler
var amazons3 = require('./fillers/amazons3'); //spotify filler
var updateActive = require('./fillers/updateActive'); //update filler


var fillers = {
	spotify : function(opt){
		opt.sync = opt.sync || false;
		opt.types = ['artist'];
		opt.filler = spotify;
		return filler(opt);
	},
	amazons3 : function(opt){
		opt.sync = opt.sync || false;
		opt.types = ['venue','artist'];
		opt.filler = amazons3;
		return filler(opt);
	},
	updateActive : function(opt){
		opt.types = ['venue'];
		opt.sync = opt.sync || false;
		opt.filler = updateActive;
		return filler(opt);
	}
}




module.exports = fillers;