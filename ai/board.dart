part of ai;


const EMPTY = 0;
const PAWN = 1;
const KNIGHT = 2;
const BISHOP = 3;
const ROOK = 4;
const QUEEN = 5;
const KING = 6;

const WHITE = true;
const BLACK = false;

var strToPieceType = {
  "p": PAWN,
  "n": KNIGHT,
  "b": BISHOP,
  "r": ROOK,
  "q": QUEEN,
  "k": KING
};

var pieceTypeToStr = ["","p","n","b","r","q","k"];

var knightDeltas = [[1,2],[1,-2],[2,-1],[2,1],[-1,2],[-1,-2],[-2,1],[-2,-1]];
var kingDeltas = [[1,0],[1,1],[1,-1],[0,1],[0,-1],[-1,0],[-1,-1],[-1,1]];


bool _isGeneratingAttackingMoves = false;


class Piece {
  num type;
  bool color; // White = true;
  
  Piece(this.type,this.color);
  
  String toString() {
    var s = pieceTypeToStr[type];
    if (color) s = s.toUpperCase();
    return s;
  }
}


class Move {
  Piece piece;
  Piece capturedPiece;
  bool isCapture = false;
  num row;
  num col;
  num deltarow;
  num deltacol;
  num destrow;
  num destcol;
  num delta;
  bool legal = true;
  
  bool color;
  bool isQueenCastle = false;
  bool isKingCastle = false;
  
  bool isCheck = false;
  bool isCheckmate = false;
  bool isDraw = false;
  
  bool isPromotion = false;
  Piece promotionPiece;
  
  String toString() {
    String txt = "";
    if (isQueenCastle) txt = "Qc";
    if (isKingCastle) txt = "Kc";
    txt = "$piece $row $col $deltarow $deltacol";
    if (!legal) txt.concat(" (illegal)");
    return txt;
  }
  
  Move duplicate() {
    Move m = new Move();
    m.capturedPiece = capturedPiece;
    m.piece = piece;
    m.isCapture = isCapture;
    m.row = row;
    m.col = col;
    m.deltarow = deltarow;
    m.deltacol = deltacol;
    m.destrow = destrow;
    m.destcol = destcol;
    m.delta = delta;
    m.legal = legal;
    
    m.color = color;
    m.isQueenCastle = isQueenCastle;
    m.isKingCastle = isKingCastle;
    
    m.isCheck = isCheck;
    m.isCheckmate = isCheckmate;
    m.isDraw = isDraw;
    
    m.isPromotion = isPromotion;
    m.promotionPiece = promotionPiece;
    
    return m;
  }
  
  fromBoardDelta(Board board, num row, num col, num deltarow, num deltacol) {
    this.row = row;
    this.col = col;
    this.deltarow = deltarow;
    this.deltacol = deltacol;
    this.destrow = row + deltarow;
    this.destcol = col + deltacol;
    
    this.color = board.toMove;
    
    if (destrow<0 || destrow>7 || destcol<0 || destcol>7) {
      this.legal = false;
      return;
    }
    
    var pos = rowcol(row, col);
    var newpos = rowcol(destrow, destcol);
    
    var _piece = board.board[pos];
    
    if (_piece==EMPTY) {
      this.legal = false;
      return;
    }
    
    this.piece = _piece;
    
    if (piece.type==KING && deltacol==-2) {
      isQueenCastle=true;
    }
    if (piece.type==KING && deltacol==2) {
      isKingCastle=true;
    }
    
    
    var targetPiece = board.board[newpos];

    if (targetPiece!=EMPTY) {
      
      //Pawns are blocked by any piece.
      if (piece.type==PAWN && deltacol==0) {
        this.legal = false;
        return;
      }
      
      //Other pieces are blocked by their own
      if (targetPiece.color==piece.color) {
        this.legal = false;
        return;
      }
  
      this.isCapture = true;
      this.capturedPiece = targetPiece;
    }
    
    // Does moving the piece checkmate the king (even if it's the king itself moving)
    if (!_isGeneratingAttackingMoves) {
   
      _isGeneratingAttackingMoves = true;
      
      bool _myColor=board.toMove;
      
      board.MakeMove(this, true);
      
      var kingPos = board.getPiecePositions(KING,_myColor)[0];
      
      var attackingMoves = board.ListAttackingMoves(kingPos[0], kingPos[1], !_myColor);
      
      //Can't be attacked on a way to a castling
      if (piece.type==KING) {
        if (isKingCastle) {
          attackingMoves.addAll(board.ListAttackingMoves(destrow, destcol-1, !_myColor));
          attackingMoves.addAll(board.ListAttackingMoves(destrow, destcol-2, !_myColor));
        }
        if (isQueenCastle) {
          attackingMoves.addAll(board.ListAttackingMoves(destrow, destcol+1, !_myColor));
          attackingMoves.addAll(board.ListAttackingMoves(destrow, destcol+2, !_myColor));
        }
        
      }
      
      //Detect if we'll check
      var myAttackingMoves = board.ListAttackingMoves(kingPos[0], kingPos[1], _myColor);
      for (Move move in myAttackingMoves) {
        if (move.isCapture && move.capturedPiece.type==KING) {
          this.isCheck = true;
        }
      }
      
      //Check if the other side has moves left to do
      var otherMoves = board.GenMoves();
      if (otherMoves.length==0) {
        if (this.isCheck) {
          this.isCheckmate = true;
        } else {
          this.isDraw = true;
        }
      }
      
      board.UnmakeMove(this, true);
      
      _isGeneratingAttackingMoves = false;
      
      if (attackingMoves.length>0) {
        this.legal = false;
        return;
      }
    }
    
  }
}


num rowcol(num row, num col) {
  return row*8+col;
}

class Board {
 
  num ply = 0;
  
  bool toMove;
  
  List canKingCastle = [false, false]; // white, black
  List canQueenCastle = [false, false]; // white, black
  
  var board = new List(256);

  fromFEN(String fen) {
    
    var parts = fen.split(' ');
    
    for (var i = 0; i < 256; i++) board[i] = EMPTY;
    
    List<String> rows = parts[0].split("/");
    
    for (num i = 0; i < rows.length; i++) {
      
        num col = 0;
        
        for (String p in rows[i].split("")) {
          num c = p.charCodeAt(0);
          
          // Numbers are empty spaces
          if (48<c && c<58) {
            col+=c-48;
          } else {
            Piece piece = new Piece(strToPieceType[p.toLowerCase()], p.toLowerCase()!=p);
            this.board[rowcol(i, col)] = piece;
            col++;
          }
        }
    }
    
    toMove = (parts[1] == "w");
    
    if (parts[2].indexOf("k")>=0) this.canKingCastle[1] = true;
    if (parts[2].indexOf("K")>=0) this.canKingCastle[0] = true;
    if (parts[2].indexOf("q")>=0) this.canQueenCastle[1] = true;
    if (parts[2].indexOf("Q")>=0) this.canQueenCastle[0] = true;
    
    
    /*
        
    g_enPassentSquare = -1;
    if (chunks[3].indexOf('-') == -1) {
  var col = chunks[3].charAt(0).charCodeAt() - 'a'.charCodeAt();
  var row = 8 - (chunks[3].charAt(1).charCodeAt() - '0'.charCodeAt());
  g_enPassentSquare = MakeSquare(row, col);
    }

    g_move50 = 0;
    g_inCheck = IsSquareAttackable(g_pieceList[(g_toMove | pieceKing) << 4], them);

    // Checkmate/stalemate
    if (GenerateValidMoves().length == 0) {
        return g_inCheck ? 'Checkmate' : 'Stalemate';
    } 

    */
  }
  
  String getFEN() {
    var parts = <String>["","","","-","0","1"];
    
    var pieces = new List<String>(8);
    for (num row=0;row<8;row++) {
      num emptyCnt = 0;
      for (num col=0;col<8;col++) {
        if (col==0) pieces[row] = "";
        var piece = this.board[rowcol(row,col)];
        if (piece == EMPTY) {
          emptyCnt++;
        } else {
          if (emptyCnt>0) {
            pieces[row] = pieces[row].concat(emptyCnt.toString());
            emptyCnt = 0;
          }
          pieces[row] = pieces[row].concat(piece.toString());
        }
      }
      if (emptyCnt>0) {
        pieces[row] = pieces[row].concat(emptyCnt.toString());
        emptyCnt = 0;
      }
    }
    parts[0] = pieces.join("/");
    
    parts[1] = toMove?"w":"b";
    
    if (this.canKingCastle[0]) parts[2] = parts[2].concat("K");
    if (this.canKingCastle[1]) parts[2] = parts[2].concat("k");
    if (this.canQueenCastle[0]) parts[2] = parts[2].concat("Q");
    if (this.canQueenCastle[1]) parts[2] = parts[2].concat("q");
    
    if (parts[2].length==0) parts[2] = "-";
    
    return parts.join(" ");
  }
  
  getPiecePositions(num type, bool color) {
     var pos = [];
     for (num row=0;row<8;row++) {
       for (num col=0;col<8;col++) {
         var piece = this.board[rowcol(row, col)];
         if (piece!=EMPTY && piece.type==type && piece.color==color) {
           pos.add([row, col]);
         }
       }
     }
     return pos;
  }
     
  String getRepr() {
    String repr = "";
    for (num row=0;row<8;row++) {
      for (num col=0;col<8;col++) {
        var piece = this.board[rowcol(row, col)];
        if (piece==EMPTY) {
          repr = repr.concat("[ ]");
        } else {
          repr = repr.concat("[${piece}]");
        }
        
      }
      repr = repr.concat("\n");
    }
    return repr;
  }
  
  List <Move>ListAttackingMoves(num row, num col, bool fromColor) {
    
    List <Move>attacks = [];
    
    bool _oldToMove = toMove;
    toMove = fromColor;
    
    // We list all the moves and
    // check which ones are attacking this square
    
    var moves = GenMoves();

    for (var m in moves) {
      if (m.destcol==col && m.destrow==row) {
        attacks.add(m);
      }
    }
    
    toMove = _oldToMove;
    
    return attacks;
  }
  
  List <Move>GenMoves() {
    var moves = new List<Move>();
    
    num row = 0;
    num col = 0;
    for (num row = 0;row<8;row++) {
      for (num col = 0;col<8;col++) {
        var piece = board[rowcol(row, col)];
        
        if (piece==EMPTY) continue;
        
        if (piece.color!=toMove) continue;
      
        if (piece.type==PAWN) {
          
          List allowedRowDelta = <num>[piece.color?-1:1];
          
          if ((piece.color && row==6) || (!piece.color && row==1)) {
            if (board[rowcol(row+(piece.color?-1:1),col)]==EMPTY) {
              allowedRowDelta.add(piece.color?-2:2);
            }
            
          }
          
          var isPromotion = (piece.color && row==1) || (!piece.color && row==6);
          
          addToMovesWithPromotion(Move m) {
            if (!isPromotion) {
              moves.add(m);
            } else {
              Move cpy;
              for (var type in [QUEEN, ROOK, BISHOP, KNIGHT]) {
                cpy = m.duplicate();
                cpy.isPromotion=true;
                cpy.promotionPiece = new Piece(type, piece.color);
                moves.add(cpy);
              }
            }
          };
          
          // Non-capturing moves
          for (num delta in allowedRowDelta) {
            Move m = new Move();
            m.fromBoardDelta(this,row,col,delta,0);
            if (m.legal) addToMovesWithPromotion(m);
          }
          
          // Diagonal Capturing moves
          for (var vect in [[piece.color?-1:1,1],[piece.color?-1:1,-1]]) {
            Move m = new Move();
            m.fromBoardDelta(this,row,col,vect[0],vect[1]);
            if (m.legal && m.isCapture) addToMovesWithPromotion(m);
          }
          
          
          //TODO En passant
          
          
        } else {
          
          movesFromVects(List vects, num len) {
            for (var vect in vects) {
              for (num i=0;i<len && row+(i+1)*vect[0]>=0 && row+(i+1) * vect[0]<=7 && col+(i+1) * vect[1]>=0 && col+(i+1) * vect[1]<=7;i++) {
                Move m = new Move();
                m.fromBoardDelta(this,row,col,(i+1) * vect[0],(i+1) * vect[1]);
                //if (!_isGeneratingAttackingMoves) print(m);
                if (m.legal) {
                  moves.add(m);
                  if (m.isCapture) {
                    break;
                  }
                }
                //break only if we are blocked by another piece of same color!
                if (!m.legal) {
                  var _piece = board[rowcol(row+(i+1) * vect[0],col+(i+1) * vect[1])];
                  if (_piece!=EMPTY && _piece.color==toMove) {
                    break;
                  }
                }
              }
            }
          }
          
          if (piece.type==KING) {

            for (var delta in kingDeltas) {
              Move m = new Move();
              m.fromBoardDelta(this,row,col,delta[0],delta[1]);
              if (m.legal) moves.add(m);
            }
            
            num castleRow = (toMove?7:0);
            if (
                row == castleRow && col == 4 &&
                this.canKingCastle[toMove?0:1] &&
                this.board[rowcol(castleRow,5)]==EMPTY &&
                this.board[rowcol(castleRow,6)]==EMPTY &&
                this.board[rowcol(castleRow,7)]!=EMPTY &&
                this.board[rowcol(castleRow,7)].type==ROOK
            ) {
              Move m = new Move();
              m.fromBoardDelta(this, row, col, 0, 2);
              if (m.legal) moves.add(m);
            }
            
            if (
                row == castleRow && col == 4 &&
                this.canQueenCastle[toMove?0:1] &&
                this.board[rowcol(castleRow,1)]==EMPTY &&
                this.board[rowcol(castleRow,2)]==EMPTY &&
                this.board[rowcol(castleRow,3)]==EMPTY &&
                this.board[rowcol(castleRow,0)]!=EMPTY &&
                this.board[rowcol(castleRow,0)].type==ROOK
            ) {
              Move m = new Move();
              m.fromBoardDelta(this, row, col, 0, -2);
              if (m.legal) moves.add(m);
            }
            
          
          } else if (piece.type==KNIGHT) {

            for (var delta in knightDeltas) {
              Move m = new Move();
              m.fromBoardDelta(this,row,col,delta[0],delta[1]);
              if (m.legal) moves.add(m);
            }
            
          } else if (piece.type==BISHOP) {

            movesFromVects([[-1,1],[1,-1],[1,1],[-1,-1]], 8);
            
          } else if (piece.type==ROOK) {

            movesFromVects([[-1,0],[1,0],[0,1],[0,-1]], 8);
            
          } else if (piece.type==QUEEN) {

            movesFromVects([[-1,1],[1,-1],[1,1],[-1,-1],[-1,0],[1,0],[0,1],[0,-1]], 8);
            
          }
          
        }
      }
    }
    //print(moves);
    return moves;
  }
  
  MakeMove(Move move, bool temp) {
    
    if (move.isPromotion) {
      board[rowcol(move.destrow, move.destcol)] = move.promotionPiece;
    } else {
      board[rowcol(move.destrow, move.destcol)] = board[rowcol(move.row, move.col)];
    }
    
    board[rowcol(move.row, move.col)] = EMPTY;
    
    if (move.isKingCastle) {
      // Also move the rook
      board[rowcol(move.destrow, 5)] = board[rowcol(move.destrow, 7)];
      board[rowcol(move.destrow, 7)] = EMPTY;
      canKingCastle[move.color?0:1] = false;
    }
    if (move.isQueenCastle) {
      board[rowcol(move.destrow, 3)] = board[rowcol(move.destrow, 0)];
      board[rowcol(move.destrow, 0)] = EMPTY;
      canQueenCastle[move.color?0:1] = false;
    }
    
    toMove=!toMove;
    
  }
  
  UnmakeMove(Move move, bool temp) {
    
    board[rowcol(move.row, move.col)] = move.piece;
    
    if (move.isCapture) {
      board[rowcol(move.destrow, move.destcol)] = move.capturedPiece;
    } else {
      board[rowcol(move.destrow, move.destcol)] = EMPTY;
    }
    
    if (move.isKingCastle) {
      canKingCastle[move.color?0:1] = true;
      board[rowcol(move.destrow, 7)] = board[rowcol(move.destrow, 5)];
      board[rowcol(move.destrow, 5)] = EMPTY;
      
    }
    if (move.isQueenCastle) {
      canQueenCastle[move.color?0:1] = true;
      board[rowcol(move.destrow, 0)] = board[rowcol(move.destrow, 3)];
      board[rowcol(move.destrow, 3)] = EMPTY;
      
    }
    
    toMove=!toMove;
  }
  
  Perft(num depth) {
    
    var moves = this.GenMoves();
    
    List ret = new List(depth+1);
    //print(moves);
    ret[0] = moves.length;
    for (var i=0;i<depth;i++) ret[i+1] = 0;
    
    if (depth>0) {
      for (var move in moves) {
        if (!move.isCheckmate && !move.isDraw) {
          MakeMove(move,true);
          //print (getRepr());
          //print(this.getFEN());
          var p = Perft(depth-1);
          //print(p);
          for (var i=0;i<depth;i++) {
            ret[i+1] += p[i];
          }
          UnmakeMove(move,true);
        }
      }
    }
    
    return ret;
  }
  
}
