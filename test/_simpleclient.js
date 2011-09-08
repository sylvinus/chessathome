// Sends move, waits, and sends back results from the server.

var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter;

emitter.setMaxListeners(1000);

var uuid = require('node-uuid');
var dnode = require('dnode');






var seq = 0;
var gameSeq = 0;

exports.client = {
  
  init:function(clientReady) {
    
    var dclient = dnode(function() {
      var self = this;

      this.playerSecret = "test-"+uuid().substring(0,8);

      this.depth = false;

      this.currentFEN = false;

      this.refreshGameStatus=function(status) {
        
        console.warn("simpleclient got status",status);
        
        //First status! game has started.
        if (!self.currentFEN) {
          self.currentFEN = status.gameStatus.currentFEN;
          emitter.emit('gameStarted_'+seq,self.currentFEN,status);

        //new move!
        } else if (self.currentFEN!=status.gameStatus.currentFEN) {
          self.currentFEN = status.gameStatus.currentFEN;
          if (status.gameStatus.moves.length) {
            var move = status.gameStatus.moves[status.gameStatus.moves.length -1];
          } else {
            var move = false;
          }
          
          emitter.emit('gotMove_'+seq,move,self.currentFEN,status);

        //ignore further game statuses.
        }

      };

      this.error=function(message) {
        emitter.emit('error_'+seq,message);
      };

    });

    dclient.connect({ port : 3005, timeout : 2000 }, function(remote, conn) {
      var self=this;

      console.log("connected..");
      
      
      conn.on('timeout', function () {
        console.log('Timeout with the server.');
        // reconnect();
      });

      conn.on('end', function () {
        console.log('Server probably crashed.');
        // reconnect();
      });

      emitter.on('playMove_'+gameSeq, function(move) {
        console.log('play move',move);
        remote.playMove(self.playerSecret,move);
      });

      //so, only one new game per init()?
      emitter.on('newGame_'+gameSeq,function(gameOptions) {
        console.log("new game!");
        remote.newGame('test Client',self.playerSecret,gameOptions);
      });

      clientReady();
    });
    
  },
  
  
  
  newGame:function(gameOptions,cb,firstComputerMove) {
    
    gameSeq++;
    seq++;
    emitter.on('gameStarted_'+seq,function(fen,status) {
      cb(null,fen,status);
    });
    
    //When first move is computer
    emitter.on('gotMove_'+seq,function(move,fen,status) {
      firstComputerMove(null,move,fen,status);
    })
    
    emitter.emit('newGame_'+(gameSeq-1),gameOptions);
    
  },
  
  playMove:function(move,cb) {
    seq++;
    
    emitter.on('error_'+seq,function(message) {
      cb(message);
    });
    
    emitter.on('gotMove_'+seq,function(move,fen,status) {
      cb(null,move,fen,status);
    });
    
    emitter.emit('playMove_'+(gameSeq-1),move);
  }
};