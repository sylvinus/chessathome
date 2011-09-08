var masterApi = require("../www/master/api");
var config = require("../www/master/config").config;

var dnode = require('dnode');
var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter;

masterApi.startWithEngine(config.AI_ENGINE).listen(3005);

if (config.AI_ENGINE=="distributed-mongo") {
  var NUMWORKERS = 5;

  var worker = require("../worker/client.js");
  for (var i=0;i<NUMWORKERS;i++) {
    worker.start({port:3005},i);
  }
}
