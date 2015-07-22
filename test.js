
var api_cfg = require('./data/config').apis;
//var data = require('./data/data.js');

var update = require('./data/update.js');
//var fb = require('./data/scrapers/facebook');
var Promise = require('bluebird');

var fb_key = null;

/*fb.getKey().then(function(fb_key){
	return */update({
		params: {
			zip: '37064',
			country: 'US',
			radius: 50,
			query_size:1,
			sort: 'popularity'
		},
		platforms: {
			// 'eventful': {
			// 	params: {
			// 		key: api_cfg.eventful.keys[0],
			// 	},
			// 	endpoints : ['venue'],
			// },
			'ticketfly': {
				endpoints: ['event'],
			},
			// 'facebook': {
			// 	endpoints: ['venue'],
			// 	params: {
			// 		key: fb_key
			// 	}
			// }
			// 'reverbnation': {
			// 	endpoints : ['venue'],
			// },
			// 'jambase' : {
			// 	endpoints : ['venue','event'],
			// 	params: {
			// 		key : api_cfg.jambase.keys[1],
			// 	},
			// }
		},
		save: true
	})
/*}).then(function(data){

});
*/