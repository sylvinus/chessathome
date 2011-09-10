
// Perf TODO:
// Merge material updating with psq values
// Put move scoring inline in generator
// Remove need for fliptable in psq tables.  Access them by color
// Optimize pawn move generation

// Non-perf todo:
// Checks in first q?
// Pawn eval.
// Better king evaluation
// Better move sorting in PV nodes (especially root)


function GetFen(){
    var result = "";
    for (var row = 0; row < 8; row++) {
        if (row != 0) 
            result += '/';
        var empty = 0;
        for (var col = 0; col < 8; col++) {
            var piece = g_board[((row + 2) << 4) + col + 4];
            if (piece == 0) {
                empty++;
            }
            else {
                if (empty != 0) 
                    result += empty;
                empty = 0;
                
                var pieceChar = [" ", "p", "n", "b", "r", "q", "k", " "][(piece & 0x7)];
                result += ((piece & g_colorWhite) != 0) ? pieceChar.toUpperCase() : pieceChar;
            }
        }
        if (empty != 0) {
            result += empty;
        }
    }
    
    result += g_toMove == g_colorWhite ? " w" : " b";
    result += " ";
    if (g_castleRights == 0) {
        result += "-";
    }
    else {
        if ((g_castleRights & 1) != 0) 
            result += "K";
        if ((g_castleRights & 2) != 0) 
            result += "Q";
        if ((g_castleRights & 4) != 0) 
            result += "k";
        if ((g_castleRights & 8) != 0) 
            result += "q";
    }
    
    result += " ";
    
    if (g_enPassentSquare == -1) {
        result += '-';
    }
    else {
        result += FormatSquare(g_enPassentSquare);
    }
    
    //g_move50 seems to have a bug: it counts from 1.
    result+=" "+Math.max(0,g_move50-1);
    
    result+=" "+(Math.ceil((g_moveCount+1)/2));
    //postMessage({"type":"GETFEN",data:[result,g_move50,g_moveCount]});
    return result;
}

function GetMoveSAN(move, validMoves) {
	var from = move & 0xFF;
	var to = (move >> 8) & 0xFF;
	
	if (move & g_moveflagCastleKing) return "O-O";
	if (move & g_moveflagCastleQueen) return "O-O-O";
	
	var pieceType = g_board[from] & 0x7;
	var result = ["", "", "N", "B", "R", "Q", "K", ""][pieceType];
	
	var dupe = false, rowDiff = true, colDiff = true;
	if (validMoves == null) {
		validMoves = GenerateValidMoves();
	}
	for (var i = 0; i < validMoves.length; i++) {
		var moveFrom = validMoves[i] & 0xFF;
		var moveTo = (validMoves[i] >> 8) & 0xFF; 
		if (moveFrom != from &&
			moveTo == to &&
			(g_board[moveFrom] & 0x7) == pieceType) {
			dupe = true;
			if ((moveFrom & 0xF0) == (from & 0xF0)) {
				rowDiff = false;
			}
			if ((moveFrom & 0x0F) == (from & 0x0F)) {
				colDiff = false;
			}
		}
	}
	
	if (dupe) {
		if (colDiff) {
			result += FormatSquare(from).charAt(0);
		} else if (rowDiff) {
			result += FormatSquare(from).charAt(1);
		} else {
			result += FormatSquare(from);
		}
	} else if (pieceType == g_piecePawn && (g_board[to] != 0 || (move & g_moveflagEPC))) {
		result += FormatSquare(from).charAt(0);
	}
	
	if (g_board[to] != 0 || (move & g_moveflagEPC)) {
		result += "x";
	}
	
	result += FormatSquare(to);
	
	if (move & g_moveflagPromotion) {
		if (move & g_moveflagPromoteBishop) result += "=B";
		else if (move & g_moveflagPromoteKnight) result += "=N";
		else if (move & g_moveflagPromoteQueen) result += "=Q";
		else result += "=R";
	}
	
	MakeMove(move);
	if (g_inCheck) {
	    result += GenerateValidMoves().length == 0 ? "#" : "+";
	}
	UnmakeMove(move);
	
	return result;
}

function FormatSquare(square) {
    var letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    return letters[(square & 0xF) - 4] + ((9 - (square >> 4)) + 1);
}

function FormatMove(move) {
    var result = FormatSquare(move & 0xFF) + FormatSquare((move >> 8) & 0xFF);
    if (move & g_moveflagPromotion) {
        if (move & g_moveflagPromoteBishop) result += "b";
        else if (move & g_moveflagPromoteKnight) result += "n";
        else if (move & g_moveflagPromoteQueen) result += "q";
        else result += "r";
    }
    return result;
}

function GetMoveFromString(moveString) {
    var moves = GenerateValidMoves();
    for (var i = 0; i < moves.length; i++) {
        if (FormatMove(moves[i]) == moveString) {
            return moves[i];
        }
    }
    throw ("busted! ->" + moveString + " fen:" + GetFen());
}

function PVFromHash(move, ply) {
    if (ply == 0) 
        return "";

    if (move == 0) {
      if (g_inCheck) return "checkmate";
      return "stalemate";
    }
    
    var pvString = " " + GetMoveSAN(move);
    MakeMove(move);
    
    var hashNode = g_hashTable[g_hashKeyLow & g_hashMask];
    if (hashNode != null && hashNode.lock == g_hashKeyHigh && hashNode.bestMove != null) {
        pvString += PVFromHash(hashNode.bestMove, ply - 1);
    }
    
    UnmakeMove(move);
    
    return pvString;
}



// 
// Board code
//

//////////////////////////////////////////////////
// Test Harness
//////////////////////////////////////////////////


function Perft(depth) {
    if (depth == 0) 
        return 1;
	var moves = new Array();
	GenerateCaptureMoves(moves, null);
	GenerateAllMoves(moves);
    var result = 0;
    for (var i = 0; i < moves.length; i++) {
        if (!MakeMove(moves[i])) {
//            if (DebugValidate() != 0) 
//            { throw (moves[i]); }
            continue;
        }
//        if (DebugValidate() != 0)
//       { throw (moves[i]); }
        result += Perft(depth - 1);
        UnmakeMove(moves[i]);
//        if (DebugValidate() != 0)
//       { throw (moves[i]); }
    }
    return result;
}
