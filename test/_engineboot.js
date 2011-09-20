var masterApi = require("../www/master/api");
var config = require("../www/master/config").config;

var ENGINE_PATH = '../build/engine.js'
, socketio = require('socket.io-client')
, path = require('path')
, Worker = require('webworker').Worker
, startWorker = require("../worker/worker.js").startWorker;

masterApi.startWithEngine(config.AI_ENGINE,{port:3005});

if (config.AI_ENGINE=="distributed-mongo") {
  var NUMWORKERS = 2;

  for (var i=0;i<NUMWORKERS;i++) {
    startWorker({host:'localhost',port:3005}, 'testworker-' + i,path.resolve(__dirname, ENGINE_PATH), socketio, Worker, true);
  }
}