var client = require("./_simpleclient.js").client;

var fs = require("fs");
var _ = require("underscore")._;

exports.runFile = function(filepath,engineOptions,moveOptions,callback) {
  var lines = _.map(fs.readFileSync(filepath, 'utf8').trim().split("\n"),function(line) {
    return parseEPDLine(line);
  });
  
  console.log("PARSED",lines);
  
  var results = {
    "ok":0,
    "nok":[],
    "total":0
  };
  
  var i = 0;
  var next = function() {
    if (i>=lines.length) callback(null,results);
    
    var epd = lines[i];
    
    client.init(function(){

      client.newGame({startFEN:epd.fen,playerColor:epd.otherColor},function(err,fen,status) {
        
        if (epd.fen!=fen) callback("FEN init mismatch : "+epd.fen+"|"+fen);
        
      //First move on init
      },function(err,move,fen,status) {
        
        var san = status.gameStatus.san[status.gameStatus.san.length-1];
        
        var success = 0;
        //There is a best move
        if (epd.bm) {
          if (san==epd.bm) {
            success = 1;
          }
        } else if (epd.am) {
          if (san!=epd.am) {
            success = 1;
          }
        }
        
        if (success==1) {
          results["ok"]++;
        } else {
          results["nok"].push(epd.id || ("#"+(i+1)));
        }
        
        results["total"]++;
        
        console.warn("==========");
        console.warn("RESULT",epd.fen,epd.bm," GOT=>",san);
        console.warn("==========");
        console.warn(results);
        console.warn("==========");
        
        i++;
        next();
      });
    });
    
  };
  next();
}

//http://chessprogramming.wikispaces.com/Extended+Position+Description
var parseEPDLine = function(line) {
  var p = {};
  
  line = line.replace(/;\s*$/,"").trim()
  
  //FEN part
  p.fen = line.split(" ").splice(0,4).join(" ");
  
  p.moveColor = p.fen.split(" ")[1];
  p.otherColor = (p.moveColor=="w"?"b":"w");
  
  p.cmds = line.substring(p.fen.length+1).split("; ");
  
  p.fen+=" 0 100";
  
  p.cmds.forEach(function(cmd) {
    var c = cmd.split(" ")[0];
    p[c]=cmd.substring(c.length+1);
  });
  
  return p;
}