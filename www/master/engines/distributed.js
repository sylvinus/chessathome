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
var TIMEOUT = 1000;

var emitter = new EventEmitter;


exports.api = function (self, client, conn) {

  console.log('New intelligence client: ' + client.name);
  
  
  
  conn.on('timeout', function () {
    console.log('Timeout of: ' + client.name);
  });
  
  conn.on('end', function () {
    console.log('We\'ve lost an intelligent client ' + client.name);
    delete clients[conn.id];
    
    //TODO was it computing something ? invalidate and emitter.emit('activity');
  });

  conn.on('processResult',function (data) {

    if (data.type=="move") {
      console.log("[from "+clients[conn.id].name+"] Computed",data);
      clients[conn.id].onComputed(data);
    };
    
  });
  
  client.idle=true;
  clients[conn.id] = client;
  
  emitter.emit('activity');
};




var makeEngine = function(onMessage) {
  
  var moves = {};
  
  
  var newActivity=function() {
    console.log("Activity?");
    
    var unresolvedMoves = false;
    var bestMove=false;
    
    //TODO optimize this
    _.each(moves,function(move,fen) {
      
      if (move.state!="unresolved") return;
      unresolvedMoves = true;

      _.each(clients,function(client,cid) {
        if (move.state!="unresolved") return;
        if (!client.idle) return;
        
        move.state = "working";
        move.worker = cid;
        client.job = fen;
        client.idle=false;
        client.compute(fen,TIMEOUT);
        client.onComputed = function(data) {
          client.onComputed = function() {};
          client.idle=true;
          move.state = "resolved";
          move.best = data.data;
          move.worker = false;
          move.value = data.value; //todo how to compare different ply's ?
          console.log(data);
          
          emitter.emit('activity');
        };
        
      });
    
    });
    
    //Everything has been resolved
    //TODO if there's time left, iterative deepening.
    if (!unresolvedMoves && !bestMove) {
      
      //Are we left with only RESOLVED moves?
      var statuses = _.uniq(_.pluck(moves,'state'));
      if (statuses.length>1 || statuses[0]!="resolved") return;
      
      // Stop listening for activity events
      emitter.removeListener('activity',newActivity);
      
      // TODO insert data in the DB
      
      // choose best move
      var max=+3000000;
      console.log("Moves",moves);
      _.each(moves,function(move) {
        if (move.value>=max) return;
        max=move.value;
        bestMove=move;
      });
      console.log(bestMove);
      bestMove.moves.push(bestMove.best);
      console.log("Best move is",bestMove.moves[0]);
      
      onMessage({type:'move',data:bestMove.moves[0]});
      
    }
  };
  
  return {
    terminate:function() {},
    
    search:function(fen,timeout) {

      console.log("Distributing search",fen,timeout);
      
      emitter.on('activity',newActivity);
      
      if (APHID_DEPTH==0) {
        moves[fen]={state: 'unresolved', moves: [], worker:false, best:false};
        emitter.emit('activity');
        return;
      }
      
      // APHID chess distribution
      // spawn new worker to "getmoves"

      var w = localEngine.makeEngine(function(e) {
        console.log(e.data);

        // e.data is an array of arrays
        // arrays[0] = the move
        // arrays[1] = the corresponding FEN
        e.data.forEach(function(data) {
          moves[data[1]] = {state: 'unresolved', moves: data[0], worker:false, best:false};
        });
        emitter.emit('activity');
      });

      w.post({type: 'getmoves', depth: APHID_DEPTH, fen: fen});
      
    }
  };
  
};

exports.start = function() {};
exports.stop = function() {};
exports.makeEngine = makeEngine;
exports.LATEST_DATA = LATEST_DATA;
exports.VERBOSE = VERBOSE;
exports.clients = {};
exports.clients_idle = [];