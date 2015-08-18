//IMPORTANT CONFIG VARIABLES
var get_place_radius = 500; //in meters
var retry_delay = 500;
var reset_keys_delay = 2000;
var place_name_threshold = 0.8
var geonames_user = 'arxii';
var keys = [[
	'AIzaSyDxX-LXG4B1H6LRNxHNCKJErQPyeK2KW7o',
	'AIzaSyCTI6w4wHF5pFxX--06Ap8qqBm5bRNHQwA',
	'AIzaSyBci_u3i7KQ2Oezc7B8rDMhcBN4av8gFWs',
	''
],[
	'AIzaSyDxX-LXG4B1H6LRNxHNCKJErQPyeK2KW7o',
	'AIzaSyCTI6w4wHF5pFxX--06Ap8qqBm5bRNHQwA',
	'AIzaSyBci_u3i7KQ2Oezc7B8rDMhcBN4av8gFWs',
]];

/*------      APIS      -------*/
var places_api  = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
var geo_api  = 'https://maps.googleapis.com/maps/api/geocode/json';
/*-----------------------------*/
var Promise = require('bluebird')
var request = Promise.promisify(require('request').get);
var _ = require('lodash');
var p = require('./pFactory');
var rl = require('readline-sync');

var match = require('./sync/match');


var bad_keys = [];
var key_timeouts = [];
var reset_timeout = null
function reset_timeout_fn(){
	console.log(reset_timeout);
	console.log('reset bad keys.'.yellow);
	bad_keys = [];
	reset_timeout = null;
}
function getKey(pool){
	if(bad_keys[pool] == null) bad_keys[pool] = [];
	var n_keys = _.shuffle(_.filter(keys[pool],function(key){
		return bad_keys[pool].indexOf(key) == -1
	}));
	if(n_keys.length == 0) return null
	return n_keys[0]
}

function badKey(pool,key){
	if(bad_keys[pool] == null) bad_keys[pool] = [];
	if(bad_keys[pool].indexOf(key) == -1) bad_keys[pool].push(key);
	if(bad_keys[pool].length == keys[pool].length && reset_timeout == null){
		console.log('too many bad keys, try to reset.'.red);
		reset_timeout = setTimeout(reset_timeout_fn,reset_keys_delay);
	}
}





var fuzzy = require('fuzzyset.js')

//default radius used to narrow down place search.
var default_radius = 50; 


module.exports.toArray = function(obj){
	return [obj.lon,obj.lat]
}

//from mongodb
module.exports.toObj = function(arr){
	return {
		lat: arr[1],
		lon: arr[0]
	}
}





//GET GPS TIMEZONE FROM GEONAMES.ORG
module.exports.tz = p.sync(function(gps){
	var get = function(){
		request({url:'http://api.geonames.org/timezone?lat='+gps.lat+'&lng='+gps.lon+'&username='+geonames_user})
		.spread(function(res,dat){
			if(dat.match('<title>500 - Internal Server Error</title>') != null){
				console.log('500 error, retry in 500');
				p.pipe().delay(500).then(get.bind(this));
				return;
			}
			if(dat == null){
				console.log('GET GEONAMES.ORG TIMEZONE ERR:',dat);
				this.resolve(null);
			}else{
				var tz = dat.match(/<timezoneId>(.+)<\/timezoneId>/);
				if(tz != null) tz = tz[1];
				if(tz != null){
					this.resolve(tz);
				}else{
					this.resolve(null)
				}
			}
		}.bind(this))
		.catch(function(err){
			if(err.code == 'ECONNRESET'){
				console.log('gps get timezone connection reset, retry in 500');
				p.pipe().delay(500).then(get.bind(this));
			}else{
				console.log('gps get timezone connection err'.bgRed,err);
			}
		})
	}
	
	


	get.bind(this)();

	return this.promise;
})






/*
STATUS:

-1 : bad info
0 : nothing found
1 : geo found
2 : place found

*/

var trimName = require('./util').trimName;

module.exports.get = function(name,addr,zip,gps){
















	/*

	
	GET GPS FROM ADDRESS
	
	
	*/


	function geocode(zip){



		if(gps != null && gps.lat != null && gps.lon != null){
			var url = geo_api+ "?" +"location=" + gps.lat+','+gps.lon + '&sensor=false'
		}else if(zip != null){
			var url = geo_api+ "?" +"address=" + zip + '&sensor=false'
		}else{	
			var url = geo_api+ "?" +"address=" + addr_strict + '&sensor=false'
		}





		function get(){




			var q = {url:url,json:true};
			var key = getKey(0);
			if(key == null){
				console.log('BAD KEYS'.bgRed)
				return p.pipe({
					status:0
				})
			}
			if(key != '') q.url+='&key='+key;
			var tries = 0;



			return request(q)
			.spread(function(res,loc,err){
				

				//error handle
				if(err || loc == null){
					console.log('gps geocode get err',err);
					return p.pipe({
						status: 0
					})
				}


				//bad key status
				if(_.isString(loc.status) && loc.status.match(/limit|key|access|invalid|denied/i) != null){
					badKey(0,key);
					console.log('bad key 0, trying again'.red,tries)
					return p.pipe().delay(retry_delay).then(get);
				}

				

				//zero results!
				if(loc.results == null || loc.results.length == 0 || loc.results[0].geometry == null || loc.results[0].geometry.location == null){
					console.log('gps geocode get err'.red,loc.status,loc);
					return p.pipe({
						status: 0
					})				
				}


				//parse components
				var loc = loc.results[0],city = null, state = null, country = null;
				






				//SET GLOBALS
				addr.gps = [loc.geometry.location.lat,loc.geometry.location.lng];
				addr.components = {
					city: _.pluck(_.where(loc['address_components'], { 'types' : ['locality'] }),'long_name')[0],
					statecode: _.pluck(_.where(loc['address_components'], { 'types' : ['administrative_area_level_1'] }),'short_name')[0],
					state: _.pluck(_.where(loc['address_components'], { 'types' : ['administrative_area_level_1'] }),'long_name')[0],
					country: _.pluck(_.where(loc['address_components'], { 'types' : ['country'] }),'long_name')[0],
					countrycode: _.pluck(_.where(loc['address_components'], { 'types' : ['country'] }),'short_name')[0],
					zip: _.pluck(_.where(loc['address_components'], { 'types' : ['postal_code'] }),'long_name')[0],						
				}



				//return data
				return p.pipe({
					address: loc.formatted_address,
					components: addr.components,
					gps: {lon:loc.geometry.location.lng,
						lat: loc.geometry.location.lat},
					status: 1
				});
				
			});
		}


		return get();
	};


	























	/*

	
	GET BUSINESS PLACE
	
	
	*/

	function getplace(radius){
 		radius = radius || default_radius;
		var type = 'keyword';
		var switch_ands = false;
		var tries = 0;

		
	
		function get(){
			if(addr.gps== null){
				console.log('can not get place w/o gps'.red);
				return p.pipe({status:0}) 
			}
			url = places_api+ "?"+type+"=" + name + '&location='+addr.gps[0]+','+addr.gps[1]+'&radius='+radius+'&sensor=false';
			var q = {url:url,json:true}
			var key = getKey(1);
			if(key == null){
				console.log('BAD KEYS'.bgRed)
				return p.pipe({
					status:0
				})
			}
			if(key != '') q.url+='&key='+key;
		
			
			return request(q).spread(function(res,loc,err){
				var found = null;

				//error handle
				if(err || loc == null){
					console.log('gps get place err'.red,err);
					return p.pipe({
						status: 0
					})
				}




				//nasty!
				if(_.isString(loc.status) && loc.status.match(/limit|key|access|invalid|denied/i) != null){
					console.log('bad key 1, trying again'.red,'in',retry_delay,'ms',loc,url);
					badKey(1,key);
					return p.pipe().delay(retry_delay).then(get);
				}
				




				//match by address
				_.each(loc.results,function(res){
					if(match.checkname(res.name,name,place_name_threshold) == true){
						console.log('GPS Place well matched by address/name'.green,address,res.vicinity.inverse,res.name,name.inverse,' | leeway:',place_name_threshold);
						found = res;
						return false;
					}else{
						console.log('GPS Place fuzzy matched by address/name'.yellow)
						console.log('---raw location---\n',name.green,'\n',address);
						console.log('---new location---\n',res.name,'\n',res.vicinity);
						var answer = rl.question('do you want to use the GPS and Name data for '.bold.yellow+res.name.green+' ? [n | no for no] | [.* for yes] \n :');
						if(answer === 'no' || answer === 'n'){
							console.log('NO'.red, 'ok, trying further...')
						}else{
							console.log('YES'.green)
							found = res
							return false
						}
					}
				});
				




				//SUCCESS!
				if(found){
					//console.log('DONE')

					return p.pipe({
						components: addr.components,
						address: found.vicinity,
						gps: {lat:found.geometry.location.lat,lon:found.geometry.location.lng},
						status: 2,
						_tags: found.types || [],
						_name: found.name
					});
				}




				//try again ?
				else if(tries < 1){
					tries++;

					console.log(name,'gps place find by '+type+' failed, try by name in '.red,retry_delay,'ms')
					type = 'name';
					return p.pipe(default_radius).delay(retry_delay).then(get.bind(this));
				}




				//failed to find a place
				else{
					console.log('gps place no match for '.red,name);
					console.log('closest:'.red,loc.results)
					console.log(q.url.gray);
					return p.pipe({
						status: 0
					});
				}
			});
		}

		return get();	
	};





























	var addr = addr || {};
	if(zip != null) return geocode(zip);


	if(name == null){
		console.log('GPS ERR:'.bgRed,'NO_NAME')
	}
	name = trimName(name);

	var address = _.isString(addr.address) ? addr.address.trim() : '';	
	var addr_strict = (address || '') + ' '  + (addr.city||'') + ' ' + (addr.statecode||'') + ' '+ (addr.zip||'');
	
	//var addr_strict = trimName(addr_strict);







	addr.components = {};
	//DECIDE

	//use geo api to find approximate location and then use the gps to find the exact place location
	if(addr.address != null){
		

		//geocode then decide if continue to geoplace
		return geocode().then(function(dat){
			
			//geocode results 
			console.log('GPS Geocode \n---old -> ',addr_strict.yellow,'\n---new -> ',dat.address.cyan);
			
			//base case : nothing found
			if(dat.status == 0) return p.pipe(dat);

			//set radius
			if(dat.address.match(/^\d/) == null) var r = 5000
			else r = get_place_radius;


			//if status is 2 then get the place
			return getplace(r).then(function(p_loc){
				if(p_loc.status == 0){
					dat.status = 1;
					return p.pipe(dat);
				} 
				return p.pipe(p_loc);
			});
		})

		//catch errors
		.catch(function(e){
			console.log(e);
			return p.pipe({status:0})
		});

	//use address and gps and name to find exact location
	}else if(addr.gps != null){
		return getplace();



	//else return null because not enough info.
	}else{
		return p.pipe({status: -1});
	}
};







