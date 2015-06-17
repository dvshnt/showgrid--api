

var api_cfg = require('./data/data_config').apis;
var data = require('./data/data.js');





data.update({
	endpoints: ['venue','show','artist'],
	platforms: {
		'eventful': {
			endpoints : ['venue','show','artist'],
			key : api_cfg.eventful.keys[0],
			params: {
				zip: '37064'
			}
		},
		'jambase' : {
			endpoints : ['venue','show','artist'],
			key : api_cfg.jambase.keys[0],
			params: {
				zip: '37064'
			}
		}
	},

}).then(function(data){
	console.log(data);
});