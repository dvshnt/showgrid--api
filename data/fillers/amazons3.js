//store all banners in bucket and fetch back url and add it 
var p = require('../pFactory');
var aws = require('aws-sdk');
var cfg = require('../config.json').apis.aws;
var _ = require('lodash');
var get = p.make1(require('request'));
var Promise = require('bluebird');
var morgan = require('morgan');
//credentials
aws.config.update({
	accessKeyId: cfg.key, 
	secretAccessKey: cfg.secret
});


//
//aws.config.update({region: 'us-west-1'});

//photos
var photos = new aws.S3({params:{Bucket: cfg.bucket}});
var s3_path = 'http://'+cfg.bucket+'.s3.amazonaws.com';



function filler(doc,opt){

	var upload = p.sync(function(uri){
		photos.upload({
			Body:body,
			ACL:'public-read',
			Key:uri,
			ContentType: res.headers['content-type']
		},function(err,data){
			if (err) {
				console.log("Error uploading data: ", err);
				this.resolve(null);
			} else {
				banner.local = s3_path+'/'+uri;
				console.log("Successfully uploaded data",banner.local);
				this.resolve(uri);
			}
		}.bind(this));
		return this.promise;
	});


	var save = function(){
		if(opt.overwrite === false){
			doc.merge(merge['artist'](this.artist,this.fields,false),{
				virtuals: true
			});
		}else{
			doc.merge(this.fields,{
				virtuals: true
			});	
		}

		return this.artist.saveAsync().spread(function(doc){
			console.log('ARTIST SAVED'.green,doc.name.cyan);
			return p.pipe(doc);
		}).catch(function(err){
			if(err)
				console.log('spotify artist save failed'.bgRed,err);
		})
	}

	var pipe = p.pipe();

	if(opt.type == 'artist'){
		if(doc.banners == null || !(doc.banners.length)){
			return pipe;
		}else{
			pipe = Promise.settle(_.map(doc.banners,function(banner,i){
				if(banner.local != null){
					return p.pipe()	
				}else{
					var ext = banner.url.split(".").pop();
					return get({url:banner.url,encoding: null}).spread(p.sync(function(res,body){
						var uri = 'photos/'+banner._id+'.'+ext;
						console.log('uploading...'.green,uri.bold.yellow, 'EXT:',ext.bold.cyan);
						
						return this.promise;
					}));				
				}
			}))
		}
	}else if(opt.type == 'venue'){

		var event_pipes = _.map(doc.events,function(event,i){
			return _.map(event.banners,function(){
				
			})
			if(banner.local != null){
				return p.pipe()	
			}else{
				var ext = banner.url.split(".").pop();
				return get({url:banner.url,encoding: null}).spread(p.sync(function(res,body){
					var uri = 'photos/'+banner._id+'.'+ext;
					console.log('uploading...'.green,uri.bold.yellow, 'EXT:',ext.bold.cyan);
					
					return this.promise;
				}));				
			}
		});

		var venue_pipes = _.map(doc.banners,function(banner,i){
			if(banner.local != null){
				return p.pipe()	
			}else{
				var ext = banner.url.split(".").pop();
				return get({url:banner.url,encoding: null}).spread(p.sync(function(res,body){
					var uri = 'photos/'+banner._id+'.'+ext;
					console.log('uploading...'.green,uri.bold.yellow, 'EXT:',ext.bold.cyan);
					upload(body).then(save.bind(this));
					return this.promise;
				}));				
			}
		});

		pipe = Promise.settle();
	}
	return pipe;
}



module.exports = filler;