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
  
  w.stop = function() {
    w.terminate();
  }
  
  w.search = function(moveOptions) {
    w.post({type:"position",data:moveOptions.fen});
    w.post({type:"search",data:moveOptions.timeout});
  }

  return w;
};

exports.start = function() {};
exports.stop = function() {};
exports.setApi = function() {};
exports.makeEngine = makeEngine;
exports.LATEST_DATA = LATEST_DATA;
exports.VERBOSE = VERBOSE;
exports.clients = function() {};
exports.clients_idle = function() {};