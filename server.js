/**
 * Module dependencies.
 */

//this is only for joyent.

var express = require('express')
  , app = module.exports = express.createServer();

app.get("/",function(req,res) {
  res.redirect("http://chessathome.org/");
});

//TODO stop ?
app.listen(process.env.PORT || 3001);

var ENGINE_PATH = './build/engine.js'
  , socketio = require('socket.io-client')
  , path = require('path')
  , Worker = require('webworker').Worker
  , startWorker = require("./worker/worker.js").startWorker;

//TODO CLI switches
var CLI_PROCESSES = 4;

var VERBOSE = false;

if (require.main === module) {
  for (var i=0;i<CLI_PROCESSES;i++) {
    startWorker({host: process.ARGV[2] || 'chessathome.org', port: process.ARGV[3] || 80}, 'joyent-' + i,path.resolve(__dirname, ENGINE_PATH), socketio, Worker, VERBOSE);
  }
}
