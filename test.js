
var debug = require('debug')('api');
var api_cfg = require('./data/data_config').apis;
//var data = require('./data/data.js');

var update = require('./data/update.js');

update({
	platforms: {
		'eventful': {
			endpoints : ['event'],
			params: {
				key: api_cfg.eventful.keys[0],
				zip: '37064'
			},
		},
		// 'jambase' : {
		// 	endpoints : ['venue','event','artist'],
		// 	key : api_cfg.jambase.keys[0],
		// 	params: {
		// 		zip: '37064'
		// 	},
		// }
	},
	save: true

}).then(function(data){
	console.log('done with update');
});