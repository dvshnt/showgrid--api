
var debug = require('debug')('api');
var api_cfg = require('./data/data_config').apis;
var data = require('./data/data.js');





data.update({
	platforms: {
		'eventful': {
			endpoints : ['venue','show','artist'],
			key : api_cfg.eventful.keys[0],
			params: {
				zip: '37064'
			},
		},
		'jambase' : {
			endpoints : ['venue','show','artist'],
			key : api_cfg.jambase.keys[0],
			params: {
				zip: '37064'
			},
		}
	},
	save: true

}).then(function(data){
	console.log('done with update');
});