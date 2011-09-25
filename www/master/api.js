var socketio = require("socket.io"),
EventEmitter = require('events').EventEmitter;

var models = require("./models");
var lib = require("./lib");
var TIMEOUT = 15000;


exports.gameEvents = new EventEmitter();


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
    
    var gameRefresh = function(game) {
      //models.Game.findById(game._id,function(err,updatedGame) {
      socket.emit('gameStatus',game.dump());
    };
    var listenToGame = function(game) {
      exports.gameEvents.removeListener('refresh_'+game._id,gameRefresh);
      exports.gameEvents.on('refresh_'+game._id,gameRefresh);
      socket.set('game',game._id);
    };
    
    socket.on('init',function(clientData) {
      socket.set('clientData',clientData,function() {
        socket.emit('ready');
        
        
        
        var continueGame = function(game) {
          if (game.gameStatus.active && !game.playerToMove) {
            game.computerPlays(workerEngine,{timeout:TIMEOUT},function(err) {
              if (err) socket.emit('error',err);
              
              // refresh will be sent by gameRefresh()
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
          
          listenToGame(g);

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
            listenToGame(game);
            socket.emit('gameStatus',game.dump());
          });
        });
        
        socket.on('getGameStatusById',function(gameId) {
          models.Game.findById(gameId,function(err,game) {
            if (err || !game) return;
            listenToGame(game);
            socket.emit('gameStatus',game.dump());
          });
        });
        
        socket.on('playMove',function(playerSecret,move) {
          console.log("got move",move,"for",playerSecret);
          
          models.Game.findOne({playerSecret:playerSecret},function(err,game) {
            console.log("found game",err,game);
            if (err) return socket.emit('error',err);
            if (!game) return socket.emit('error','no such game');

            listenToGame(game);
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
      socket.get('game',function(err,gameId) {
        if (!err && gameId) exports.gameEvents.removeListener('refresh_'+gameId,gameRefresh);
      });
    });
    
  });
  
  
  return io;
  
   
}
