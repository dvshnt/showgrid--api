/*
	tested:
		reverbnation.
		ticketfly.
		eventful.
	
	not tested:
		facebook
		jambase


*/



var fillers = require('../data/fillers');
var cfg = require('../data/config.json');

fillers.updateActive({

	//use syncData function from sync
	use_sync: true,

	sync: false, //min gps status (read description in sync/sync.js)
	
	min_gps_status: 2, //min gps status needed to sync document (read description in sync/sync.js)
	
	overwrite: false, //do not overwrite

	//which endpoints to update?
	endpoints: [
		'reverbnation',
		'ticketfly',
		'eventful',
		'facebook',
		'jambase'
	],

	//endpoint keys
	keys: {
		facebook: cfg.apis.facebook.token,
		eventful: cfg.apis.eventful.keys[0],
		jambase: cfg.apis.jambase.keys[0],
		reverbnation: null,
		ticketfly: null
	}

	
}).finally(function(){
	console.log("DONE w/ update-active".bgCyan)
	process.exit();
});