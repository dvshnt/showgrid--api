

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


module.exports = p.sync(function(name,addr){


	var address = null;
	if(addr.address != null) var address = addr.address.trim();
	
	var addr_strict = (address || '') + ' '  + (addr.city||'') + ' ' + (addr.statecode||'') + ' '+ (addr.zip||'');
	var addr_loose =  (addr.city||'') + ' ' + (addr.statecode||'') + ' '+ (addr.zip||'') + ' '+ (name||'');







	var getplace = p.sync(function(status){

		var type = 'keyword';
		var tries = 0;
		var get = function(){

			if(type === -1) url = places_api+ "?"+type+"=" + name + "&key="+key+'&location='+addr.gps[0]+','+addr.gps[1]+'&radius='+default_radius+'&sensor=false';
			else url = places_api+ "?"+type+"=" + name + "&key="+key+'&location='+addr.gps[0]+','+addr.gps[1]+'&radius='+default_radius+'&sensor=false';

			return request({url:url,json:true})
			.spread(function(res,loc,err){
				//console.log('GOT PLACE');
				
				if(loc.results == null || loc.results.length == 0){
					if(tries >= 2) return this.resolve(status || loc.status);
					else {
						type = 'name';
						tries++;
						return get();
					}
				}
				

				var match_list = [];
				var match_list = _.map(loc.results,function(pl){
					return pl.name;
				});

				var matches = fuzzy(match_list).get(name);
				tries++;
				if(matches != null){
					//do another contains match incase there are extra words in the title.
					var contains = matches[0][1].match(new RegExp(name,'i')) || name.match(new RegExp(matches[0][1],'i'));


					
					//console.log('MATCH for ',matches[0][1],' vs ',name,'is ',matches[0][0]);
				//	console.log('GOT GEOPLACE for ',name,matches[0][0]);
					if( matches[0][0] >= 0.8 || contains != null){

					//	console.log('MATCHED ',matches[0][1],' | ',name);
						var loc = loc.results[match_list.indexOf(matches[0][1])]
						
						this.resolve({
							address: loc.vicinity,
							gps: [loc.geometry.location.lat,loc.geometry.location.lng]
						});

					}else if(tries<2){

						var loc = loc.results[0];
						addr.gps = [loc.geometry.location.lat,loc.geometry.location.lng];
						get();

					}else this.resolve(null);
					
				}else if(tries<2){
					var loc = loc.results[0];
					addr.gps = [loc.geometry.location.lat,loc.geometry.location.lng];
					get();
				}else this.resolve(null)
			}.bind(this));
		}.bind(this)


		//if a bad status is passed, skip everything.
		if(_.isString(status)) this.resolve(status);
		else get();

		return this.promise;
	}.bind(this));






	var geocode = function(){

		return request({url:geo_api+ "?" +"address=" + addr_strict + "&key="+key+'&sensor=false',json:true})
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


 
	//use geo api to find approximate location and then use the gps to find the exact place location
	if(addr.address != null){
		
		geocode().then(getplace).then(function(loc){
			this.resolve(loc)
		}.bind(this))
		return this.promise;


	//use address and gps and name to find exact location
	}else if(addr.gps != null){

		return getplace();

	//else return null because not enough info.
	}else{
		this.resolve(null);
		return this.promise;
	}
});