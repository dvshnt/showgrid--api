//update and sync all venues whose active field is set to true

/*
Use these functions in the mongo shell to either deactive all venues or active venues with specific Id's


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

	//return empty pipe if document is not active
	if(doc.active == false) return p.pipe(null); //shortcut for Promise.resolve(null)
		
	//platforms
	var endpoints = opt.endpoints || [];


	return Promise.map(doc.platforms,function(plat){
		//console.log('updating',doc.name.cyan,' platform -> ')

		//get raw document data.
		if(endpoints.indexOf(plat.name) > -1) return scrapers[plat.name].get.venue({
			key : opt.keys[plat.name],
			id : plat.id
		})


		//filter raw document data
		.then(function(doc){
			if(plat.name == 'reverbnation'){
				var pipe = scrapers[plat.name].filters.venue_body(doc,plat.id);
			}else{
				var pipe = scrapers[plat.name].filters.venue(doc);
			}
			return p.pipe(pipe);	
		})
		
	},{concurrency: 1})

}


module.exports = updateActive;




