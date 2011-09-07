var g_startOffset;
var moveNumber = 1;

var g_lastMove = null;
var g_playerWhite = true;
var g_changingFen = false;
var g_analyzing = false;

var g_current = null;

var g_cellSize;


function UINewGame() {
  moveNumber = 1;

  EnsureAnalysisStopped();
  ResetGame();
  RedrawBoard();
  var pgnTextBox = document.getElementById("chessPgn");
  pgnTextBox.value = "";

  if (InitializeBackgroundEngine()) {
    g_backgroundEngine.postMessage({ type:'go' });
  }
  g_lastMove = null;
  g_playerWhite = true;

  if (!g_playerWhite) {
    SearchAndRedraw();
  } else {
    console.error('UINewGame')
    RedrawBoard();
  }
}

function EnsureAnalysisStopped() {
  if (g_analyzing && g_backgroundEngine != null) {
    g_backgroundEngine.terminate();
    g_backgroundEngine = null;
  }
}

function UIAnalyzeToggle() {
  if (InitializeBackgroundEngine()) {
    if (!g_analyzing) {
      g_backgroundEngine.postMessage({ type:'analyze' });
    } else {
      EnsureAnalysisStopped();
    }
    g_analyzing = !g_analyzing;
    document.getElementById("AnalysisToggleLink").innerText = g_analyzing ? "Analysis: On" : "Analysis: Off";
  } else {
    throw ("Your browser must support web workers for analysis - (chrome4, ff4, safari)");
  }
}

function UIChangeFEN() {
  if (!g_changingFen) {
    var fenTextBox = document.getElementById("FenTextBox");
    InitializeFromFen(fenTextBox.value);
    EnsureAnalysisStopped();
    if (InitializeBackgroundEngine()) {
      g_backgroundEngine.postMessage({ type:'go' });
      g_backgroundEngine.postMessage({ type:'position', data:GetFen() });
    }
    g_playerWhite = !!g_toMove;
    RedrawBoard();
  }
}

function UIChangeStartPlayer() {
  g_playerWhite = !g_playerWhite;
  RedrawBoard();
}

function UpdatePgnTextBox(move) {
  var pgnTextBox = document.getElementById("chessPgn");
  if (g_toMove != 0) {
    pgnTextBox.value += moveNumber + ". ";
    moveNumber++;
  }
  pgnTextBox.value += GetMoveSAN(move) + " ";
  console.log(GetMoveSAN(move) + " ");
}

function UIChangeTimePerMove() {
}

function FinishMove(bestMove, value, timeTaken, ply) {
  if (bestMove != null) {
    UIPlayMove(bestMove, BuildPVMessage(bestMove, value, timeTaken, ply));
  }
  else {
    throw ("Checkmate!");
  }
}

function UIPlayMove(move, pv) {
  UpdatePgnTextBox(move);

  g_lastMove = move;
  MakeMove(move);

  UpdatePVDisplay(pv);
}

function UpdatePVDisplay(pv) {
  if (pv != null) {
  }
}

// Send move & get new one
function SearchAndRedraw() {
  if (g_analyzing) {
    EnsureAnalysisStopped();
    InitializeBackgroundEngine();
    g_backgroundEngine.postMessage({ type:'position', data:GetFen() });
    g_backgroundEngine.postMessage({ type:'analyze' });
    return;
  }

  if (InitializeBackgroundEngine()) {
    if (g_lastMove != null) {
      g_backgroundEngine.postMessage({ type:'move', data:FormatMove(g_lastMove) });
    }
    g_backgroundEngine.postMessage({ type:'search', data:g_timeout });
  } else {
    console.error('HERE')
    Search(FinishMove, 99, null);
  }
  setTimeout("RedrawBoard()", 100);
}

var g_backgroundEngineValid = true;
var g_backgroundEngine;

function InitializeBackgroundEngine() {
  if (!g_backgroundEngineValid) {
    return false;
  }

  if (g_backgroundEngine == null) {
    g_backgroundEngineValid = true;
    try {
      g_backgroundEngine = new Worker("/engine.js");	
      g_backgroundEngine.post = function(e) {
        if (VERBOSE) console.warn("  <= ",e);
        w.postMessage({ type:'move', data:e });
      }
      g_backgroundEngine.onmessage = function (e) {
        e = e.data;
        console.log('gotmessage', e);
        if (e.type == 'pv') {
          UpdatePVDisplay(e.data);
        } else {
          console.error('InitializeBackgroundEngine()')
          UIPlayMove(GetMoveFromString(e.data), null);
          
          console.warn(e)
          var move = e.data;
          movePawn(move.substr(0, 2), move.substr(2, 4));
          //RedrawBoard();
        }
      }
      g_backgroundEngine.error = function (e) {
        throw ("Error from background worker:" + e.message);
      }
    } catch (error) {
      g_backgroundEngineValid = false;
    }
  }
  return g_backgroundEngineValid;
}


function movePawnComplete($el, $to) {
  function __out() {
    $el.css({top:0, left:0}).appendTo($to);
    // In case there are some iconsistencies
    InitializeFromFen(GetFen());
    RedrawBoard();
  }
  var toImg = $to.find('img');
  if (toImg.length) {
    toImg = $(toImg);
    toImg.fadeOut(200, function() { toImg.remove(); __out(); });
  } else __out()
}

function movePawn(from, to) {

  console.error('FEN', GetFen())


  var $from = $('#'+ from)
    , OF = $from.offset()
    , $to = $('#'+ to)
    , OT = $to.offset()
    , $el = $($from.find('img'));

  var xd = OF.left < OT.left ? (OT.left - OF.left) : -(OF.left - OT.left);
  var yd = OF.top > OT.top ? -(OF.top - OT.top) : (OT.top - OF.top);
  $el.animate({
    top: (((yd > 0) ? '+':'-')+ '='+ Math.abs(yd) +'px')
   ,left:(((xd > 0) ? '+':'-')+ '='+ Math.abs(xd) +'px')
   }, {
     duration: 300
   , complete: function() { movePawnComplete($el, $to); }
   });
}

function getSquare(x, y) {
  return String.fromCharCode('a'.charCodeAt(0) + x) + (8 - y);
}


function RedrawBoard() {
  var div = $("#board")[0];
  $("#board").empty();

  var table = document.createElement("table");
  table.cellPadding = "0px";
  table.cellSpacing = "0px";

  var tbody = document.createElement("tbody");

  var guiTable = new Array();

  for (y = 0; y < 8; ++y) {
    var tr = document.createElement("tr");

    for (x = 0; x < 8; ++x) {
      var td = document.createElement("td")
        , $td = $(td);

      $(td).attr({ id: String.fromCharCode('a'.charCodeAt(0) + x) + (8 - y) });

      var pieceY = g_playerWhite ? y : 7 - y;
      var piece = g_board[((pieceY + 2) * 0x10) + (g_playerWhite ? x : 7 - x) + 4];
      var pieceName = null;
      switch (piece & 0x7) {
        case g_piecePawn:   pieceName = "pawn";   break;
        case g_pieceKnight: pieceName = "knight"; break;
        case g_pieceBishop: pieceName = "bishop"; break;
        case g_pieceRook:   pieceName = "rook";   break;
        case g_pieceQueen:  pieceName = "queen";  break;
        case g_pieceKing:   pieceName = "king";   break;
      }
      if (pieceName != null)
        pieceName += "_"+ ((piece & 0x8) ? "white" : "black") +".png";

      if (pieceName != null) {
        var img = document.createElement("img");
        img.src = "img/" + pieceName;
        td.appendChild(img);

        $(img).draggable({ start: function (e, ui) {
          g_startOffset = new Object();
          g_startOffset.left = e.pageX - $(table).offset().left;
          g_startOffset.top = e.pageY - $(table).offset().top;
        }
        });
      }

      $(td).addClass((y ^ x) & 1 ? 'squareOdd' : 'squareEven')
      tr.appendChild(td);
      guiTable[y * 8 + x] = td;
    }

    tbody.appendChild(tr);
  }

  table.appendChild(tbody);







  // -------------------------------------------------------------------------
  // Drag & drop pawn

  $(table).droppable({

    drop: function (e, ui) {
      hidePossibleMove();

      // TODO: this may be buggy?
      var end = { x:e.pageX - $(table).offset().left, y:e.pageY - $(table).offset().top }
        , start = { x:Math.floor(g_startOffset.left / g_cellSize), y: Math.floor(g_startOffset.top / g_cellSize) };
      end = { x:Math.floor(end.x / g_cellSize), y:Math.floor(end.y / g_cellSize) };

      if (!g_playerWhite) {
        start = { x: 7 - start.x, y: 7 - start.y }
        end = { x: 7 - end.x, y: 7 - end.y }
      }

      var moves = GenerateValidMoves()
        , move = null;
      for (var i = 0; i < moves.length; i++)
        if ((moves[i] & 0xFF) == MakeSquare(start.y, start.x) && ((moves[i] >> 8) & 0xFF) == MakeSquare(end.y, end.x))
          move = moves[i];

      if (!g_playerWhite) {
        start = { x: 7 - start.x, y: 7 - start.y }
        end = { x: 7 - end.x, y: 7 - end.y }
      }

      var img = ui.helper.get(0);
      img.style.left = 0;
      img.style.top = 0;

      if (move != null) {
        UpdatePgnTextBox(move);

        console.warn('MOVE', move, FormatMove(move))
        g_lastMove = move;
        MakeMove(move);
        img.parentNode.removeChild(img);

        if (g_board[(move >> 8) & 0xFF] != 0)
          $(guiTable[end.y * 8 + end.x]).empty();

        guiTable[end.y * 8 + end.x].appendChild(img);

        console.log('FEN', GetFen())

        setTimeout("SearchAndRedraw()", 0);
      }
    }
    , activate: function (e) {
        hidePossibleMove();
        showPossibleMove(e);
      }
  });



  // -------------------------------------------------------------------------
  // Show possible moves


  function hidePossibleMove() {
    $(table).find('td').each(function(idx, el) { $(el).removeClass('possibleMove') ;});
    g_current = null;
  }

  function showPossibleMove(e) {
    var start = { x:e.pageX - $(table).offset().left, y: e.pageY - $(table).offset().top };
    start = { x:Math.floor(start.x / g_cellSize), y:Math.floor(start.y / g_cellSize) };

    if (!g_playerWhite)
      start = { y:(7 - start.y), x:(7 - start.x) };

    var moves = GenerateValidMoves()
      , list = [];

    for (var i = 0; i < moves.length; i++)
      for (var x = 0; x < 8; x++)
        for (var y = 0; y < 8; y++)
          if ((moves[i] & 0xFF) == MakeSquare(start.y, start.x) && ((moves[i] >> 8) & 0xFF) == MakeSquare(y, x))
            list.push({ x:x, y:y, move:moves[i], moveSeq:FormatMove(moves[i]) });

    g_current = { square: getSquare(start.x, start.y), moves:[] }
    if (list.length)
      g_current.moves = list;

    for (var i = 0; i < list.length; i++) {
      var elem = list[i]
        , $tr = $($(table).find('tr')[elem.y])
        , $td = $($tr.find('td')[elem.x]);
      $td.addClass('possibleMove');
    }
  }



  $(table).click(function (e) {
    var inside = false;
    if (g_current) {
      var $target = $(e.target);
      $target = $target.is('img') ? $target.parent() : $target;

      var move = g_current.square + $target.attr('id');
      for (var i = 0; i < g_current.moves.length; i++) {
        if (g_current.moves[i].moveSeq == move) {
          inside = i;
          break ;
        }
      }
      if (inside !== false) {
        move = g_current.moves[inside].move;
        var moveSeq = g_current.moves[inside].moveSeq;
        console.warn(move, moveSeq)

      if (move != null) {
        UpdatePgnTextBox(move);

        console.warn('MOVE', move, FormatMove(move))
        g_lastMove = move;
        MakeMove(move);
        setTimeout("SearchAndRedraw()", 0);
      }

        movePawn(moveSeq.substr(0, 2), moveSeq.substr(2, 4));
        hidePossibleMove();
      }
    }
    if (!inside) {
      hidePossibleMove();
      showPossibleMove(e);
    }
  });




  div.appendChild(table);

  g_cellSize = $(table).find('td').first().outerHeight();

  g_changingFen = true;
  //document.getElementById("chessFen").value = GetFen();
  g_changingFen = false;
}
