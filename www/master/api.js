var socketio = require("socket.io");

var models = require("./models");
var lib = require("./lib");
var TIMEOUT = 15000;



exports.startWithEngine = function(engineName,engineOptions) {
  
  if (!engineOptions) {
    engineOptions = {};
  }
  
  console.log("Starting API with engine",engineName,engineOptions);
  
  var workerEngine = require('./engine').loadEngine(engineName);
  
  //For stats.
  exports.clients = workerEngine.clients;
  exports.clients_idle = workerEngine.clients_idle;
  
  if (engineOptions.app) {
    var io = socketio.listen(engineOptions.app);
  } else {
    var io = socketio.listen(engineOptions.port);
  }
  
  // https://github.com/LearnBoost/Socket.IO/wiki/Configuring-Socket.IO
  io.enable('browser client minification');
  io.enable('browser client etag');
  
  workerEngine.setApi(io);
  workerEngine.start();
  
  
  // API for players
  io.of('/io/player').on('connection', function (socket) {
    
    socket.on('init',function(clientData) {
      socket.set('clientData',clientData,function() {
        socket.emit('ready');
        
        
        var continueGame = function(game) {
          if (game.gameStatus.active && !game.playerToMove) {
            game.computerPlays(workerEngine,{timeout:TIMEOUT},function(err) {
              if (err) socket.emit('error',err);
              
              //models.Game.findById(game._id,function(err,updatedGame) {
              socket.emit('gameStatus',game.dump());
            });
          }
        };
        
        console.log("New client.player ready",clientData.id);
        
        socket.on('newGame',function(playerName,playerSecret,gameOptions) {
          
          var g = new models.Game({
            "playerName":playerName,
            "playerSecret":playerSecret,
            "gameOptions":gameOptions
          });

          g.gameInit(function(err) {
            console.log("new game started", g.dump(),err);
            if (err) {
              socket.emit('error',err);
            } else {
              socket.emit('gameStatus',g.dump());
              
              continueGame(g);
            }
          });
          
        });
        
        socket.on('getGameStatusBySecret',function(playerSecret) {
          models.Game.findOne({playerSecret:playerSecret},function(err,game) {
            if (err || !game) return;
            socket.emit('gameStatus',game.dump());
          });
        });
        
        socket.on('getGameStatusById',function(gameId) {
          models.Game.findById(gameId,function(err,game) {
            if (err || !game) return;
            socket.emit('gameStatus',game.dump());
          });
        });
        
        socket.on('playMove',function(playerSecret,move) {
          console.log("got move",move,"for",playerSecret);
          
          models.Game.findOne({playerSecret:playerSecret},function(err,game) {
            console.log("found game",err,game);
            if (err) return socket.emit('error',err);
            if (!game) return socket.emit('error','no such game');

            game.playMove(1,move,function(err) {
              if (err) return socket.emit('error',err);

              socket.emit('gameStatus',game.dump());
              
              continueGame(game);

            });
          });
          
        });
          

        
        
      });
    });
    
    socket.on('disconnect', function () {
      
    });
    
  });
  
  
  return io;
  
   
}
