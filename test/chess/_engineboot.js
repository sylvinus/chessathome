var masterApi = require("../../www/master/api");

var dnode = require('dnode');
var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter;

var ENGINE = process.env.AI_ENGINE || "local";

console.log('ENGINE', ENGINE)

masterApi.startWithEngine(ENGINE).listen(3005);

if (ENGINE=="distributed-mongo") {
  var NUMWORKERS = 5;

  var worker = require("../../worker/client.js");
  for (var i=0;i<NUMWORKERS;i++) {
    worker.start({port:3005},i);
  }
}
