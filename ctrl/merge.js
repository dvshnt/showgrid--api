// var from = process.argv[2];
// var to = process.argv[3];


// function merge(from,to){
	
// 	if(overwrite){
// 		to.merge(from,{
// 			virtuals: true
// 		});
// 	}else{
// 		to.merge(merge['venue'](from,to),{
// 			virtuals: true
// 		})
// 	}

// 	to.save(function(e){
// 		if(e){
// 			console.log(e);
// 			err(res,'venue','505','SAVE_FAILED');
// 		}else{
// 			return from.remove().exec(function(){
// 				return res.json(to.toJSON())
// 			})
// 		} 
// 	})
// }

// db['venue'].findById(from)
// .then(function(doc1){
// 	if(doc1 == null) 
// 		err(res,'venue',404,'FROM_NOT_FOUND')
// 	else 
// 		db['venue'].findById(to)
// 		.then(function(doc2){
// 			if(doc2 == null) err(res,'venue',404,'TO_NOT_FOUND')
// 			else return merge(doc1,doc2)
// 		}.bind(this))
// }.bind(this))
// .catch(function(e){
// 	console.log('MERGE_VENUES_ERR'.bold.bgRed,e);
// })