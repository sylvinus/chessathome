var Q = require('../public/qunit/cli.js').QUnit;
require("../_engineboot.js");
var client = require("../_simpleclient.js").client;


var testTable = [
  // [1] is the one move to win
  ['8/3K1k2/8/ppr2r1p/8/8/PP6/8 b - - 2 32','f5d5'],
  ['3q1rk1/5pbp/5Qp1/8/8/2B5/5PPP/6K1 w - - 0 37','f6g7']
  
];

Q.module('Checkmate tests');


testTable.forEach(function(position) {
  
  
  Q.test('position by player '+position[0], function() {

    Q.expect(9);
    Q.stop();
    
    var playerColor=position[0].split(' ')[1];
    
    client.init(function(){

      client.newGame({startFEN:position[0],playerColor:playerColor},function(err,fen,status) {
    
        Q.same(fen,position[0]);
        Q.same(false,status.gameStatus.mate);
        Q.same(true,status.playerToMove);
        Q.same(true,status.gameStatus.active);
        
        client.playMove(position[1],function(err,move,fen,status) {

          Q.same(false,status.playerToMove);
          Q.same(true,status.gameStatus.check);
          Q.same(true,status.gameStatus.mate);
          Q.same(false,status.gameStatus.active);
          Q.same(true,status.gameStatus.winner);
          
          Q.start();
        });
        
      });
      
    });
  });
  
  Q.test('position '+position[0], function() {
    Q.expect(12);
    Q.stop();
    
    //Here first player to play is always computer
    var computerColor=position[0].split(' ')[1];
    
    client.init(function(){

      client.newGame({startFEN:position[0],playerColor:(computerColor=="w"?"b":"w")},function(err,fen,status) {
        
        Q.same(fen,position[0]);
        Q.same(false,status.gameStatus.mate);
        Q.same(true,status.gameStatus.active);

        
      //First move on init
      },function(err,move,fen,status) {
        
        Q.equal(move, position[1]);
        Q.same(true,status.gameStatus.check);
        Q.same(true,status.gameStatus.mate);
        Q.same(false,status.gameStatus.active);
        Q.same(false,status.gameStatus.winner);
        
        
        // Now just for fun & API completeness try re-starting the game in the checkmate position.
        
        client.init(function(){
          client.newGame({startFEN:fen,playerColor:computerColor},function(err,fen,status) {
          
            Q.same(true,status.gameStatus.check);
            Q.same(true,status.gameStatus.mate);
            Q.same(false,status.gameStatus.active);
            Q.same(true,status.gameStatus.winner);
          
            Q.start();
          },function(err,move,fen,status) {
            //Shouldn't happen
            Q.ok(false);
          });
        });
        
      });
      
    });
    
  });
  
});
