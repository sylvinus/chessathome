var mongoose = require('mongoose'),
    Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId,
  _ = require("underscore")._,
  config = require("./config").config,
  lib = require("./lib");

mongoose.connect(config.MONGO);

var Game = new Schema({
    playerName     : { type: String, match: /[a-z0-9A-Z-._]/ }
  , playerSecret      : {type:String, match: /[a-z0-9A-Z-]/,index:{ unique: true}}
  , dateStart      : {type:Date, default: Date.now}
  , dateStop      : Date
  , gameStatus    : {
      currentFEN:String,
      moves:[String],
      san:[String],
      depth:Number,
      pv:String,
      status:Number, //game states array?,
      check:Boolean,
      mate:Boolean,
      stale:Boolean,
      active:Boolean,
      winner:Boolean // true if client is winner
  }
  , playerToMove:{type:Boolean,index:true}
  , computingPositions:{}
  , computing:{type:Boolean,index:true}
  , gameOptions : {
      startFEN:{type:String,default:"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"}
      ,playerColor:{type:String,default:"w"} //w|b
  }
});

var Position = new Schema({
  fen:{type:String,index:{unique:true}},
  depth:{type:Number,default:0},
  value:Number,
  dateAdded:{type:Date, default: Date.now},
  dateStarted:{type:Date},
  dateResolved:{type:Date},
  nodes:Number,
  time:Number, //taken to compute
  move:String,
  working:{type:Boolean,index:true,default:false},
  resolved:{type:Boolean,index:true,default:false},
  state:{type:String,index:true} //resolved|working|unresolved
});


Game.methods.gameInit = function(cb) {
  var self = this;
  
  this.setFEN(this.gameOptions.startFEN,function(err) {
    if (err) return cb(err);
    self.save(function(err) {
      if (err) return cb(err);
      cb(null,self.gameStatus);
    });
  });
  
};

//player : 1=user, 0=ai
Game.methods.playMove = function(player,move,cb) {
  var self=this;
  
  // Check player is indeed the next move owner
  if (!player==this.playerToMove) return cb('player '+player+' attempring '+move+' : not your turn to play');
  
  console.log("Playing move",move,"on",self._id);
  lib.resolvePosition({fen:self.gameStatus.currentFEN,moves:move},function(err,pos) {
    if (err) return cb(err);
    
    //todo we could only do the resolvePosition call above and remove this one
    self.setFEN(pos.fen,function(err) {
      if (err) return cb(err);
      
      //self.gameStatus.winner = !!player;
      
      self.gameStatus.moves.push(move);
      if (!self.gameStatus.san) self.gameStatus.san = [];
      self.gameStatus.san = self.gameStatus.san.concat(pos.san);
      
      self.save(function(err) {
        if (err) return cb(err);
        
        cb(null,self.gameStatus);
      });
      
    });
    
  });
  
};

Game.methods.setFEN = function(fen,cb) {
  var self = this;
  
  fen = lib.validateFEN(fen);
  
  lib.resolvePosition({fen:fen},function(err,pos) {
    if (err) return cb(err);
    
    var chunks = pos.fen.split(' ');
    self.playerToMove = (chunks[1].charAt(0)==self.gameOptions.playerColor);
    self.gameStatus.depth = parseInt(chunks[5]);
    self.gameStatus.currentFEN = pos.fen;
    
    self.gameStatus.active = pos.active;
    self.gameStatus.stale = pos.stale;
    self.gameStatus.mate = pos.mate;
    self.gameStatus.check = pos.check;
    
    if (!pos.active) {
      self.gameStatus.winner = !self.playerToMove;
    }
    
    cb(null);
    
  });
  
}

Game.methods.dump = function() {
  
  var copy = this.toJSON();
  delete copy.playerSecret;
  delete copy.computingPositions;
  return copy;
  
}

Game.methods.computerPlays = function(engine,timeout,cb) {
  var self = this;
  
  lib.engineMove(engine,{},{timeout:timeout,fen:self.gameStatus.currentFEN},function(err,pos) {
    if (err) return cb(err);
    
    self.playMove(0,pos.move,function(err) {
      if (err) return cb(err);
      
      self.save(function(err) {
        if (err) return cb(err);
        cb(null,pos);
      });
    });
    
  },function(info) {
    if (info.type=="pv") {
      //TODO should we save/transmit that?
      self.gameStatus.pv = e.data;
    }
  });
  
}



exports.Game = mongoose.model('Game',Game);
exports.Position = mongoose.model('Position',Position);
