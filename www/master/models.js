var mongoose = require('mongoose'),
    Schema = mongoose.Schema
  , ObjectId = Schema.ObjectId,
  _ = require("underscore")._;

mongoose.connect(process.env.CHESSATHOME_MONGO);

var localEngine = require("./engine").loadEngine('local');

var Game = new Schema({
    playerName     : { type: String, match: /[a-z0-9A-Z-._]/ }
  , playerSecret      : {type:String, match: /[a-z0-9A-Z-]/,index:{ unique: true}}
  , dateStart      : {type:Date, default: Date.now}
  , dateStop      : Date
  , gameStatus    : {
      currentFEN:String,
      moves:[String],
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
  
  this.setFEN(this.gameOptions.startFEN);
  
  console.warn("TEST FEN",self.gameStatus.currentFEN);
  //resolve this FEN further
  var w = localEngine.makeEngine(function(e) {
    if (!e.type=="resolve") return;
    if (e.status=="ok") {

      self.gameStatus.active = (e.moveOpt > 0);
      self.gameStatus.stale = (!e.moveOpt && !e.inCheck);
      self.gameStatus.mate = (!e.moveOpt && e.inCheck);
      self.gameStatus.check = e.inCheck;
      if (!e.moveOpt)
        self.gameStatus.winner = !self.playerToMove;

      cb(null, { active:(e.moveOpt > 0) });
      
    } else {
      cb(e);
    }
  });
  w.post({type:"resolve",data:[false,self.gameStatus.currentFEN]});
  
};

Game.methods.playMove = function(player,move,cb,who) {
  var self=this;
  
  // Check player is indeed the next move owner
  if (!player==this.playerToMove) return cb('player '+player+' attempring '+move+' : not your turn to play');
  
  console.log("Playing move",move,"on",self._id);
  var w = localEngine.makeEngine(function(e) {
    if (!e.type=="resolve") return;
    if (e.status=="ok") {
      self.setFEN(e.fen);

      self.gameStatus.active = (e.moveOpt > 0);
      self.gameStatus.stale = (!e.moveOpt && !e.inCheck);
      self.gameStatus.mate = (!e.moveOpt && e.inCheck);
      self.gameStatus.check = e.inCheck;
      if (!e.moveOpt)
        self.gameStatus.winner = (who == 'user');

      //console.log('STATUS', e, self.gameStatus)

      self.gameStatus.moves.push(move);

      //hack, FEN.depth is not modified
      //if (e.fen.split(' ')[1].charAt(0)=="w") self.gameStatus.depth++;
      cb(null, { active:(e.moveOpt > 0) });
    } else {
      cb(e);
    }
  });
  w.post({type:"resolve",data:[move,self.gameStatus.currentFEN]});
  
};

Game.methods.setFEN = function(fen) {
  var chunks = fen.split(' ');
  this.playerToMove = (chunks[1].charAt(0)==this.gameOptions.playerColor);
  this.gameStatus.depth = parseInt(chunks[5]);
  this.gameStatus.currentFEN = fen;
}

Game.methods.dump = function() {
  
  var copy = this.toJSON();
  delete copy.playerSecret;
  delete copy.computingPositions;
  return copy;
  
}

Game.methods.gotComputerMove = function(move,cb) {
  var self = this;
  
  this.playMove(0,move,function(err, data) {
    if (err) return cb(err);
    self.save(function() {
      console.warn('gt Current FEN:',self.gameStatus.currentFEN);
      cb(null,move);
    });
  }, 'computer');
};

Game.methods.computerPlays = function(engine,timeout,cb) {
  var self = this;
  
  var w = engine.makeEngine(function(e) {
    if (e.type=="pv") {
      self.gameStatus.pv = e.data;
    } else if (e.type=="move") {
      w.terminate(self);
      self.gotComputerMove(e.data,cb);
    } else if (e.type=="refresh") {
      cb(null,e.data);
    }
  });
  w.search(this.gameStatus.currentFEN,timeout,this);
  
}



exports.Game = mongoose.model('Game',Game);
exports.Position = mongoose.model('Position',Position);
