var Worker = require('webworker').Worker
  , EventEmitter = require('events').EventEmitter
  , path = require('path')
  , _ = require('underscore')._
  , clients = {}
  , lib = require("../lib");

var VERBOSE = true;

var APHID_DEPTH=1;
var TIMEOUT = 2000;
//var TIMEOUT = 60000;

//Defaults
var ENGINE_OPTIONS = {
};

var emitter = new EventEmitter;

var models = require("../models");
var ObjectId = require("mongoose").Types.ObjectId;

var clients_idle = [];


exports.setApi = function(io) {
  console.warn(io);
  io.of('/io/worker').on('connection',function(socket) {
    
    socket.on('init',function(clientData) {
      socket.set('workerData',clientData,function() {
    
        
    
        socket.on('processResult',function (data) {

          if (data.type=="move") {
            console.log("[from "+clientData.id+"] Computed",data);
            
            
          };

        });
    
        // Tell the queue there's a new client ready!
        emitter.emit('activity');
    
      });
    });
    
    
    /*
    client.setIdle = function(idle) {
      client.idle=idle;
      if (idle) {
        clients_idle.push(conn.id);
      } else {
        clients_idle=_.without(clients_idle,conn.id);
      }
    }
    */
    
    
    socket.on('disconnect', function () {
      /*
      console.log('We\'ve lost an intelligent client ' + client.name);
      delete clients[conn.id];
      clients_idle=_.without(clients_idle,conn.id);
      */
    });
    
    
  });
  
  
  
};
  


var onActivity=function() {
  console.log("Activity?");
  
  if (clients_idle.length==0) return;
  
  // get moves from db queue.
  console.warn(+new Date(),"Fetching unresolved positions...");
  models.Position.find({state:'unresolved'}).asc("dateAdded").limit(clients_idle.length).execFind(function(err,docs) {
    if (err) return console.log("Error when fetching positions:",err);
    console.warn(+new Date(),"Got "+docs.length+" unresolved positions...");
    
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
          console.log("Sending work on ",doc,"to client",client.name);
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
  models.Game.find({playerToMove:false,working:true},function(err,games) {
    if (err) return console.log("When fetch games:",err);
    
    console.warn(+new Date(),"Fetched computing games : ",games.length);
    
    games.forEach(function(game) {
      
      //This game is ended
      if (!game.gameStatus.active) {
        emitter.emit('refresh_'+game.gameStatus.currentFEN);
        return;
      }
      
      //Fetch current pos
      models.Position.findOne({fen:game.gameStatus.currentFEN},function(err,pos) {
        if (err || !pos) return console.error("Panic, no matching pos found.",err);
      
        console.warn(+new Date(),"Fetching unresolved pos for game",game._id);
        models.Position.count({resolved:false,fen:{$in:_.keys(pos.children)}},function(err,count) {
          if (err) return console.err('Cant count unresolved positions:',err);
        
          console.warn(+new Date(),count+" remaining for game ",game._id,game.gameStatus.currentFEN);
          //Everything was resolved! time to send to the client.
          //Todo check time and iterative deepening.
          if (!count) {
          
            //Find the best position among all the available ones.
            models.Position.find({fen:{$in:_.keys(pos.children)}}).asc("value").limit(1).execFind(function(err,positions) {
              if (err) return console.err('Cant find best position:',err);
            
            
            
              if (!positions.length) {
                
                console.log("No positions for ",game._id," should reinsert? ",game.playerToMove);
                /*
                if (!game.playerToMove) {
                  console.log("reinsert");
                  //reinsert
                  exports.makeEngine(function() {}).search(game.gameStatus.currentFEN,TIMEOUT,game);
                }
                */
                return;
              }
            
              console.log("Best position found:",positions[0])
            
              var possibleRootMoves = pos.children[positions[0].fen];
            
              var move = possibleRootMoves[0][0];
            
              //assert pos.state=="root"
              pos.resolved=true;
              pos.move = move;
              pos.value = positions[0].value;
              //todo sum nodes, report depth, time etc.
              
              pos.save(function(err) {
                emitter.emit('refresh_'+game.gameStatus.currentFEN,move);
              });
              
            });
          }
        });
      });
    });
  });
  
};



exports.makeEngine = function(onMessage) {
  
  var foundMove = function(move) {
    console.log("notifying client of a change w/ move",move);
    onMessage({type:'move',data:move});
  };
  
  var engineApi = {
    stop:function(fen) {
      if (fen) emitter.removeListener('refresh_'+fen,foundMove); 
    },
    
    search:function(moveOptions) {

      console.log("Distributing search",moveOptions);
      
      // Is the position already in DB?
      models.Position.find({fen:moveOptions.fen},function(err,docs) {
        if (err) console.error('Couldnt save computingPositions!',err); 
        if (err || !docs.length) {
          var p = new models.Position();
          p.fen = moveOptions.fen;
          p.working = false;
        } else {
          p = docs[0];
        }
        
        // We're already working on it, wait for the signal.
        if (p.working) return;
        
        // Position was already explored *as a root node*
        if (p.state=="root" && moveOptions.useCache) {
          return foundMove(p.move);
        }
        
        p.state='root';
        p.resolved=false;
        
        emitter.on('refresh_'+moveOptions.fen,foundMove); 
        
        p.findChildren(function(err) {
          if (err) {
            engineApi.stop();
            return onMessage({type:'error',message:err});
          }
          
          //We have inserted the children, set status as working!
          
          p.save(function(err) {
            
            p.insertChildren(function(err) {
              //onActivity should take care of the rest.
              emitter.emit('activity');
            },!moveOptions.useCache);
            
          });
          
        });
      });

    }
  };
  
  return engineApi;
  
};

exports.start = function(engineOptions) {
  console.log("Starting distributed-mongo engine...");
  
  ENGINE_OPTIONS = _.extend(ENGINE_OPTIONS,engineOptions);
  
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


exports.VERBOSE = VERBOSE;
exports.clients = clients;
exports.clients_idle = clients_idle;