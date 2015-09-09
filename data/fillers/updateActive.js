//update and sync all venues whose active field is set to true
/*

deactivate all venues
db.venues.update({},{ '$set': { active: false } },{multi:true})

active 1 venue
db.venues.update({_id:ObjectId('123abc')},{ '$set': { active: false } })

*/

var scrapers = require('../scrapers.js');
var Promise = require('bluebird');
var _ = require('lodash');
var p = require('../pFactory.js');
var merge = require('../sync/merge.js');
var sync = require('../sync/sync.js')



var updateActive = function(doc,opt){
	//console.log(doc.active)

	if(doc.active == false) return p.pipe(null);
	
	var blacklist = opt.blacklist || [];


	//console.log(scrapers_arr)
	
	return Promise.map(doc.platforms,function(plat){
		

		if(_.has(blacklist,plat.name)) return p.pipe(null);

	

		


		//console.log(scrapers[key].get.venue)
		console.log(plat.name,plat.id)
		return scrapers[plat.name].get.venue({
			key : opt.keys[plat.name],
			id : plat.id
		})


		.then(function(doc){
			if(plat.name == 'reverbnation'){
				var pipe = scrapers[plat.name].filters.venue_body(doc,plat.id);
			}else{
				var pipe = scrapers[plat.name].filters.venue(doc);
			}
			
			return p.pipe(pipe);	
		})


		.then(function(raw){
			return sync.validateOne(raw,'venue');
		})


		.then(function(parsed_doc){
			

			//console.log(parsed_doc);
			merge.venue(doc,parsed_doc,null,true);
			return doc.saveAsync();
		})


		.spread(function(){
			console.log('savedddtest')
			console.log(arguments)
			return p.pipe(null);
		})
	},{concurrency: 1})
	

}


module.exports = updateActive;