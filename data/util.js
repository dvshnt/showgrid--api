var _ = require('lodash')
var util = require('util');
var p = require('./pFactory');
var request = require('request')
var Promise = require('bluebird');
var mongoose = Promise.promisifyAll(require('mongoose'));
var colors = require('colors');


module.exports.null_filter = function(dataset){
	
	return _.filter(dataset, function(n) {
	  return !(!n);
	});
}


var nasty_name_parts = [
	'lounge',
	'bar',
	'grill',
	'grille',
	'room',
	'club',
	'park',
	'ballroom',
	'place',
	'the',
	'&',
	'and',
	'inn',
]


var matcher = new RegExp(_.map(nasty_name_parts,function(tag){
	return '(( |^)'+tag+'( |$))'
}).join('|'),'gi');





module.exports.trimName = function(name){
	return name.replace(matcher,' ').replace(matcher,' ').replace(/  */g,' ').replace(/^ | $/g,'').replace(/[^\w\s,'&\/\.]/ig,'');
}


module.exports.clamp = function(num,min,max){
	if(num == null) return min;
	if(_.isString(num)) num = parseInt(num);
	if(num < min){
		num = min
	}else if(num > max){
		num = max;
	}
	return num;
}


module.exports.log = function(){
	_.each(arguments,function(obj){
		console.log(util.inspect(obj, {showHidden: false, depth: null}));
	})
}


module.exports.logMem = function(){
		var r = process.memoryUsage();
		r.heapUsed = r.heapUsed/1000000
		r.heapTotal = r.heapTotal/1000000
		console.log('MEM (mb)'.bgBlue,r.heapUsed.toString().bold.red.bgBlue,'/',r.heapTotal.toString().bold.yellow)
}


//test doc
var DocSchema = new mongoose.Schema({
	pid: {type:String,unique: true},
	json: {type:String},
	created: { type: Date, default: Date.now },
});


//doc schema



var Doc = mongoose.model('Cache',DocSchema);




module.exports.Doc = Doc;

module.exports.clearCache = function(){
	console.log('REMOVE CACHE'.bgRed)
	return Doc.remove({})
}


module.exports.fillCache = function(doc){
	var pid = doc.platforms[0].name+'/'+doc.platforms[0].id
	//console.log('save cache id'.cyan,String(pid).bold.green);
	return new Promise(function(res,rej){
		Doc.findOne({
			pid: pid
		},function(err,found_doc){
			if(found_doc){
				console.log('cache found'.bold.cyan,pid)
				found_doc.json = JSON.stringify(doc)
				found_doc.save(function(e){
					if(e) return rej(e);
					else res(null);
				})
			}else{
				console.log('new cache'.bold.yellow,pid)
				var n_doc = new Doc({
					pid: pid,
					json: JSON.stringify(doc)
				})
				n_doc.save(function(e){
					if(e) return rej(e);
					else res(null);
				})
			}
		})
	})
}

module.exports.getCache = function(size){
	var pipe = Doc.find();
	if(size != null) pipe = p.pipe.limit(size);

	return pipe.then(function(docs){
		docs = _.map(docs,function(doc){
			return JSON.parse(doc.json)
		})
		return p.pipe(docs).tap(function(){
			console.log('got cache');
		})
	})
}


var fs = require('fs');
// Returns a buffer of the exact size of the input.
// When endByte is read, stop reading from stdin.
function getStdin(endByte) {
  var BUFSIZE = 256;
  var buf = new Buffer(BUFSIZE);
  var totalBuf = new Buffer(BUFSIZE);
  var totalBytesRead = 0;
  var bytesRead = 0;
  var endByteRead = false;

  var fd = process.stdin.fd;
  // Linux and Mac cannot use process.stdin.fd (which isn't set up as sync).
  var usingDevice = false;
  try {
    fd = fs.openSync('/dev/stdin', 'rs');
    usingDevice = true;
  } catch (e) {}

  for (;;) {
    try {
      bytesRead = fs.readSync(fd, buf, 0, BUFSIZE, null);

      // Copy the new bytes to totalBuf.
      var tmpBuf = new Buffer(totalBytesRead + bytesRead);
      totalBuf.copy(tmpBuf, 0, 0, totalBytesRead);
      buf.copy(tmpBuf, totalBytesRead, 0, bytesRead);
      totalBuf = tmpBuf;
      totalBytesRead += bytesRead;

      // Has the endByte been read?
      for (var i = 0; i < bytesRead; i++) {
        if (buf[i] === endByte) {
          endByteRead = true;
          break;
        }
      }
      if (endByteRead) { break; }
    } catch (e) {
      if (e.code === 'EOF') { break; }
      throw e;
    }
    if (bytesRead === 0) { break; }
  }
  if (usingDevice) { fs.closeSync(fd); }
  return totalBuf;
}
var stdin = '';
function getline() {
  if (stdin.length === 0) {
    stdin = getStdin('\n'.charCodeAt(0)).toString('utf-8');
  }
  var newline = stdin.search('\n') + 1;
  var line = stdin.slice(0, newline);
  // Flush
  stdin = stdin.slice(newline);
  return line;
}

module.exports.getLine = getline;
