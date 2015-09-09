var fillers = require('../data/fillers');
var cfg = require('../data/config.json');

fillers.updateActive({
	sync: false,
	blacklist: null,
	keys: {
		facebook: cfg.apis.facebook.token,
		eventful: cfg.apis.eventful.keys[0],
		jambase: cfg.apis.jambase.keys[0],
		reverbnation: null,
		ticketfly: null
	}
});
