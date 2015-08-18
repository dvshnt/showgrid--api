var sync = require('../data/sync/sync');
var db = require('../data/data');
var _ = require('lodash');

db['venue'].find(function(err,doc){
	var total = doc.length;
	var count = 0;
	_.each(doc,function(d,i){
		d.set({events: []});
		d.save(function(err){
			count++;
			console.log(err,'done',count,total)
		})
	})
});

