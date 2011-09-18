
onmessage = function (e) {
    
    // onmessage is disabled in UI board mode because of conflicts with the google +1 button
    if (typeof UI_ENGINE_MODE!="undefined" && UI_ENGINE_MODE=="board") {
      return;
    }
    
    e = e.data;
    if (e.type == 'go' || g_needsReset) {
        ResetGame();
        g_needsReset = false;
        if (e.type == 'go') return;
    }
    // Position
    if (e.type == 'position') {

        ResetGame();
        InitializeFromFen(e.data);
    }

    // Resolve
    // move + FEN = FEN
    else if (e.type == 'resolve') {
      
        var mv = e.data;
        ResetGame();
        InitializeFromFen(mv[1]);

        if (!mv[0]) {
          postMessage({
            type:'resolve'
          , status:'ok'
          , fen:GetFen()
          , moveOpt:GenerateValidMoves().length
          , inCheck:g_inCheck
          });
          return;
        }

        try {

          var moves = mv[0];
          var san = [];
          if (typeof mv[0]=="string") {
            moves = [mv[0]];
          }

          var valid = true;
          moves.forEach(function(move) {
            san.push(GetMoveSAN(GetMoveFromString(move)));
            valid = valid && MakeMove(GetMoveFromString(move));
          });
          
          if (valid) {
            postMessage({
              type:'resolve'
            , san:san
            , status:'ok'
            , fen:GetFen()
            , moveOpt:GenerateValidMoves().length
            , inCheck:g_inCheck
            });
          } else {
            throw new Exception('Coulnt makemove');
          }
          
        } catch (e) {
        
          postMessage({
            type:'resolve'
          , status:'nok'
          , message:e
          
          });
        }
        
    }
    // Search
    else if (e.type == "search") {
      
        g_timeout = parseInt(e.data, 10);
        Search(FinishMoveLocalTesting, 99, FinishPlyCallback);
    }
    // Analyze
    else if (e.type == "analyze") {
        g_timeout = 99999999999;
        Search(null, 99, FinishPlyCallback);
    }
    // Ping
    else if (e.type == 'ping') {
        postMessage({ type:'pong' });
    }
    // Pong
    else if (e.type == 'perft') {
        postMessage({ type:'perft', data:Perft(e.data) });
    }

    // GetMoves
    else if (e.type == "getmoves") {

      if (!e.fen) {
        return;
      }

      ResetGame();
      InitializeFromFen(e.fen);

      var result = [];

      function __moves(stack,max, depth) {
        depth = depth === undefined ? max : depth;

        var moves = [];
        GenerateCaptureMoves(moves, null);
        GenerateAllMoves(moves);
        --depth;
        for (var i = 0; i < moves.length; i++) {
          if (!MakeMove(moves[i])) {
            continue;
          }
          var newstack = stack.concat(FormatMove(moves[i]));
          if (!depth)
            result.push([newstack,GetFen()]);
          else
            __moves(newstack,max, depth);
          UnmakeMove(moves[i]);
        }
        return ;
      }
      __moves([],e.depth);

      postMessage({ type:'moves', data:result });
    }


    else if (e.type == 'move') {
      MakeMove(GetMoveFromString(e.data));
    }
    else if (e.type) throw e;
    //else throw e; // Strange messages...
}



function FinishPlyCallback(bestMove, value, timeTaken, ply) {
    postMessage({ type:'pv', data:BuildPVMessage(bestMove, value, timeTaken, ply), bestMove:bestMove });
}

function FinishMoveLocalTesting(bestMove, value, timeTaken, ply) {
  if (bestMove != null && bestMove != 0) {
    
    //must be made before MakeMove
    var san = GetMoveSAN(bestMove);
    
    MakeMove(bestMove);

    postMessage({ type:'move', data:FormatMove(bestMove),san:san, value:value, ply:ply}); //,totalNodes:totalNodes 
  } else {
    postMessage({ type:'move', data:bestMove,san:"", value:value, ply:ply}); //,totalNodes:totalNodes 
  }
  //Y U NO WORK?
  //var pv = PVFromHash(bestMove,15);
}



if (typeof module !== 'undefined' && module.exports) {
  exports.onmessage = onmessage;
  exports.setCallback = function(cb) {
    postMessage = cb;
  }
}
