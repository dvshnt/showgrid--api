//run match algorithm for all venues and events again.
var sync = require('../sync/sync');
var match = require('../sync/match');
var merge = require('../sync/merge');


function matcher(doc,opt){
	
	if(opt.overwrite != null){
		sync.setOverwrite(opt.overwrite);
	}




	return sync.syncVenue(doc).then(p.sync(function(n_doc){
		doc.remove(function(err){
			
		});
	}))
}





function filterVenue(doc,opt){
	if(opt.overwrite != null){
		sync.setOverwrite(opt.overwrite);
	}

	return sync.findVenueByGPS(doc).then(function(docs){
		if(docs != null){

		}
	})
}


//venue events
function filterEvents(venue,opt){
	_.each(venue.events,function(e){
		_.each(venue.events,function(e2){
			if match['event']
		});
	});
}




modeule.exports = matcher;