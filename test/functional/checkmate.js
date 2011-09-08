var Q = require('../public/qunit/cli.js').QUnit;
require("../_engineboot.js");
var client = require("../_simpleclient.js").client;


var testTable = [
  // One move win
  ['r1bqkbnr/ppp1pppp/2n5/8/2K1p3/8/PPPP1PPP/RNBQ1BNR b kq - 0 35', 'd8d4', null]
];

Q.module('Checkmate tests');


testTable.forEach(function(position) {
  
  Q.test('position '+position[0], function() {
    Q.expect(3);
    Q.stop();
    
    //Here first player to play is always computer
    var playerColor=position[0].split(' ')[1];
    
    client.init(function(){

      client.newGame({startFEN:position[0],playerColor:(playerColor=="w"?"b":"w")},function(err,fen,status) {
        
        Q.same(fen,position[0]);
        
      //First move on init
      },function(err,move,fen,status) {
        
        Q.equal(move, position[1]);

        client.playMove(position[1], function(err,computerMove,fen,status) {
        
          Q.equal(computerMove, null);

          Q.start();

        });
        
      });
      
    });
    
  });
  
});
