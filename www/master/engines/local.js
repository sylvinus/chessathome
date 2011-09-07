var ENGINE_PATH = '../../../build/engine.js'
  , Worker = require('webworker').Worker
  , path = require('path');

ENGINE_PATH = path.resolve(__dirname, ENGINE_PATH);

var LATEST_DATA = false
  , VERBOSE = true;

var makeEngine = function(onMessage) {
  var w = new Worker(ENGINE_PATH);

  w.onmessage = function(e) {
    LATEST_DATA = e.data;
    if (VERBOSE) console.warn('  => ', JSON.stringify(e.data));
    if (onMessage) onMessage(e.data);
  };

  w.error = function (e) {
    console.error('Error from worker', e);
  };

  w.post = function(e) {
    if (VERBOSE) console.warn('  <= ',JSON.stringify(e));
    w.postMessage(e);
  };
  
  w.search = function(fen,timeout) {
    w.post({type:"position",data:fen});
    w.post({type:"search",data:timeout});
  }

  return w;
};

exports.start = function() {};
exports.stop = function() {};
exports.makeEngine = makeEngine;
exports.LATEST_DATA = LATEST_DATA;
exports.VERBOSE = VERBOSE;
exports.clients = {"local":"haha"};
exports.clients_idle = ["local"];