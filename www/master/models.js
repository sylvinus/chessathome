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
  , working:{type:Boolean,index:true}
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
  secret:String,
  nodes:Number,
  time:Number, //taken to compute
  move:String,
  children:{},
  working:{type:Boolean,index:true,default:false},
  resolved:{type:Boolean,index:true,default:false},
  state:{type:String,index:true,default:"unresolved"} //resolved|working|unresolved|root
});


Position.methods.findChildren = function(cb) {
  var self = this;
  
  //Are they already saved?
  if (_.size(this.children)) {
    cb(null);
  } else {
    lib.listMoves(self.fen,1,function(err,moves) {
      if (err) return cb(err);
      
      var movefens = _.pluck(moves,1);

      var treefens = {};
      moves.forEach(function(m) {
        if (treefens[m[1]]) {
          treefens[m[1]].push(m[0]);
        } else {
          treefens[m[1]] = [m[0]];
        }
      });
      
      self.children = treefens;
      
      cb(null);
    });
  }
}

Position.methods.insertChildren = function(cb,forceInsert) {
  var self = this;
  
  if (!_.size(self.children)) return cb(null);
  
  exports.Position.find({fen:{"$in":_.keys(self.children)}},function(err,docs) {
    if (err) docs = [];
    
    var alreadyInDb = _.pluck(docs,"fen");
    
    _.keys(self.children).forEach(function(data) {
      if (alreadyInDb.indexOf(data)==-1) {
        var p = new exports.Position();
        p.secret = Math.random();
        p.fen = data;
        p.save();
      } else if (forceInsert) {
        var p = docs[alreadyInDb.indexOf(data)];
        p.resolved=false;
      }
    });
    
    cb(null);
    
  });
  
  
  
}

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

Game.methods.computerPlays = function(engine,moveOptions,cb) {
  var self = this;
  
  moveOptions.fen = self.gameStatus.currentFEN;
  
  self.working=true;
  
  self.save(function(err) {
    
    if (err) return cb(err);
    lib.engineMove(engine,{},moveOptions,function(err,pos) {
      if (err) return cb(err);

      self.computerFoundBestMove(pos,cb);
      
    },function(info) {
      if (info.type=="pv") {
        //TODO should we save/transmit that?
        self.gameStatus.pv = e.data;
      }
    });
  });
  
};

Game.methods.computerFoundBestMove = function(pos,cb) {
  var self = this;
  
  // Avoid double calls when both the direct computerPlays() call and the onActivity watcher
  // are both active (i.e. when the client hasn't disconnected during a compute)
  if (!self.working) return cb(null,pos);
  
  self.working=false;

  self.playMove(0,pos.move,function(err) {
    if (err) return cb(err);

    self.save(function(err) {
      if (err) return cb(err);
      cb(null,pos);
    });
  });
  
};



exports.Game = mongoose.model('Game',Game);
exports.Position = mongoose.model('Position',Position);
