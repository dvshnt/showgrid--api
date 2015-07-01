
var debug = require('debug')('api');
var api_cfg = require('./data/data_config').apis;
//var data = require('./data/data.js');

var update = require('./data/update.js');

var addressGPS = require('address-gps');

addressGPS.getGPS('320 braveheart drive franklin TN',function(location){
	console.log(location);
})
// update({
// 	params: {
// 		zip: '37264',
// 		country: 'US',
// 		radius: 50,
// 		query_size:2,
// 		sort: 'popularity'
// 	},
// 	platforms: {
// 		// 'eventful': {
// 		// 	params: {
// 		// 		key: api_cfg.eventful.keys[0],

// 		// 	},
// 		// 	endpoints : ['venue'],
// 		// },
// 		'reverbnation': {
// 			endpoints : ['venue'],	
// 		},
	
// 		// 'jambase' : {
// 		// 	endpoints : ['venue','event','artist'],
// 		// 	key : api_cfg.jambase.keys[0],
// 		// 	params: {
// 		// 		zip: '37064'
// 		// 	},
// 		// }
// 	},
// 	save: true

// }).then(function(data){
// 	//console.log(data.length);
// 	//console.log('done with update');
// });