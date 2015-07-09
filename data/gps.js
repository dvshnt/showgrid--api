var request = require('request');
var _ = require('lodash');

var host = 'http://52.25.203.238:4040'
var api  = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?&key=AIzaSyBci_u3i7KQ2Oezc7B8rDMhcBN4av8gFWs&radius=2'



module.exports = {
  // Call done() with an object containing latitude, longitude, and prettyAddress 
  // properties corresponding to the GPS coordinates and human readable form of address
  getGPS: function(addrObj,gps,radius, done){

    if(addrObj == null){

    }

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
          // zip: (function(){
          //   var addr = null
          //   _.each(loc['address_components'],function(prop){
          //      if(prop['types'].indexOf('postal_code') > 0){
          //         addr = prop['long_name'];
          //         return false;
          //      };
          //   });
          //   return addr;
          // })()
        });
      }else{
        done(result.status)
      }
    
    });
  }

};