var dnode = require('dnode')
  , clients = {};

var models = require("./models");

var TIMEOUT = 4000;

exports.startWithEngine = function(engineName,engineOptions) {
  
  if (!engineOptions) {
    engineOptions = {};
  }
  
  console.log("Starting API with engine",engineName,engineOptions);
  
  // API for AI workers
  var workerEngine = require('./engines/'+engineName);
  workerEngine.start();
  
  exports.clients = workerEngine.clients;
  exports.clients_idle = workerEngine.clients_idle;
  
  
  
  return dnode(function (client, conn) {
    var self = this;
    console.log('New client');

    conn.on('ready', function () {

      //Worker API forward
      if (client.role=="worker") {
        if (workerEngine.api) workerEngine.api(self,client,conn);
        return;
      }

      console.log('New client ready: ',client.role,client.name);



      clients[conn.id] = client;

      // Try to find an existing game
      if (client.playerSecret) {
        models.Game.find({playerSecret:client.playerSecret},function(err,docs) {
          if (err || !docs || !docs.length) return;
          client.refreshGameStatus(docs[0].dump());
        });
      }
    });

    conn.on('end', function () {
      console.log('We\'ve lost client ' + client.name);
      delete clients[conn.id];
    });

    var compute = function(game) {

      game.computerPlays(workerEngine,TIMEOUT,function(err) {
        if (err) {
          console.log("Computer can't play next move:", err) 
          client.refreshGameStatus(game.dump());

          //game.save 


        } else {

        //here g is outdated, we have to
        //reload data to send always fresh.
        models.Game.findById(game._id,function(err,updatedGame) {
          client.refreshGameStatus(updatedGame.dump());

        });
        }
      });
    }; 


    //this is a bit hacky because it belongs to workerApi.
    this.processResult = function(res) {
      conn.emit('processResult',res);
    }

    this.playMove = function(playerSecret,move) {
      //validate playerHash
      console.log("got move",move,"for",playerSecret);
      models.Game.find({playerSecret:playerSecret},function(err,docs) {
        console.log("found game",err,docs);
        if (err) return client.error(err);
        if (!docs.length) return client.error("no such game");

        var g = docs[0];

        g.playMove(1,move,function(err, data) {
          console.log("player played move | ", err);
          if (err) return client.error(err);
          
          g.save(function() {
            
            console.log('ACTIVE:', g.gameStatus.active)
            //throw (g.gameStatus.active && data.active);
            //now launch computer if the game is still active (the player may have won)
            if (g.gameStatus.active && data.active)
              compute(g);
            else
              client.refreshGameStatus(g.dump());

          });
          
          
        });
      });

    };

    this.newGame = function(playerName,playerSecret,gameOptions) {

      var g = new models.Game({
        "playerName":playerName,
        "playerSecret":playerSecret,
        "gameOptions":gameOptions
      });

      g.gameInit(function() {
        g.save(function(err) {
          console.log("new game saved", g.dump(),err);
          if (err) {
            client.error(err);
          } else {
            client.refreshGameStatus(g.dump());

            if (!g.gameStatus.active) {
              return;
            }
            
            // Game starts with a AI play
            if (!g.playerToMove) {
              compute(g);
            } 

          }
        });
      });
      

    };


  });
  
}
