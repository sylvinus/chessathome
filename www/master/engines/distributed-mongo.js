var ENGINE_PATH = '../../../build/engine.js'
  , Worker = require('webworker').Worker
  , EventEmitter = require('events').EventEmitter
  , path = require('path')
  , dnode = require('dnode')
  , _ = require('underscore')._
  , clients = {};

var localEngine = require('../engine').loadEngine('local');

ENGINE_PATH = path.resolve(__dirname, ENGINE_PATH);

var LATEST_DATA = false
  , VERBOSE = true;

var APHID_DEPTH=1;
var TIMEOUT = 2000;
//var TIMEOUT = 60000;

var emitter = new EventEmitter;

var models = require("../models");
var ObjectId = require("mongoose").Types.ObjectId;

var clients_idle = [];

exports.api = function (self, client, conn) {

  console.log('New intelligence client: ' + client.name);
  
  client.setIdle = function(idle) {
    client.idle=idle;
    if (idle) {
      clients_idle.push(conn.id);
    } else {
      clients_idle=_.without(clients_idle,conn.id);
    }
  }
  
  conn.on('timeout', function () {
    console.log('Timeout of: ' + client.name);
  });
  
  conn.on('end', function () {
    console.log('We\'ve lost an intelligent client ' + client.name);
    delete clients[conn.id];
    clients_idle=_.without(clients_idle,conn.id);
    //TODO was it computing something ? invalidate and emitter.emit('activity');
  });

  conn.on('processResult',function (data) {

    if (data.type=="move") {
      console.log("[from "+client.name+"] Computed",data);
      client.onComputed(data);
    };
    
  });
  
  clients[conn.id] = client;
  client.setIdle(true);
  
  
  emitter.emit('activity');
};


var onActivity=function() {
  console.log("Activity?");
  
  if (clients_idle.length==0) return;
  
  // get moves from db queue.
  console.warn(+new Date(),"Fetching unresolved positions...");
  models.Position.find({state:'unresolved'}).asc("dateAdded").limit(clients_idle.length).execFind(function(err,docs) {
    if (err) return console.log("Error when fetching positions:",err);
    console.warn(+new Date(),"Got unresolved positions...");
    
    docs.forEach(function(doc) {
      if (clients_idle.length) {
        var cid = clients_idle.pop();
        var client = clients[cid];
        if (!client) return;
        
        doc.worker = cid;
        doc.state = 'working';
        doc.working = true;
        doc.dateStarted = +new Date();
        doc.save(function(err) {
          if (err || !client) return;
          
          client.job = doc.fen;
          client.setIdle(false);
          client.compute(doc.fen,TIMEOUT);
          client.onComputed = function(data) {
            client.onComputed = function() {};
            client.setIdle(true);
            doc.dateResolved=+new Date();
            doc.state = "resolved";
            doc.working = false;
            doc.resolved = true;
            doc.move = data.data;
            doc.worker = false;
            doc.value = data.value;
            doc.save(function() {
              emitter.emit('activity');
            });
            
            
          };
        });
        
      }
    });
    
    //Everything has been resolved
    //TODO if there's time left, iterative deepening.
    if (!docs.length) {
      emitter.emit('computed');
    }
  });
  
};


var onComputed=function() {
  console.log("Computed?");
  
  console.warn(+new Date(),"Fetching computing games");
  models.Game.find({playerToMove:false,computing:true},function(err,games) {
    if (err) return console.log("When fetch games:",err);
    
    console.warn(+new Date(),"Fetched computing games : ",games.length);
    
    games.forEach(function(game) {
      if (!_.size(game.computingPositions)) {
        console.error('There was no computing positions for a game in progress. Still being inserted? Bug?');
        return;
      }
      
      //This game is ended
      if (!game.gameStatus.active) {
        emitter.emit('refresh_'+game._id);
        return;
      }
      
      console.warn(+new Date(),"Fetching unresolved pos for game",game._id);
      models.Position.count({resolved:false,fen:{$in:_.keys(game.computingPositions)}},function(err,count) {
        if (err) return console.err('Cant count unresolved positions:',err);
        
        console.warn(+new Date(),count+" remaining for game ",game._id,game.gameStatus.currentFEN);
        //Everything was resolved! time to send to the client.
        //Todo check time and iterative deepening.
        if (!count) {
          
          //Find the best position among all the available ones.
          models.Position.find({fen:{$in:_.keys(game.computingPositions)}}).asc("value").limit(1).execFind(function(err,positions) {
            if (err) return console.err('Cant find best position:',err);
            
            
            
            if (!positions.length) {
              
              console.log("No positions for ",game._id," will reinsert ",game.playerToMove);
              if (!game.playerToMove) {
                console.log("reinsert");
                //reinsert
                exports.makeEngine(function() {}).search(game.gameStatus.currentFEN,TIMEOUT,game);
              }
              return;
            }
            
            console.log("Best position found:",positions[0])
            
            var possibleRootMoves = game.computingPositions[positions[0].fen];
            console.log("Associated possible root moves :",possibleRootMoves);
            
            var move = possibleRootMoves[0][0];
            
            game.computing = false;
            //game.computingPositions = {};
            game.gotComputerMove(move,function(err) {
              if (err) console.log('When trying to get computer move:',err,'we should try to notify client');
              
              game.save(function() {
                //When the move is saved, we can try to notify the client that something changed.
                emitter.emit('refresh_'+game._id,move);
              });
            });
          });
        }
      });
    });
  });
  
};



exports.makeEngine = function(onMessage) {
  
  
  var foundMove = function(move) {
    console.log("notifying client of a change w/ move",move);
    onMessage({type:'refresh',data:move});
  };
  
  return {
    stop:function(game) {
      if (game) emitter.removeListener('refresh_'+game._id,foundMove); 
    },
    
    search:function(fen,timeout,game) {

      console.log("Distributing search",fen,timeout);
      
      // APHID chess distribution
      // spawn new worker to "getmoves"

      var w = localEngine.makeEngine(function(e) {
        console.log(e.data);

        emitter.on('refresh_'+game._id,foundMove);
        
        var movefens = _.pluck(e.data,1);
        
        var treefens = {};
        e.data.forEach(function(m) {
          if (treefens[m[1]]) {
            treefens[m[1]].push(m[0]);
          } else {
            treefens[m[1]] = [m[0]];
          }
        });
        
        game.computingPositions = treefens;
        game.computing = true;
        game.save(function(err) {
          if (err) console.error('Couldnt save computingPositions!',err); //TODO how to manage that?
          
          models.Position.find({fen:{$in:movefens}},function(err,docs) {
            if (err) docs = [];
          
            var alreadyInDb = _.pluck(docs,'fen');
          
            e.data.forEach(function(data) {
              if (alreadyInDb.indexOf(data[1])==-1) {
                var p = new models.Position();
                p.fen = data[1];
                p.state = 'unresolved';
                p.save();
              }
            });
            emitter.emit('activity');
          });
        
        });
        
        
        
      });

      w.post({type: 'getmoves', depth: APHID_DEPTH, fen: fen});
      
    }
  };
  
};

exports.start = function() {
  console.log("Starting distributed-mongo engine...");
  
  exports.activityInterval = setInterval(function() {
    emitter.emit('activity');
  },5000);
  
  //Any position staying in "working" for more than TIMEOUT+2000 is marked as unresolved again.
  exports.garbageInterval = setInterval(function() {
    models.Position.find({working:true,dateStarted:{$lt:(+new Date()-(TIMEOUT+2000))}},function(err,docs) {
      if (err) return console.log("When GC:",err);
      
      docs.forEach(function(doc) {
        doc.state = 'unresolved';
        doc.working = false;
        doc.save();
      });
      if (docs.length) emitter.emit('activity');
    });
  },5000);
  
  // Try to find games that are still waiting for a computation
  exports.gameInterval = setInterval(function() {
    emitter.emit('computed');
  },10000);
  
  emitter.on('activity',onActivity);
  emitter.on('computed',onComputed);
  
  emitter.emit('activity');
  emitter.emit('computed');
};

exports.stop = function() {
  console.log("Stopping distributed-mongo engine...");
  
  clearInterval(exports.gameInterval);
  clearInterval(exports.garbageInterval);
  clearInterval(exports.activityInterval);
  emitter.removeListener('activity',onActivity);
  emitter.removeListener('computed',onComputed);  
};


exports.LATEST_DATA = LATEST_DATA;
exports.VERBOSE = VERBOSE;
exports.clients = clients;
exports.clients_idle = clients_idle;