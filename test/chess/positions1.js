var Q = require('../public/qunit/cli.js').QUnit;
require("./_engineboot.js");
var client = require("./_simpleclient.js").client;

var testTable = require('../public/positions/positions1.js').g_positions1Table;


Q.module('Positions 1 tests');

testTable.forEach(function(position) {
  
  Q.test('position '+position[0], function() {
    Q.expect(2);
    Q.stop();
    
    //Here first player to play is always computer
    var playerColor=position[0].split(' ')[1];
    
    client.init(function(){

      client.newGame({startFEN:position[0],playerColor:(playerColor=="w"?"b":"w")},function(err,fen,status) {
        
        Q.same(fen,position[0]);
        
      //First move on init
      },function(err,move,fen,status) {
        
        if (position[2]) {
          Q.equal(position[1],move);
        } else {
          Q.notEqual(position[1],move);
        }
        
        Q.start();
      });
      
    });
    
  });
  
});