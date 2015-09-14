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
var colors = require('colors');



var updateActive = function(doc,opt){
	//console.log(doc.active)

	if(doc.active == false) return p.pipe(null);
	
	var blacklist = opt.blacklist || [];


	//console.log(scrapers_arr)
	
	return Promise.map(doc.platforms,function(plat){
		

		if(_.has(blacklist,plat.name)) return p.pipe(null);


		return scrapers[plat.name].get.venue({
			key : opt.keys[plat.name],
			id : plat.id
		})


		.then(function(doc){
			console.log('GOT '.green,plat.name.green);

			if(plat.name == 'reverbnation'){

				var pipe = scrapers[plat.name].filters.venue_body(doc,plat.id);
			}else{
				var pipe = scrapers[plat.name].filters.venue(doc);
			}
			
			return p.pipe(pipe);	
		})


		.then(function(raw){
			if(plat.name == 'reverbnation'){
				console.log(raw)
			}
			return sync.validateOne(raw,'venue');
		})


		.then(function(parsed_doc){
			

			//console.log(parsed_doc);
			merge.venue(doc,parsed_doc,null,true);
			return doc.saveAsync();
		})


		.spread(function(){
			console.log('SAVED'.green,arguments[0].name.cyan)
			//console.log('savedddtest')
			//console.log(arguments)
			return p.pipe(null);
		})


	},{concurrency: 1}).tap(function(data){
		//console.log('SAVED',data.)
	})
}


module.exports = updateActive;




