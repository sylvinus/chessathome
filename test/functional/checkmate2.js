var Q = require('../public/qunit/cli.js').QUnit;
require("../_engineboot.js");
var client = require("../_simpleclient.js").client;


Q.module('Checkmate tests');

/*

Q.test('Position '+'8/3K1k2/8/pprr3p/8/8/PP6/8 w - - 3 33', function() {
  Q.expect(3);
  Q.stop();
  
  var seq = ['8/3K1k2/8/pprr3p/8/8/PP6/8 w - - 3 33', 0];
  
  //Here first player to play is always computer
  var playerColor=seq[0].split(' ')[1];
  
  client.init(function(){

    client.newGame({startFEN:seq[0],playerColor:(playerColor=="w"?"b":"w")},function(err,fen,status) {
      
      Q.ok(false);
    //First move on init
    },function(err,move,fen,status) {

      Q.same(true,status.gameStatus.mate);
      Q.same(false,status.gameStatus.active);
      
      Q.same(fen,seq[0]);
      
      Q.start();
      
    });
    
  });
  
});
*/


  ['3q1rk1/5pbp/5Qp1/8/8/2B5/5PPP/6K1 w - - 0 37','',null]

Q.test('Position '+'8/3K1k2/8/ppr2r1p/8/8/PP6/8 b - - 2 32', function() {
  Q.expect(6);
  Q.stop();
  
  var seq = ['8/3K1k2/8/ppr2r1p/8/8/PP6/8 b - - 2 32', 0];
  
  //Here first player to play is always computer
  var playerColor=seq[0].split(' ')[1];
  
  client.init(function(){

    client.newGame({startFEN:seq[0],playerColor:(playerColor=="w"?"b":"w")},function(err,fen,status) {
      
      Q.same(false,status.gameStatus.mate);
      Q.same(true,status.gameStatus.active);
      
      Q.same(fen,seq[0]);
      
    //First move on init
    },function(err,move,fen,status) {

      Q.same(true,status.gameStatus.check);
      Q.same(true,status.gameStatus.mate);
      Q.same(false,status.gameStatus.active);
      
      Q.start();

    });
    
  });
  
});
