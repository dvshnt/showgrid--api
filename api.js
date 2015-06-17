//dependecies
var express = require('express'); //express for routing
var debug = require('debug')('api');

//initialize express app
var app = express();





//use database
// var db = require('./data/data');



//Use Passport
var passport = require('passport');
app.use(passport.initialize());
app.use(passport.session());



//Public API Allowed access for everybody.
var pub = require('./pub/publicRoute');
app.use('/pub',pub);

var usr = require('./usr/userRoute')(passport);
//Private API for user optimization.
app.use('/usr',usr);







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




// development error handler
// will print stacktrace
//if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
//}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});


module.exports = app;


app.set('port', process.env.PORT || 3000);

var server = app.listen(app.get('port'), function() {
  debug('Express server listening on port ' + server.address().port);
});




require('./test');
