var spawn = require('child_process').spawn;
var schedule = require('node-schedule');
var colors = require('colors');

var day = 86400000;


function run(){
	var start = new Date();
	console.log('spawning update |'.green,new Date());
	console.log('---------------\n\n'.green);
	

	//run the update
	var update = spawn('node', ['./update']);


	//log data
	update.stdout.on('data', function (data) {
		console.log(data.toString())
	});
	
	//log close
	update.on('close', function (code) {
		var end = new Date();
		console.log('---------------'.green);
		console.log('finished in',((end-start)/1000).toString().bold.cyan,'s','\n\n');
		delete update;
	});
};






var set = {
	hour: 18, 
	minute: 0, 
	dayOfWeek: [1,2,3,4,5,6,7]
}

//schedule to scrape and update the database every day at 6 pm
schedule.scheduleJob(set,run);
console.log('started scheduler'.green,JSON.stringify(set).bold.yellow)


run();