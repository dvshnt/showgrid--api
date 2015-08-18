var fillers = require('../data/fillers');
var colors = require('colors');

fillers.spotify({
	concurrency: 2,
}).tap(function(){
	console.log('SPOTIFY FILLER DONE'.bold.cyan)
});
