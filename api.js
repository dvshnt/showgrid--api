//dependecies
var morgan = require('morgan');
var express = require('express'); //express for routing
var debug = require('debug')('api');
var bodyParser = require('body-parser');
var colors = require('colors');

//initialize express app
var app = express();


app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded





//Use Passport
var passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());



//main API route.
var api = require('./routes/main');

app.get('/test',function(req,res,next){
    res.send('asd');
});


var router = express.Router();
router.get('/',function(req,res,next){
    res.send('asd');
})



app.use('/api',api);






// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});


/*

to enable dev mode (print stack trace)

type { export NODE_ENV=production }  this sets a local node variable


to debug { export DEBUG=api}

type { }

*/

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function(err, req, res, next) {
    res.status(err.status || 500).send({
        message: err.message,
        error: err
    });
});


process.on('uncaughtException', function (error) {
   console.log(error.stack);
});




/*SERVER PORT*/
app.set('port', process.env.PORT || 3000);
var server = app.listen(app.get('port'), function() {
  console.log('on port ' + server.address().port.toString().green);
});




module.exports = app;