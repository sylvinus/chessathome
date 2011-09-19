var Q = require('../public/qunit/cli.js').QUnit;
require("../_engineboot.js");
var client = require("../_simpleclient.js").client;


Q.module("API tests");

Q.test("simple move",function() {
  Q.stop();
  Q.expect(8);
  
  console.warn("starting test");

  client.init(function(){

    client.newGame({},function(err,fen,status) {

      Q.same(true,status.playerToMove); 
      Q.same("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",fen);
      Q.same(status.gameStatus.depth,1);
      
    
      client.playMove('e2e4',function(err,computerMove,fen,status) {
        
        Q.same(true,status.playerToMove);
        Q.same(status.gameStatus.depth,2);
        Q.same("e4",status.gameStatus.san[0]);
        Q.same("e2e4",status.gameStatus.moves[0]);
        
      
        client.playMove('a2a4',function(err,computerMove,fen,status) {
        
          Q.same(status.gameStatus.depth,3);
        
          Q.start();
        });
      
      });
    });
  
  });

});


/*
Q.test("wrong start FEN",function() {
  Q.stop();
  Q.expect(3);
  
  console.warn("starting test");

  client.init(function(){

    client.newGame({startFEN:"Standard"},function(err,fen,status) {

      Q.same(true,status.playerToMove); 
      Q.same("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",fen);
      Q.same(status.gameStatus.depth,1);
    
      Q.start();
    });
  
  });

});


Q.test("custom start FEN",function() {
  Q.stop();
  Q.expect(1);
  
  console.warn("starting test");

  client.init(function(){

    client.newGame({startFEN:"2r3k1/2r4p/1PNqb1p1/3p1p2/4p3/2Q1P2P/5PP1/1R4K1 w - - 0 37"},function(err,fen,status) {

      Q.same("2r3k1/2r4p/1PNqb1p1/3p1p2/4p3/2Q1P2P/5PP1/1R4K1 w - - 0 37",fen);
    
      Q.start();
    });
  
  });

});
*/