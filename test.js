
var debug = require('debug')('api');
var api_cfg = require('./data/data_config').apis;
//var data = require('./data/data.js');

var update = require('./data/update.js');

update({
	params: {
		zip: '37064',
		country: 'US',
		radius: 50,
		query_size:50,
		sort: 'popularity'
	},
	platforms: {
		'eventful': {
			params: {
				key: api_cfg.eventful.keys[0],
			},
			endpoints : ['event'],
		},
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

}).then(function(data){
	//console.log(data.length);
	//console.log('done with update');
});