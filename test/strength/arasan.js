var Q = require('../public/qunit/cli.js').QUnit;
require("../_engineboot.js");
var client = require("../_simpleclient.js").client;

var fs = require('fs');
var path = require('path');
var file = fs.readFileSync(path.normalize(__dirname +'/../public/positions/arasan13.epd'), 'utf8').split("\n");


var testTable = [];

function toPost(fen, piece) {
  fen = fen.split('/');
  for (var y = 0; y < fen.length; y++) if (fen[y].indexOf(piece) != -1) break ;
  if (y == fen.length) return false;

  for (var x = 0; x < fen[y].length; x++) {
    if (fen[y][x] == piece) {
      break ;
    }
    else {
      var a = parseInt(fen[y][x], 10);
      if (a > 1) x+= a - 1;
    }
  }
  return String.fromCharCode('a'.charCodeAt(0) + x) + (8 - y);
}

for (var i = 0; i < file.length; ++i) {
  var data = file[i];
  if (data.indexOf(';') != -1 && data.indexOf('bm') != -1) {
    data = data.split(';')[0].split(' bm ');
    var move = data[1].replace('x', '');
    if (move.length == 3) {
      var fen = data[0].split(' ');
      var color = fen[1];
      if (color == 'b') {
        move = move.toLowerCase();
      }
      if ((fen[0].split(move[0]).length - 1) == 1)
        testTable.push([fen[0] +' '+ fen[1] + ' - - 0 1', toPost(fen[0], move[0]) + move.substr(1, 3)]);
    }
  }
}


testTable = [ testTable[0] ];


Q.module('Best move test');


testTable.forEach(function(bestmove) {
  
  Q.test('fen '+bestmove[0] +' '+ bestmove[1], function() {
    Q.expect(2);
    Q.stop();
    
    //Here first player to play is always computer
    var playerColor=bestmove[0].split(' ')[1];
    
    client.init(function(){

      client.newGame({startFEN:bestmove[0],playerColor:(playerColor=="w"?"b":"w")},function(err,fen,status) {
        
        Q.same(fen, bestmove[0]);
        
      //First move on init
      },function(err,move,fen,status) {
        
          Q.equal(move, bestmove[1]);
        
        Q.start();
      });
      
    });
    
  });
  
});
