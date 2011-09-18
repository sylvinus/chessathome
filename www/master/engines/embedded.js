var ENGINE_PATH = '../../../build/engine.js';

var engine = require(ENGINE_PATH);

var LATEST_DATA = false
  , VERBOSE = true;

var makeEngine = function(onMessage) {

  var w = {};
  
  engine.setCallback(function(e) {
    LATEST_DATA = e.data;
    if (VERBOSE) console.warn('  => ', JSON.stringify(e));
    if (onMessage) onMessage(e);
  });

  w.error = function (e) {
    console.error('Error from worker', e);
  };

  w.post = function(e) {
    if (VERBOSE) console.warn('  <= ',JSON.stringify(e));
    engine.onmessage({data:e});
  };
  
  w.stop = function() {
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
exports.clients = {"local":"haha"};
exports.clients_idle = ["local"];