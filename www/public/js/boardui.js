var g_startOffset;
var g_moveNumber = 1;
var g_lastMove = null;
var g_playerWhite = true;
var g_changingFen = false;
var g_current = null;
var g_cellSize;
var g_toMove;

var scrollElem;

var UI_timeout = null;


// Init UI Bindings & stuff
function UILoaded() {

  $('#newgameform').submit(function(event) {
    event.preventDefault();
    g_playerWhite = ($('#chessPlayerColor').val() == 'white');
    UINewGame($('#chessPlayerName').val(),$('#chessStartPos').val());
    $('#chessStartPos').val('Standard');
    $('#newgamebox').fadeOut();
    $('#stopgame').fadeIn();
  });

  $('#resume').click(function(){
    $('#newgamebox').fadeOut();
  });

  $('#restartgame').click(function(){
    $('#newgamebox').fadeIn();
    $('#restartgame').fadeOut();
    UIEndGame(false);

  });

  // use the first element that is "scrollable"
  function scrollableElement(els) {
    for (var i = 0, argLength = arguments.length; i <argLength; i++) {
      var el = arguments[i],
      $scrollElement = $(el);
      if ($scrollElement.scrollTop()> 0) {
        return el;
      } else {
        $scrollElement.scrollTop(1);
        var isScrollable = $scrollElement.scrollTop()> 0;
        $scrollElement.scrollTop(0);
        if (isScrollable) {
          return el;
        }
      }
    }
    return [];
  }

  scrollElem = scrollableElement('html', 'body');

  $('#stopgame').click(function(event) {
    $.cookie('playerSecret', null);
    UIHideBoard();
  });

  $('#no').click(function(event) {
    event.preventDefault();
    $(scrollElem).animate({scrollTop: $('#participate').offset().top}, 300, function() {
      location.hash = '#participate';
    });
  });

  $('#yes').click(function(event) {
    if (/msie/i.test(navigator.userAgent)) {
      alert("You seem to be using Internet Explorer. As this is a beta version, you currently need browsers like Google Chrome or Mozilla Firefox to be able to play a game. Check back very soon for more browser compatibility!");
      return;
    }
    $('#newgamebox').fadeIn();
    UIShowBoard();
  });
}



function UIComputeLoader(status) {
  $('#loader').css({ display: !status ? 'none' : 'block' });
}

function reloadPage() {
  window.location.href = unescape(window.location.pathname);
  UI_timeout = null;
}

// Makes the board appear
function UIShowBoard() {

  $('#game').animate({'height':'550px'}, function() {
    UIInit();
    $(scrollElem).animate({scrollTop: $('#game').offset().top},function() {
      $("#chessPlayerName").focus();
    });
  });
  
}

// Hides the board
function UIHideBoard() {
  $('#game').animate({'height':'0px'}, function() {
    
  });
}



function UIInit() {
  RedrawBoard();
}

// Server sent an update
function ServerUpdate(data) {
  console.log('Server:', data);

  if (UI_timeout) {
    clearTimeout(UI_timeout);
    UI_timeout = null;
  }

  UIComputeLoader(false);

  var cFEN = GetFen();
  if (g_lastMove || data.gameStatus.currentFEN != cFEN) {

    // Resuming game from scratch
    if (!g_lastMove) {

      console.warn('RESUME', data.gameOptions.playerColor);

      g_playerWhite = (data.gameOptions.playerColor == 'w');


      //EnsureAnalysisStopped();
      ResetGame();
      InitializeFromFen(data.gameStatus.currentFEN);
      g_playerWhite = data.gameOptions.playerColor;
      RedrawBoard();


      $('#stopgame').fadeIn();
      $('#newgamebox').css({ display:'none' });
      
      UIShowBoard();
      console.warn("show board");

      for (var i = 0; i < data.gameStatus.moves.length; i++)
        UIAddMove(data.gameStatus.moves[i]);

    }

    // New move
    else {

      console.log('ELSE');
      InitializeFromFen(data.gameStatus.currentFEN);
      var move = data.gameStatus.moves[data.gameStatus.moves.length - 1];

      if (data.gameStatus.currentFEN != cFEN) {
        movePawn(move.substr(0, 2), move.substr(2, 4));
        UIAddMove(null, move);
      }

    }

    if (!data.gameStatus.active) {
      UIEndGame(true, data.gameStatus);
      return;
    }


    //computer to play
    if (data.gameStatus.playerToMove === false) {
      UIComputeLoader(true);
    }


  }
  
}

function getSquare(x, y) {
  return String.fromCharCode('a'.charCodeAt(0) + x) + (8 - y);
}

function UIAddMove(move, txt) {
  if (txt) {
    $box = $('#chessPgn');
    $box.val($box.val() +' '+ txt);
    //$box.val($box.val() +' '+ ((g_toMove != 0) ? (g_moveNumber +'. ') : '') + txt)
  }
}

function UINewGame(playerName,startPosition) {

  if (!playerName) {
    //alert("You must give a name!");
    return;
  }

  console.log('UINewGame');
  
  UIComputeLoader(false);

  g_moveNumber = 1;
  g_lastMove = null;

  ResetGame();

  $('#chessPgn').val('');

  
  console.warn('UINewGame', playerName, g_playerWhite);
  RedrawBoard();
  API.newGame(playerName, { playerColor:(g_playerWhite ? 'w' : 'b'),startFEN:startPosition });

  //TODO when startFEN is a black pos & playerColor=black
  if (!g_playerWhite)
    UIComputeLoader(true);
}


function UpdatePVDisplay(pv) {
  if (pv != null) {
    var outputDiv = document.getElementById("output");
    if (outputDiv.firstChild != null) {
      outputDiv.removeChild(outputDiv.firstChild);
    }
    outputDiv.appendChild(document.createTextNode(pv));
  }
}


function movePawnComplete($el, $to) {
  function __out() {
    $el.css({top:0, left:0}).appendTo($to);
    // In case there are some iconsistencies
    RedrawBoard();
  }
  var toImg = $to.find('img');
  if (toImg.length) {
    toImg = $(toImg);
    toImg.fadeOut(200, function() { toImg.remove(); __out(); });
  } else __out();
};


function movePawn(from, to) {
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

function doMove(move, txt) {
  g_lastMove = txt;

  API.playMove(FormatMove(move));

  // Reload if stuck after 60s !
  if (UI_timeout) clearTimeout(UI_timeout);
  UI_timeout = setTimeout('reloadPage()',  60 * 1000);

  UIComputeLoader(true);

  UIAddMove(null, txt);

  MakeMove(move);


  // To remove eventually ?
  $('#chessFEN').val(GetFen());
}


function UIEndGame(finished, gstatus) {
  if (finished) {
    $("#won, #lost, #stale").hide();
    if (gstatus.mate) {
      $(gstatus.winner ? '#won' : '#lost').show();
    } else if (gstatus.stale) {
      $('#stale').show();
    }
    $("#stopgame").hide();
    $("#restartgame").show();
    $('#endGame').fadeIn();

  } else {
    $("#stopgame").show();
    $("#restartgame").hide();
    $('#endGame').fadeOut();
    $('#endGame div').css({ display:'none' });
  }
}


function RedrawBoard() {
  console.warn('Redraw');

  var div = $("#board")[0];
  $("#board").empty();

  var table = document.createElement("table");
  table.cellPadding = "0px";
  table.cellSpacing = "0px";

  var tbody = document.createElement("tbody");

  for (y = 0; y < 8; ++y) {
    var tr = document.createElement("tr");

    for (x = 0; x < 8; ++x) {
      var td = document.createElement("td")
        , $td = $(td);

      $(td).attr({ id: getSquare(x, y) });

      var pieceY = y;
      var piece = g_board[((pieceY + 2) * 0x10) + x + 4];
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


        $(img).draggable({
          start: function (e, ui) {
            g_startOffset = new Object();
            g_startOffset.left = e.pageX - $(table).offset().left;
            g_startOffset.top = e.pageY - $(table).offset().top;
          }
        });
      }

      $(td).addClass((y ^ x) & 1 ? 'squareOdd' : 'squareEven');
      tr.appendChild(td);
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


      var moves = GenerateValidMoves()
        , move = null;
      for (var i = 0; i < moves.length; i++) {
        if ((moves[i] & 0xFF) == MakeSquare(start.y, start.x) && ((moves[i] >> 8) & 0xFF) == MakeSquare(end.y, end.x)) {
          move = moves[i];
        }
      }

      var img = ui.helper.get(0);
      img.style.left = 0;
      img.style.top = 0;

      if (move != null) {
        var moveSeq = FormatMove(move)
          , $from = $('#'+ moveSeq.substr(0, 2))
          , $to = $('#'+ moveSeq.substr(2, 4))
          , $el = $($from.find('img'));

        doMove(move, FormatMove(move));
        movePawnComplete($el, $to);
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

    var tS = { y:start.y, x:start.x };
    //var tS = (!g_playerWhite) ? { y:(7 - start.y), x:(7 - start.x) } : { y:y, x:x };

    var moves = GenerateValidMoves()
      , list = [];

    for (var i = 0; i < moves.length; i++) {
      for (var x = 0; x < 8; x++) {
        for (var y = 0; y < 8; y++) {
          var t = { x:x, y:y };

          if ((moves[i] & 0xFF) == MakeSquare(tS.y, tS.x) && ((moves[i] >> 8) & 0xFF) == MakeSquare(t.y, t.x)) {
            console.log(JSON.stringify({ x:x, y:y, move:moves[i], moveSeq:getSquare(start.x, start.y) + getSquare(x, y)}));
            list.push({ x:x, y:y, move:moves[i], moveSeq:getSquare(start.x, start.y) + getSquare(x, y) });
          }
        }
      }
    }

    console.log('LIST', list);

    g_current = { square: getSquare(start.x, start.y), moves:[] };
    if (list.length) {
      g_current.moves = list;
    }

    for (var i = 0; i < list.length; i++) {
      var elem = list[i]
        , $tr = $($(table).find('tr')[elem.y])
        , $td = $($tr.find('td')[elem.x]);
      $td.addClass('possibleMove');
    }
  }

  $(table).click(function (e) {
    var inside = false;

    var name = $(e.target).attr('src');
    console.log('name', $(e.target), name)
    if (g_current) {
      var $target = $(e.target);
      $target = $target.is('img') ? $target.parent() : $target;

      var move = g_current.square + $target.attr('id');
      for (var i = 0; i < g_current.moves.length; i++) {
        console.log(g_current.moves[i].moveSeq, move);
        if (g_current.moves[i].moveSeq == move) {
          inside = i;
          break ;
        }
      }
      if (inside !== false) {
        move = g_current.moves[inside].move;
        var moveSeq = g_current.moves[inside].moveSeq;
        console.warn(move, moveSeq);
        doMove(move, moveSeq);
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
  $('#chessFEN').val(GetFen());
  g_changingFen = false;
}


/* Worker counter */
$(function() {
  var refreshSwarmCounter = function() {
    $.ajax("/stats/simple",{
      dataType:"json",
      success:function(data) {
        $(".globalSwarmCounter").text(data.numWorkers+2); //We have at least 2 bg workers
      }
    });
  };
  setInterval(refreshSwarmCounter,20000);
});
