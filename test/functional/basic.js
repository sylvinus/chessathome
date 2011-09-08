var ENGINE_PATH = "../public/engine.js";
if (require) {
  var QUnit = require('../public/qunit/cli.js').QUnit;
  var Worker = require('webworker').Worker;
  var path = require("path");
  ENGINE_PATH = path.resolve(__dirname,ENGINE_PATH);
}

var LATEST_DATA = false;

var makeEngine = function(onMessage) {
  var w = new Worker(ENGINE_PATH);
  
  w.onmessage = function(e) {
    e = e.data;
    LATEST_DATA = e;

    console.log("From engine:", e);
    if (onMessage) onMessage(e);
  };
  
  w.error = function (e) {
      console.error("Error from engine", e);
  }
  
  return w;
}

var Q = QUnit;

Q.module('Basic tests');

Q.test('qunit test', function() {
  Q.expect(1);
  Q.ok(true);
});

Q.test('interface ping test', function() {
  Q.expect(1);
  
  Q.stop();
  
  var engine = makeEngine();
  
  engine.postMessage({ type:'ping' });
  
  setTimeout(function() {
    Q.same('pong', LATEST_DATA.type);
    
    Q.start();
  },200);
  
});


Q.test('FEN+move resolve test 1', function() {
  Q.expect(1);
  Q.stop();
  var engine = makeEngine();
  engine.postMessage({ type:'resolve','data':['e2e4','rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1']});
  setTimeout(function() {
    Q.same('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', LATEST_DATA.fen);
    Q.start();
  },200);
});

Q.test('FEN+move resolve test 2', function() {
  Q.expect(1);
  Q.stop();
  var engine = makeEngine();
  engine.postMessage({ type:'resolve','data':['c7c5','rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1']});
  setTimeout(function() {
    Q.same('rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2', LATEST_DATA.fen);
    Q.start();
  },200);
});

Q.test('FEN+move resolve test 3', function() {
  Q.expect(1);
  Q.stop();
  var engine = makeEngine();
  engine.postMessage({ type:'resolve','data':['g1f3','rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2']});
  setTimeout(function() {
    Q.same('rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', LATEST_DATA.fen);
    Q.start();
  },200);
});
