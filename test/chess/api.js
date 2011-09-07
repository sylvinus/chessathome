var Q = require('../public/qunit/cli.js').QUnit;
require("./_engineboot.js");
var client = require("./_simpleclient.js").client;


Q.module("API tests");

Q.test("simple move",function() {
  Q.stop();
  Q.expect(6);
  
  console.warn("starting test");

  client.init(function(){

    client.newGame({},function(err,fen,status) {

      Q.same(true,status.playerToMove); 
      Q.same("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",fen);
      Q.same(status.gameStatus.depth,1);
    
      client.playMove('e2e4',function(err,computerMove,fen,status) {
        
        Q.same(true,status.playerToMove);
        Q.same(status.gameStatus.depth,2);
      
        client.playMove('a2a4',function(err,computerMove,fen,status) {
        
          Q.same(status.gameStatus.depth,3);
        
          Q.start();
        });
      
      });
    });
  
  });

});