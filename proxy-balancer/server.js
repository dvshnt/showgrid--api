//proxy API balancer.
var isBalancer = process.argv[2] == '-b' ? true : (process.argv[2] == '-n' ? false : null);




var port = 5050;






if(isBalancer == null){
	console.error('please specify balancer or node with -n | -b');
	process.exit();
}


var http = require('http');
var httpProxy = require('http-proxy');
var _ = require('lodash');



//a list of nodes
var nodes = [
	'52.25.231.142',
	'52.27.123.147',
	'52.27.110.43'
];


if(nodes.length == 0) console.error('no nodes.');


//known API limits.
var limits = {
	'http://maps.googleapis.com/maps/api/geocode/json':{
		day: 2500,
		second: 10		
	}
}



nodes = _.map(nodes,function(ip,i){
	var server = {};
	server.ip = ip;
	server.apis = {};
	return server;
}.bind(this));

console.log(nodes);


function newAPI(addr,server){


	var interval = 1000/((limits[addr] != null ? limits[addr].second : 100) || 10);
	var api = {};

	api.count = 0;
	api.cooldown = 0;
	api.steward = setInterval(function(){
		if(this.cooldown > 0){
			console.log('cool off -1 '+server.ip+' '+this.cooldown);
			this.cooldown--;
		}
	}.bind(api),interval);


	console.log('ADD API:',addr,interval);
	return api;
}



function balancer(api){
	var best = null;

	_.each(nodes,function(server){
		
		if(server.apis[api] == null) server.apis[api] = newAPI(api,server);
		
		if(best == null || server.apis[api].cooldown < best.apis[api].cooldown && server.apis[api].count < best.apis[api].count){
			best = server;
		};
	});


	if(best == null){
		_.each(nodes,function(server){
			if(server.apis[api].count < best.apis[api].count){
				best = server;
			};
		});
	}


	if(limits[api] != null && best.apis[api].cooldown >= limits[api].second){
		delay = 1000/(limits[api].second/2)
	}else{
		delay = 0;
	}

	console.log('balancer chose proxy@',best.ip,'with',best.apis[api].cooldown,'cooldowns and',best.apis[api].count,' calls @ API # ',api)
	best.apis[api].cooldown+=1;
	best.apis[api].count+=1;
	return {ip:best.ip,delay:delay};
}




var url = require('url');
var querystring = require('querystring');
var proxy = httpProxy.createProxyServer({});





proxy.on('error', function (err, req, res) {
	  res.writeHead(500, {
	    'Content-Type': 'application/json'
	  });
 	console.log('failed to fetch');
  	res.end(JSON.stringify({status:'FAILED NODE'}));
});

proxy.on('proxyRes', function (proxyRes, req, res) {
  console.log('RAW Response from the target', JSON.stringify(proxyRes.headers, true, 2));
});

var server = http.createServer(function(req, res) {
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query;

	var target = query.target;
	

	if(isBalancer == true && nodes.length > 0){
		var b = balancer(target)
		console.log('get',b.ip,b.delay);
		setTimeout(function(){
			proxy.web(req, res, { target: 'http://'+b.ip+':5050?'+querystring.stringify(query),ignorePath:true});		
		},b.delay);
	}else{
		delete query.target;
		//console.log('SEND TO ',target+'?'+querystring.stringify(query));
		
		proxy.web(req, res, { target: target+'?'+querystring.stringify(query),ignorePath:true});
	}
});

console.log((isBalancer ? 'balancer' : 'node')+" listening on port 5050");
server.listen('5050');