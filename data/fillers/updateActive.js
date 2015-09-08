//update and sync all venues whose active field is set to true


var scrapers = require('../scrapers.js');
var Promise = require('bluebird');
var _ = require('lodash');
var p = require('../pFactory.js')
var cfg = require('../cfg.json');


var updateActive = function(doc,opt){

	if(doc.active == false) return p.pipe(null);
	//console.log('test')
	var blacklist = opt.blacklist || [];
	
	_.each(scrapers,function(platform,key){
		if(_.has(blacklist,key)) return;
		scrapers[key].get.venue({
			key : opt.keys[key]
		})
		.then(function(doc){
			var pipe = scrapers[key].filters.venue(doc);
			if(pipe.then != null){
				return pipe
			}else{
				return p.pipe(pipe);
			}
		})
		.then(function(parsed_doc){
			merge[type](doc,parsed_doc,1,1);
			return doc.saveAsync();
		})
		.then(function(){
			console.log(arguments)
		})
	})

	return p.pipe(null)
}


module.exports = updateActive;