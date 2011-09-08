/**
 * Module dependencies.
 */
 
//browserify needs this
process.chdir(__dirname);

var express = require('express')
  , app = module.exports = express.createServer()
  , _ = require("underscore")._;

// Configuration
app.configure(function(){
  app.set('views', __dirname + '/www/views');
  app.set('view engine', 'ejs');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.compiler({ src: __dirname + '/www/public', enable: ['less'] }));
  app.use(app.router);
  app.use(express.static(__dirname + '/www/public'));
});

var config = require('./www/master/config').config;

//doesn't work
app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

/*
if (ENGINE == 'distributed-mongo') {
  //Start at least one worker
  setTimeout(function() {
    require('./worker/client.js').start({port: 8000}, 'test-embedded');
  },1000);
}*/

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// API for the board page 
var api = require('./www/master/api');

api.startWithEngine(config.AI_ENGINE).listen(app).listen({host:'0.0.0.0',port:parseInt(config.PORT_GRID,10)});

app.get('/stats/simple',function(req,res) {
  res.contentType('application/json');
  res.send(JSON.stringify({
    "numWorkers":_.size(api.clients),
    "numIdleWorkers":api.clients_idle.length
  }));
});



// Routes
app.get('/', function(req, res){
  res.render('index', {
    title: 'Chess@home',
    numWorkers:_.size(api.clients)+2
  });
});

app.get('/iframe', function(req, res){
  res.render('iframe', { layout: false });
});

app.get('/engine.js', function(req, res) {
  require('fs').readFile('build/engine.js', function (err, data) {
    if (err) throw err;
    res.charset = 'UTF-8';
    res.header('Content-Type', 'text/javascript');
    res.send(data);
  });
});

app.get('/local', function(req, res){
  res.render('index', {
    title: 'Chess@home'
  , layout: 'layout.local.ejs'
  });
});

app.get('/api/', function(req, res){
  res.render('index', {
    title: 'Chess@home - API'
  });
});

// DNode / Browserify


app.use(require('browserify')(
  { require : 'dnode' }
));


app.listen(parseInt(config.PORT,10),function() {
  
  //http://blog.nodeknockout.com/post/9300619913/countdown-to-ko-14-deploying-your-node-js-app-to#deploy-script
  console.log('Express server listening on port %d in %s mode', app.address().port, app.settings.env);
  
});




