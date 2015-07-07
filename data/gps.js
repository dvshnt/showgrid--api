var request = require('request');


var host = 'http://52.25.203.238:4040'
var api  = 'http://maps.googleapis.com/maps/api/geocode/json'

module.exports = {

  // Call done() with an object containing latitude, longitude, and prettyAddress 
  // properties corresponding to the GPS coordinates and human readable form of address
  getGPS: function(address, done){
    address = address.trim();

    var url = api+ "?" +"address=" + address + "&sensor=false";

    request(url, function(error, response, body){
     // console.log(body);

      if(error){
        console.log(error);
      }
      var result = JSON.parse(body);
     
      if(result.results && result.results.length){
        var loc = result.results[0];

        done({
          latitude: loc.geometry.location.lat,
          longitude: loc.geometry.location.lng,
          prettyAddress: loc.formatted_address
        });
      }else{
        done(result.status)
      }
    
    });
  }

};