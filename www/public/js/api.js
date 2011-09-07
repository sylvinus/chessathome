var dnode = require('dnode')
  , EventEmitter = require('events').EventEmitter
  , emitter = new EventEmitter;
  
var client = dnode(function() {
  var self = this;
  
  self.role = 'player';
  
  self.playerSecret=false;
  
  this.init = function() {
    if ($.cookie('playerSecret')) {
      self.playerSecret = $.cookie('playerSecret');
    }
    self.depth = 1;
  };
  this.init();
  

  this.refreshGameStatus = function(status) {
    ServerUpdate(status);
  };

  this.error = function(message) {
    alert(message);
  };

  this.terminate = function() {
    emitter.emit('terminate');
  };
});

client.connect({reconnect: 100}, function(remote, conn) {
  var self = this;

  console.log('Connected...');

  // Waiting confirmation from SubStack
  // function reconnect() {
  //   console.log('Calling reconnect()');
  //   conn.reconnect(1000, function (err) {
  //     if (err) {
  //       console.error(err);
  //       reconnect();
  //     } else {
  //       console.warn('loopsiloppsiloo');
  //     }
  //   });
  // }

  conn.on('timeout', function () {
    console.log('Timeout with the server.');
    // reconnect();
  });

  conn.on('end', function () {
    console.log('Server probably crashed.');
    // reconnect();
  });

  emitter.on('terminate', function() {
    console.log('Force terminate of client');
    conn.end();
  });

  emitter.on('move', function(move) {
    console.log('play move', move);
    remote.playMove(self.playerSecret,move);
    self.depth++;
  });

  emitter.on('newGame', function(playerName,gameOptions) {
    //playerSecret is redifined for each game.
    self.playerSecret = uuid();
    $.cookie('playerSecret',self.playerSecret,{ expires: 7 });
    console.log('API', 'newGame', playerName, gameOptions)
    remote.newGame(playerName,self.playerSecret,gameOptions);
  });
});

var API = {

  newGame: function(playerName, gameOptions) {
    //send to remote
    emitter.emit('newGame', playerName, gameOptions);
  },

  playMove: function(move) {
    emitter.emit('move', move);
  }
};
