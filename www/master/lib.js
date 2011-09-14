var localEngine = require("./engine").loadEngine('local');

exports.validateFEN = function(fen) {
  //Validate the FEN syntax quickly (some irregular ones could pass)
  if (!fen || !fen.match(/^([a-z0-9]+\/){7}[a-z0-9]+ (w|b) [a-z-]+ [a-z0-9-]+ [0-9]+ [0-9]+$/i)) {
    fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  }
  return fen;
}

exports.listMoves = function(fen,depth,cb) {
  
  var w = localEngine.makeEngine(function(e) {
    if (!e.type=="moves") return;
    w.stop();
    cb(null,e.data);
  });
  w.post({type: 'getmoves', depth: depth, fen: fen});
 
};

exports.resolvePosition = function(moveOptions,cb) {

  moveOptions.fen = exports.validateFEN(moveOptions.fen);

  var w = localEngine.makeEngine(function(e) {
    if (!e.type=="resolve") return;
    w.stop();
    if (e.status=="ok") {

      cb(null,{
        active:(e.moveOpt > 0),
        stale:(!e.moveOpt && !e.inCheck),
        mate:(!e.moveOpt && e.inCheck),
        check:e.inCheck,
        moveCnt:e.moveOpt,
        san:e.san,
        fen:e.fen
      });
      
    } else {
      cb(e);
    }
  });
  w.post({type:"resolve",data:[moveOptions.moves || false,moveOptions.fen]});
  
};


exports.engineMove = function(engine,engineOptions,moveOptions,callback,infoCallback) {
  
  if (!engineOptions) engineOptions = {};
  if (!moveOptions) moveOptions = {timeout:4000};
  
  var stopEngine=false;
  if (typeof engine=="string") {
    stopEngine=true;
    engine = require('./engine').loadEngine(engine);
    engine.start(engineOptions);
  } else {
    //setOptions? dangerous
  }
  
  var w = engine.makeEngine(function(e) {
    if (e.type=="move") {
      w.stop();
      if (stopEngine) engine.stop();
      callback(null,{move:e.data});
    } else if (e.type=="pv" && infoCallback) {
      infoCallback(e);
    }// else if (e.type=="refresh") {
    
  });
  w.search(moveOptions);
  
};



