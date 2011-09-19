// Sends move, waits, and sends back results from the server.

var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter;

emitter.setMaxListeners(1000);

var uuid = require('node-uuid');

var io = require("socket.io-client");




var seq = 0;
var gameSeq = 0;


var socket = io.connect('http://localhost:3005/io/player');

  
var currentFEN = false;
var playerSecret = false;
  
exports.client = {
  
  init:function(clientReady) {
    
    socket.on('connect', function () {
      
      socket.on('ready',function() {
        clientReady();
      });
      
      socket.on("gameStatus",function(status) {
        console.warn("simpleclient got status",status);
        
        //First status! game has started.
        if (!currentFEN) {
          currentFEN = status.gameStatus.currentFEN;
          emitter.emit('gameStarted_'+seq,currentFEN,status);

        //new move!
        } else if (currentFEN!=status.gameStatus.currentFEN) {
          currentFEN = status.gameStatus.currentFEN;
          if (status.gameStatus.moves.length) {
            var move = status.gameStatus.moves[status.gameStatus.moves.length -1];
          } else {
            var move = false;
          }
          
          emitter.emit('gotMove_'+seq,move,currentFEN,status);

        //ignore further game statuses.
        }
      });
      
      socket.on('error',function(message) {
        emitter.emit('error_'+seq,message);
      });
      
      socket.emit("clientData",{id:"testClient"});

    });
    
  },
  
  
  
  newGame:function(gameOptions,cb,firstComputerMove) {
    
    playerSecret = "test-"+uuid().substring(0,8);
    currentFEN = false;
    
    gameSeq++;
    seq++;
    
    
    emitter.on('gameStarted_'+seq,function(fen,status) {
      cb(null,fen,status);
    });
    
    //When first move is computer
    emitter.on('gotMove_'+seq,function(move,fen,status) {
      firstComputerMove(null,move,fen,status);
    });
    
    socket.emit('newGame','test user',playerSecret,gameOptions);
    
  },
  
  playMove:function(move,cb) {
    seq++;
    
    emitter.on('error_'+seq,function(message) {
      cb(message);
    });
    
    emitter.on('gotMove_'+seq,function(move,fen,status) {
      cb(null,move,fen,status);
    });

    socket.emit('playMove',playerSecret,move);
    
  }
};