(function() {
  
var socket = io.connect('/io/player');

var playerSecret = false;
if ($.cookie('playerSecret')) {
  playerSecret = $.cookie('playerSecret');
}

socket.on('connect', function () {
  
  socket.on('ready',function() {
    
    if (playerSecret) {
      socket.emit('getGameStatusBySecret',playerSecret);
    }
    ServerConnected();
  });
  
  socket.on("gameStatus",function(status) {
    ServerUpdate(status);
  });
  
  socket.on('error',function(message) {
    alert("Error: "+message);
  });
  
  socket.emit("init",{id:"player-"+uuid()});

});

socket.on('disconnect',function() {
  //TODO
});


window.API = {

  newGame: function(playerName, gameOptions) {
    playerSecret = uuid();
    $.cookie('playerSecret',playerSecret,{ expires: 7 });
    
    socket.emit('newGame', playerName, playerSecret, gameOptions);
  },

  playMove: function(move) {
    socket.emit('playMove', playerSecret, move);
  }
};

})();