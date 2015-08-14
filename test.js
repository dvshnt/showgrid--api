
/*
NOTICE

ticketfly: 
	get venues by country : radius = -1
	get venues by state : radius = 0
	get venues by zipcode city : radius > 0

*/



var api_cfg = require('./data/config').apis;
var update = require('./data/update.js');
var fb = require('./data/scrapers/facebook')
var Promise = require('bluebird');

var fb_key = null;

fb.getKey().then(function(fb_key){
	return update({
		params: {
			zip: '37064',
			country: 'US',
			radius: 30,
			query_size: 5,
			sort: 'popularity'
		},
		platforms: {
			'eventful': {
				params: {
					key: api_cfg.eventful.keys[0],
				},
				endpoints : {'venue':null,'event':null},
			},
			'ticketfly': {
				endpoints: {'venue':{
					radius: 0
				},'event':null},
			},
			'facebook': {
				endpoints: {'venue':null},
				params: {
					key: fb_key
				}
			},
			'reverbnation': {
				endpoints : {'venue':{
					filter_delay: 100
				}},
			},
			'jambase' : {
				endpoints : {'venue':null,'event':null},
				params: {
					key : api_cfg.jambase.keys[0],
				},
			}
		},
		save: true
	})
}).then(function(data){
	console.log("UPDATE FINISHED");
	process.exit();
});