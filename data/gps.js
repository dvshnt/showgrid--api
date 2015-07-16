

var Promise = require('bluebird')

var request = Promise.promisify(require('request').get);


var _ = require('lodash');
var p = require('./pFactory');

var places_api  = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json';
var geo_api  = 'https://maps.googleapis.com/maps/api/geocode/json';
var key = 'AIzaSyDxX-LXG4B1H6LRNxHNCKJErQPyeK2KW7o';


var fuzzy = require('fuzzyset.js')

//default radius used to narrow down place search.
var default_radius = 50; 


module.exports = p.sync(function(name,addr,loose){


	var address = null;
	if(addr.address != null) var address = addr.address.trim();
	
	var addr_strict = (address || '') + ' '  + (addr.city||'') + ' ' + (addr.statecode||'') + ' '+ (addr.zip||'');
	var addr_loose =  (addr.city||'') + ' ' + (addr.statecode||'') + ' '+ (addr.zip||'') + ' '+ (name||'');







	var getplace = p.sync(function(status){

		var type = 'keyword';
		var switch_ands = false;
		var tries = 0;

		name = name.replace(/\sand\s|\s&\s/,' ');

		var get = function(){
			
			url = places_api+ "?"+type+"=" + name + "&key="+key+'&location='+addr.gps[0]+','+addr.gps[1]+'&radius='+default_radius+'&sensor=false';
			//console.log(url);

			return request({url:url,json:true})
			.spread(function(res,loc,err){
				//console.log('GOT PLACE');
				
				if(loc.results == null || loc.results.length == 0){
					if(tries >=2) return this.resolve(status || loc.status);
					else {
					
						type = 'name';
						tries++;
						return get();
					}
				}

				var found = null;


				//match by address
				_.each(loc.results,function(res){
					if(res.vicinity.match(new RegExp(address,'i')) != null){
						found = res;
						return false;
					}
				})
				

				//if match by address failed, match by name
				if(found == null){
					var match_list = [];
					var match_list = _.map(loc.results,function(pl){
						return pl.name.replace(/\sand\s|\s&\s/,' ');;
					});

					var matches = fuzzy(match_list).get(name);
					tries++;

					

					_.each(matches,function(match,i){


						//matched business name
						var contains = match[1].match(new RegExp(name,'i')) || name.match(new RegExp(match[1],'i'));
						if( match[0] >= 0.75 || contains != null){
							found = loc.results[match_list.indexOf(match[1])]
							return false;
						} 
					});
				}

			
			
				if(found){
					this.resolve({
						address: found.vicinity,
						gps: [found.geometry.location.lat,found.geometry.location.lng]
					});
				}else if(tries<2){
					var loc = loc.results[0];
					addr.gps = [loc.geometry.location.lat,loc.geometry.location.lng];
					
					get();
				}else{
					console.log(loc.results[0].vicinity,address)
					console.log(matches,name)
					this.resolve('NO_MATCH');
				} 



			}.bind(this));
		}.bind(this)


		//if a bad status is passed, skip everything.
		if(_.isString(status)) this.resolve(status);
		else get();

		return this.promise;
	}.bind(this));






	var geocode = function(){
	
		return request({url:geo_api+ "?" +"address=" + addr_strict + ""+'&sensor=false',json:true})
		.spread(p.sync(function(res,loc,err){
			//console.log('GECODE FOR',name,addr,loc)
			
			if(loc.results == null || loc.results.length == 0) 
				this.resolve(loc.status);
			else{
				var loc = loc.results[0];
			//	console.log('GOT GEOCODE for ',name);
				
				addr.gps = [loc.geometry.location.lat,loc.geometry.location.lng];
				

				this.resolve({
					address: loc.formatted_address,
					gps: [loc.geometry.location.lat,loc.geometry.location.lng]
				});
			}
			

			return this.promise;
		}));
	};



	if(addr.address != null && loose == true){
		return geocode();
	}

 
	//use geo api to find approximate location and then use the gps to find the exact place location
	else if(addr.address != null){
		
		geocode().then(getplace).then(function(loc){
			this.resolve(loc)
		}.bind(this))
		return this.promise;


	//use address and gps and name to find exact location
	}else if(addr.gps != null){

		return getplace();

	//else return null because not enough info.
	}else{
		this.resolve('BAD_INFO');
		return this.promise;
	}
});