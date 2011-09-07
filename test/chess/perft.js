var ENGINE_PATH = "../public/engine.js";
if (require) {
  var QUnit = require('../public/qunit/cli.js').QUnit;
  var Worker = require('webworker').Worker;
  var path = require("path");
  ENGINE_PATH = path.resolve(__dirname,ENGINE_PATH);
  var testTable = require('../public/positions/perft.js').g_perfTTable;
}

var LATEST_DATA = false;
var VERBOSE=true;

var makeEngine = function(onMessage) {
  var w = new Worker(ENGINE_PATH);
  
  w.onmessage = function(e) {
    e = e.data;
    LATEST_DATA = e;
    if (VERBOSE) console.warn("  => ", e);
    if (onMessage) onMessage(e);
  };
  
  w.error = function (e) {
      console.error("Error from engine",e.message);
  }
  
  w.post = function(e) {
    if (VERBOSE) console.warn("  <= ", e);
    w.postMessage(e);
  }
  
  return w;
}

var Q = QUnit;

Q.module('Perft tests');

Q.test('perft', function() {
  Q.expect(testTable.length);
  Q.stop();
  
  var i = 0;
  var DEPTH = 4;
  var testNext;
  
  var engine = makeEngine(function(e) {

    Q.same(testTable[i][DEPTH], e.data);
    
    if (++i<testTable.length) {
      testNext();
    } else {
      Q.start();
    }
  });
  
  
  var testNext = function() {
    engine.post({ type:'position', data:testTable[i][0] });
    engine.post({ type:'perft', data:DEPTH });
  };
  testNext();
  
});

Q.test('getmoves', function() {


  Q.expect(testTable.length);
  Q.stop();
  
  var i = 0;
  var DEPTH = 2;
  var testNext;
  
  var engine = makeEngine(function(e) {
    if (e.type!="moves") return;
    
    Q.same(testTable[i][DEPTH], e.data.length);
    
    if (++i<testTable.length) {
      testNext();
    } else {
      Q.start();
    }
  });
  
  
  var testNext = function() {
    engine.post({ type:'position', data:testTable[i][0] });
    engine.post({ type:'getmoves', fen:testTable[i][0], depth:DEPTH });
  };
  testNext();

});