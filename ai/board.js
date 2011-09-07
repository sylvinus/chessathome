
// 
// Board code
//

function MT() {
  var N = 624;
  var M = 397;
  var MAG01 = [0x0, 0x9908b0df];
    
    this.mt = new Array(N);
    this.mti = N + 1;

    this.setSeed = function()
  {
    var a = arguments;
    switch (a.length) {
    case 1:
      if (a[0].constructor === Number) {
        this.mt[0]= a[0];
        for (var i = 1; i < N; ++i) {
          var s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
          this.mt[i] = ((1812433253 * ((s & 0xffff0000) >>> 16))
              << 16)
            + 1812433253 * (s & 0x0000ffff)
            + i;
        }
        this.mti = N;
        return;
      }

      this.setSeed(19650218);

      var l = a[0].length;
      var i = 1;
      var j = 0;

      for (var k = N > l ? N : l; k != 0; --k) {
        var s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30)
        this.mt[i] = (this.mt[i]
            ^ (((1664525 * ((s & 0xffff0000) >>> 16)) << 16)
              + 1664525 * (s & 0x0000ffff)))
          + a[0][j]
          + j;
        if (++i >= N) {
          this.mt[0] = this.mt[N - 1];
          i = 1;
        }
        if (++j >= l) {
          j = 0;
        }
      }

      for (var k = N - 1; k != 0; --k) {
        var s = this.mt[i - 1] ^ (this.mt[i - 1] >>> 30);
        this.mt[i] = (this.mt[i]
            ^ (((1566083941 * ((s & 0xffff0000) >>> 16)) << 16)
              + 1566083941 * (s & 0x0000ffff)))
          - i;
        if (++i >= N) {
          this.mt[0] = this.mt[N-1];
          i = 1;
        }
      }

      this.mt[0] = 0x80000000;
      return;
    default:
      var seeds = new Array();
      for (var i = 0; i < a.length; ++i) {
        seeds.push(a[i]);
      }
      this.setSeed(seeds);
      return;
    }
  }

    this.setSeed(0x1BADF00D);

    this.next = function (bits)
  {
    if (this.mti >= N) {
      var x = 0;

      for (var k = 0; k < N - M; ++k) {
        x = (this.mt[k] & 0x80000000) | (this.mt[k + 1] & 0x7fffffff);
        this.mt[k] = this.mt[k + M] ^ (x >>> 1) ^ MAG01[x & 0x1];
      }
      for (var k = N - M; k < N - 1; ++k) {
        x = (this.mt[k] & 0x80000000) | (this.mt[k + 1] & 0x7fffffff);
        this.mt[k] = this.mt[k + (M - N)] ^ (x >>> 1) ^ MAG01[x & 0x1];
      }
      x = (this.mt[N - 1] & 0x80000000) | (this.mt[0] & 0x7fffffff);
      this.mt[N - 1] = this.mt[M - 1] ^ (x >>> 1) ^ MAG01[x & 0x1];

      this.mti = 0;
    }

    var y = this.mt[this.mti++];
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return (y >>> (32 - bits)) & 0xFFFFFFFF;
  }
}



function HashEntry(lock, value, flags, hashDepth, bestMove, globalPly) {
    this.lock = lock;
    this.value = value;
    this.flags = flags;
    this.hashDepth = hashDepth;
    this.bestMove = bestMove;
}

function MakeSquare(row, column) {
    return ((row + 2) << 4) | (column + 4);
}

function MakeTable(table) {
    var result = new Array(256);
    for (var i = 0; i < 256; i++) {
        result[i] = 0;
    }
    for (var row = 0; row < 8; row++) {
        for (var col = 0; col < 8; col++) {
            result[MakeSquare(row, col)] = table[row * 8 + col];
        }
    }
    return result;
}

function ResetGame() {
    g_killers = new Array(128);
    for (var i = 0; i < 128; i++) {
        g_killers[i] = [0, 0];
    }

    g_hashTable = new Array(g_hashSize);

    for (var i = 0; i < 32; i++) {
        g_historyTable[i] = new Array(256);
        for (var j = 0; j < 256; j++)
            g_historyTable[i][j] = 0;
    }

    var mt = new MT(0x1badf00d);

    g_zobristLow = new Array(256);
    g_zobristHigh = new Array(256);
    for (var i = 0; i < 256; i++) {
        g_zobristLow[i] = new Array(16);
        g_zobristHigh[i] = new Array(16);
        for (var j = 0; j < 16; j++) {
            g_zobristLow[i][j] = mt.next(32);
            g_zobristHigh[i][j] = mt.next(32);
        }
    }
    g_zobristBlackLow = mt.next(32);
    g_zobristBlackHigh = mt.next(32);

    for (var row = 0; row < 8; row++) {
        for (var col = 0; col < 8; col++) {
            var square = MakeSquare(row, col);
            g_flipTable[square] = MakeSquare(7 - row, col);
        }
    }

    g_pieceSquareAdj[g_piecePawn] = MakeTable(g_pawnAdg);
    g_pieceSquareAdj[g_pieceKnight] = MakeTable(g_knightAdj);
    g_pieceSquareAdj[g_pieceBishop] = MakeTable(g_bishopAdj);
    g_pieceSquareAdj[g_pieceRook] = MakeTable(g_rookAdj);
    g_pieceSquareAdj[g_pieceQueen] = MakeTable(g_emptyAdj);
    g_pieceSquareAdj[g_pieceKing] = MakeTable(g_kingAdj);

    var pieceDeltas = [[], [], g_knightDeltas, g_bishopDeltas, g_rookDeltas, g_queenDeltas, g_queenDeltas];

    for (var i = 0; i < 256; i++) {
        g_vectorDelta[i] = new Object();
        g_vectorDelta[i].delta = 0;
        g_vectorDelta[i].pieceMask = new Array(2);
        g_vectorDelta[i].pieceMask[0] = 0;
        g_vectorDelta[i].pieceMask[1] = 0;
    }
    
    // Initialize the vector delta table    
    for (var row = 0; row < 0x80; row += 0x10) 
        for (var col = 0; col < 0x8; col++) {
            var square = row | col;
            
            // Pawn moves
            var index = square - (square - 17) + 128;
            g_vectorDelta[index].pieceMask[g_colorWhite >> 3] |= (1 << g_piecePawn);
            index = square - (square - 15) + 128;
            g_vectorDelta[index].pieceMask[g_colorWhite >> 3] |= (1 << g_piecePawn);
            
            index = square - (square + 17) + 128;
            g_vectorDelta[index].pieceMask[0] |= (1 << g_piecePawn);
            index = square - (square + 15) + 128;
            g_vectorDelta[index].pieceMask[0] |= (1 << g_piecePawn);
            
            for (var i = g_pieceKnight; i <= g_pieceKing; i++) {
                for (var dir = 0; dir < pieceDeltas[i].length; dir++) {
                    var target = square + pieceDeltas[i][dir];
                    while (!(target & 0x88)) {
                        index = square - target + 128;
                        
                        g_vectorDelta[index].pieceMask[g_colorWhite >> 3] |= (1 << i);
                        g_vectorDelta[index].pieceMask[0] |= (1 << i);
                        
                        var flip = -1;
                        if (square < target) 
                            flip = 1;
                        
                        if ((square & 0xF0) == (target & 0xF0)) {
                            // On the same row
                            g_vectorDelta[index].delta = flip * 1;
                        } else if ((square & 0x0F) == (target & 0x0F)) {
                            // On the same column
                            g_vectorDelta[index].delta = flip * 16;
                        } else if ((square % 15) == (target % 15)) {
                            g_vectorDelta[index].delta = flip * 15;
                        } else if ((square % 17) == (target % 17)) {
                            g_vectorDelta[index].delta = flip * 17;
                        }

                        if (i == g_pieceKnight) {
                            g_vectorDelta[index].delta = pieceDeltas[i][dir];
                            break;
                        }

                        if (i == g_pieceKing)
                            break;

                        target += pieceDeltas[i][dir];
                    }
                }
            }
        }

    InitializeEval();
    InitializeFromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
}

function InitializeEval() {
    g_mobUnit = new Array(2);
    for (var i = 0; i < 2; i++) {
        g_mobUnit[i] = new Array();
        var enemy = i == 0 ? 0x10 : 8;
        var friend = i == 0 ? 8 : 0x10;
        g_mobUnit[i][0] = 1;
        g_mobUnit[i][0x80] = 0;
        g_mobUnit[i][enemy | g_piecePawn] = 1;
        g_mobUnit[i][enemy | g_pieceBishop] = 1;
        g_mobUnit[i][enemy | g_pieceKnight] = 1;
        g_mobUnit[i][enemy | g_pieceRook] = 1;
        g_mobUnit[i][enemy | g_pieceQueen] = 1;
        g_mobUnit[i][enemy | g_pieceKing] = 1;
        g_mobUnit[i][friend | g_piecePawn] = 0;
        g_mobUnit[i][friend | g_pieceBishop] = 0;
        g_mobUnit[i][friend | g_pieceKnight] = 0;
        g_mobUnit[i][friend | g_pieceRook] = 0;
        g_mobUnit[i][friend | g_pieceQueen] = 0;
        g_mobUnit[i][friend | g_pieceKing] = 0;
    }
}

function SetHash() {
    var result = new Object();
    result.hashKeyLow = 0;
    result.hashKeyHigh = 0;

    for (var i = 0; i < 256; i++) {
        var piece = g_board[i];
        if (piece & 0x18) {
            result.hashKeyLow ^= g_zobristLow[i][piece & 0xF]
            result.hashKeyHigh ^= g_zobristHigh[i][piece & 0xF]
        }
    }

    if (!g_toMove) {
        result.hashKeyLow ^= g_zobristBlackLow;
        result.hashKeyHigh ^= g_zobristBlackHigh;
    }

    return result;
}

function InitializeFromFen(fen){
    var chunks = fen.split(' ');
    
    for (var i = 0; i < 256; i++) 
        g_board[i] = 0x80;
    
    var row = 0;
    var col = 0;
    
    var pieces = chunks[0];
    for (var i = 0; i < pieces.length; i++) {
        var c = pieces.charAt(i);
        
        if (c == '/') {
            row++;
            col = 0;
        }
        else {
            if (c >= '0' && c <= '9') {
                for (var j = 0; j < parseInt(c); j++) {
                    g_board[((row + 2) * 0x10) + (col + 4)] = 0;
                    col++;
                }
            }
            else {
                var isBlack = c >= 'a' && c <= 'z';
                var piece = isBlack ? g_colorBlack : g_colorWhite;
                if (!isBlack) 
                    c = pieces.toLowerCase().charAt(i);
                switch (c) {
                    case 'p':
                        piece |= g_piecePawn;
                        break;
                    case 'b':
                        piece |= g_pieceBishop;
                        break;
                    case 'n':
                        piece |= g_pieceKnight;
                        break;
                    case 'r':
                        piece |= g_pieceRook;
                        break;
                    case 'q':
                        piece |= g_pieceQueen;
                        break;
                    case 'k':
                        piece |= g_pieceKing;
                        break;
                }
                
                g_board[((row + 2) * 0x10) + (col + 4)] = piece;
                col++;
            }
        }
    }
    
    InitializePieceList();
    
    g_toMove = chunks[1].charAt(0) == 'w' ? g_colorWhite : 0;
    
    g_castleRights = 0;
    if (chunks[2].indexOf('K') != -1) 
        g_castleRights |= 1;
    if (chunks[2].indexOf('Q') != -1) 
        g_castleRights |= 2;
    if (chunks[2].indexOf('k') != -1) 
        g_castleRights |= 4;
    if (chunks[2].indexOf('q') != -1) 
        g_castleRights |= 8;
    
    g_enPassentSquare = -1;
    if (chunks[3].indexOf('-') == -1) {
  var col = chunks[3].charAt(0).charCodeAt() - 'a'.charCodeAt();
  var row = 8 - (chunks[3].charAt(1).charCodeAt() - '0'.charCodeAt());
  g_enPassentSquare = ((row + 2) * 0x10) + (col + 4);
    }

    var hashResult = SetHash();
    g_hashKeyLow = hashResult.hashKeyLow;
    g_hashKeyHigh = hashResult.hashKeyHigh;

    g_baseEval = 0;
    for (var i = 0; i < 256; i++) {
        if (g_board[i] & g_colorWhite) {
            g_baseEval += g_pieceSquareAdj[g_board[i] & 0x7][i];
            g_baseEval += g_materialTable[g_board[i] & 0x7];
        } else if (g_board[i] & g_colorBlack) {
            g_baseEval -= g_pieceSquareAdj[g_board[i] & 0x7][g_flipTable[i]];
            g_baseEval -= g_materialTable[g_board[i] & 0x7];
        }
    }
    if (!g_toMove) g_baseEval = -g_baseEval;

    g_move50 = parseInt(chunks[4])+1;
    g_moveCount = (parseInt(chunks[5])-1)*2+(g_toMove==g_colorWhite?0:1);
    
    g_inCheck = IsSquareAttackable(g_pieceList[(g_toMove | g_pieceKing) << 4], 8 - g_toMove);
}



function InitializePieceList() {
    for (var i = 0; i < 16; i++) {
        g_pieceCount[i] = 0;
        for (var j = 0; j < 16; j++) {
            // 0 is used as the terminator for piece lists
            g_pieceList[(i << 4) | j] = 0;
        }
    }

    for (var i = 0; i < 256; i++) {
        g_pieceIndex[i] = 0;
        if (g_board[i] & (g_colorWhite | g_colorBlack)) {
      var piece = g_board[i] & 0xF;

      g_pieceList[(piece << 4) | g_pieceCount[piece]] = i;
      g_pieceIndex[i] = g_pieceCount[piece];
      g_pieceCount[piece]++;
        }
    }
}

function MakeMove(move){
    var me = g_toMove >> 3;
  var otherColor = 8 - g_toMove; 
    
    var flags = move & 0xFF0000;
    var to = (move >> 8) & 0xFF;
    var from = move & 0xFF;
    var captured = g_board[to];
    var piece = g_board[from];
    var epcEnd = to;

    if (flags & g_moveflagEPC) {
        epcEnd = me ? (to + 0x10) : (to - 0x10);
        captured = g_board[epcEnd];
        g_board[epcEnd] = g_pieceEmpty;
    }

    g_moveUndoStack[g_moveCount] = new UndoHistory(g_enPassentSquare, g_castleRights, g_inCheck, g_baseEval, g_hashKeyLow, g_hashKeyHigh, g_move50, captured);
    g_moveCount++;

    g_enPassentSquare = -1;

    if (flags) {
        if (flags & g_moveflagCastleKing) {
            if (IsSquareAttackable(from + 1, otherColor) ||
              IsSquareAttackable(from + 2, otherColor)) {
                g_moveCount--;
                return false;
            }
            
            var rook = g_board[to + 1];
            
            g_hashKeyLow ^= g_zobristLow[to + 1][rook & 0xF];
            g_hashKeyHigh ^= g_zobristHigh[to + 1][rook & 0xF];
            g_hashKeyLow ^= g_zobristLow[to - 1][rook & 0xF];
            g_hashKeyHigh ^= g_zobristHigh[to - 1][rook & 0xF];
            
            g_board[to - 1] = rook;
            g_board[to + 1] = g_pieceEmpty;
            
            g_baseEval -= g_pieceSquareAdj[rook & 0x7][me == 0 ? g_flipTable[to + 1] : (to + 1)];
            g_baseEval += g_pieceSquareAdj[rook & 0x7][me == 0 ? g_flipTable[to - 1] : (to - 1)];

            var rookIndex = g_pieceIndex[to + 1];
            g_pieceIndex[to - 1] = rookIndex;
            g_pieceList[((rook & 0xF) << 4) | rookIndex] = to - 1;
        } else if (flags & g_moveflagCastleQueen) {
            if (IsSquareAttackable(from - 1, otherColor) ||
              IsSquareAttackable(from - 2, otherColor)) {
                g_moveCount--;
                return false;
            }
            
            var rook = g_board[to - 2];

            g_hashKeyLow ^= g_zobristLow[to -2][rook & 0xF];
            g_hashKeyHigh ^= g_zobristHigh[to - 2][rook & 0xF];
            g_hashKeyLow ^= g_zobristLow[to + 1][rook & 0xF];
            g_hashKeyHigh ^= g_zobristHigh[to + 1][rook & 0xF];
            
            g_board[to + 1] = rook;
            g_board[to - 2] = g_pieceEmpty;
            
            g_baseEval -= g_pieceSquareAdj[rook & 0x7][me == 0 ? g_flipTable[to - 2] : (to - 2)];
            g_baseEval += g_pieceSquareAdj[rook & 0x7][me == 0 ? g_flipTable[to + 1] : (to + 1)];

            var rookIndex = g_pieceIndex[to - 2];
            g_pieceIndex[to + 1] = rookIndex;
            g_pieceList[((rook & 0xF) << 4) | rookIndex] = to + 1;
        }
    }

    if (captured) {
        // Remove our piece from the piece list
        var capturedType = captured & 0xF;
        g_pieceCount[capturedType]--;
        var lastPieceSquare = g_pieceList[(capturedType << 4) | g_pieceCount[capturedType]];
        g_pieceIndex[lastPieceSquare] = g_pieceIndex[epcEnd];
        g_pieceList[(capturedType << 4) | g_pieceIndex[lastPieceSquare]] = lastPieceSquare;
        g_pieceList[(capturedType << 4) | g_pieceCount[capturedType]] = 0;

        g_baseEval += g_materialTable[captured & 0x7];
        g_baseEval += g_pieceSquareAdj[captured & 0x7][me ? g_flipTable[epcEnd] : epcEnd];

        g_hashKeyLow ^= g_zobristLow[epcEnd][capturedType];
        g_hashKeyHigh ^= g_zobristHigh[epcEnd][capturedType];
        g_move50 = 0;
    } else if ((piece & 0x7) == g_piecePawn) {
        var diff = to - from;
        if (diff < 0) diff = -diff;
        if (diff > 16) {
            g_enPassentSquare = me ? (to + 0x10) : (to - 0x10);
        }
        g_move50 = 0;
    }

    g_hashKeyLow ^= g_zobristLow[from][piece & 0xF];
    g_hashKeyHigh ^= g_zobristHigh[from][piece & 0xF];
    g_hashKeyLow ^= g_zobristLow[to][piece & 0xF];
    g_hashKeyHigh ^= g_zobristHigh[to][piece & 0xF];
    g_hashKeyLow ^= g_zobristBlackLow;
    g_hashKeyHigh ^= g_zobristBlackHigh;
    
    g_castleRights &= g_castleRightsMask[from] & g_castleRightsMask[to];

    g_baseEval -= g_pieceSquareAdj[piece & 0x7][me == 0 ? g_flipTable[from] : from];
    
    // Move our piece in the piece list
    g_pieceIndex[to] = g_pieceIndex[from];
    g_pieceList[((piece & 0xF) << 4) | g_pieceIndex[to]] = to;

    if (flags & g_moveflagPromotion) {
        var newPiece = piece & (~0x7);
        if (flags & g_moveflagPromoteKnight) 
            newPiece |= g_pieceKnight;
        else if (flags & g_moveflagPromoteQueen) 
            newPiece |= g_pieceQueen;
        else if (flags & g_moveflagPromoteBishop) 
            newPiece |= g_pieceBishop;
        else 
            newPiece |= g_pieceRook;

        g_hashKeyLow ^= g_zobristLow[to][piece & 0xF];
        g_hashKeyHigh ^= g_zobristHigh[to][piece & 0xF];
        g_board[to] = newPiece;
        g_hashKeyLow ^= g_zobristLow[to][newPiece & 0xF];
        g_hashKeyHigh ^= g_zobristHigh[to][newPiece & 0xF];
        
        g_baseEval += g_pieceSquareAdj[newPiece & 0x7][me == 0 ? g_flipTable[to] : to];
        g_baseEval -= g_materialTable[g_piecePawn];
        g_baseEval += g_materialTable[newPiece & 0x7];

        var pawnType = piece & 0xF;
        var promoteType = newPiece & 0xF;

        g_pieceCount[pawnType]--;

        var lastPawnSquare = g_pieceList[(pawnType << 4) | g_pieceCount[pawnType]];
        g_pieceIndex[lastPawnSquare] = g_pieceIndex[to];
        g_pieceList[(pawnType << 4) | g_pieceIndex[lastPawnSquare]] = lastPawnSquare;
        g_pieceList[(pawnType << 4) | g_pieceCount[pawnType]] = 0;
        g_pieceIndex[to] = g_pieceCount[promoteType];
        g_pieceList[(promoteType << 4) | g_pieceIndex[to]] = to;
        g_pieceCount[promoteType]++;
    } else {
        g_board[to] = g_board[from];
        
        g_baseEval += g_pieceSquareAdj[piece & 0x7][me == 0 ? g_flipTable[to] : to];
    }
    g_board[from] = g_pieceEmpty;

    g_toMove = otherColor;
    g_baseEval = -g_baseEval;
    
    if ((piece & 0x7) == g_pieceKing || g_inCheck) {
        if (IsSquareAttackable(g_pieceList[(g_pieceKing | (8 - g_toMove)) << 4], otherColor)) {
            UnmakeMove(move);
            return false;
        }
    } else {
        var kingPos = g_pieceList[(g_pieceKing | (8 - g_toMove)) << 4];
        
        if (ExposesCheck(from, kingPos)) {
            UnmakeMove(move);
            return false;
        }
        
        if (epcEnd != to) {
            if (ExposesCheck(epcEnd, kingPos)) {
                UnmakeMove(move);
                return false;
            }
        }
    }
    
    g_inCheck = false;
    
    if (flags <= g_moveflagEPC) {
        var theirKingPos = g_pieceList[(g_pieceKing | g_toMove) << 4];
        
        // First check if the piece we moved can attack the enemy king
        g_inCheck = IsSquareAttackableFrom(theirKingPos, to);
        
        if (!g_inCheck) {
            // Now check if the square we moved from exposes check on the enemy king
            g_inCheck = ExposesCheck(from, theirKingPos);
            
            if (!g_inCheck) {
                // Finally, ep. capture can cause another square to be exposed
                if (epcEnd != to) {
                    g_inCheck = ExposesCheck(epcEnd, theirKingPos);
                }
            }
        }
    }
    else {
        // Castle or promotion, slow check
        g_inCheck = IsSquareAttackable(g_pieceList[(g_pieceKing | g_toMove) << 4], 8 - g_toMove);
    }

    g_repMoveStack[g_moveCount - 1] = g_hashKeyLow;
    g_move50++;

    return true;
}

function UnmakeMove(move){
    g_toMove = 8 - g_toMove;
    g_baseEval = -g_baseEval;
    
    g_moveCount--;
    g_enPassentSquare = g_moveUndoStack[g_moveCount].ep;
    g_castleRights = g_moveUndoStack[g_moveCount].castleRights;
    g_inCheck = g_moveUndoStack[g_moveCount].inCheck;
    g_baseEval = g_moveUndoStack[g_moveCount].baseEval;
    g_hashKeyLow = g_moveUndoStack[g_moveCount].hashKeyLow;
    g_hashKeyHigh = g_moveUndoStack[g_moveCount].hashKeyHigh;
    g_move50 = g_moveUndoStack[g_moveCount].move50;
    
    var otherColor = 8 - g_toMove;
    var me = g_toMove >> 3;
    var them = otherColor >> 3;
    
    var flags = move & 0xFF0000;
    var captured = g_moveUndoStack[g_moveCount].captured;
    var to = (move >> 8) & 0xFF;
    var from = move & 0xFF;
    
    var piece = g_board[to];
    
    if (flags) {
        if (flags & g_moveflagCastleKing) {
            var rook = g_board[to - 1];
            g_board[to + 1] = rook;
            g_board[to - 1] = g_pieceEmpty;
      
            var rookIndex = g_pieceIndex[to - 1];
            g_pieceIndex[to + 1] = rookIndex;
            g_pieceList[((rook & 0xF) << 4) | rookIndex] = to + 1;
        }
        else if (flags & g_moveflagCastleQueen) {
            var rook = g_board[to + 1];
            g_board[to - 2] = rook;
            g_board[to + 1] = g_pieceEmpty;
      
            var rookIndex = g_pieceIndex[to + 1];
            g_pieceIndex[to - 2] = rookIndex;
            g_pieceList[((rook & 0xF) << 4) | rookIndex] = to - 2;
        }
    }
    
    if (flags & g_moveflagPromotion) {
        piece = (g_board[to] & (~0x7)) | g_piecePawn;
        g_board[from] = piece;

        var pawnType = g_board[from] & 0xF;
        var promoteType = g_board[to] & 0xF;

        g_pieceCount[promoteType]--;

        var lastPromoteSquare = g_pieceList[(promoteType << 4) | g_pieceCount[promoteType]];
        g_pieceIndex[lastPromoteSquare] = g_pieceIndex[to];
        g_pieceList[(promoteType << 4) | g_pieceIndex[lastPromoteSquare]] = lastPromoteSquare;
        g_pieceList[(promoteType << 4) | g_pieceCount[promoteType]] = 0;
        g_pieceIndex[to] = g_pieceCount[pawnType];
        g_pieceList[(pawnType << 4) | g_pieceIndex[to]] = to;
        g_pieceCount[pawnType]++;
    }
    else {
        g_board[from] = g_board[to];
    }

    var epcEnd = to;
    if (flags & g_moveflagEPC) {
        if (g_toMove == g_colorWhite) 
            epcEnd = to + 0x10;
        else 
            epcEnd = to - 0x10;
        g_board[to] = g_pieceEmpty;
    }
    
    g_board[epcEnd] = captured;

  // Move our piece in the piece list
    g_pieceIndex[from] = g_pieceIndex[to];
    g_pieceList[((piece & 0xF) << 4) | g_pieceIndex[from]] = from;

    if (captured) {
    // Restore our piece to the piece list
        var captureType = captured & 0xF;
        g_pieceIndex[epcEnd] = g_pieceCount[captureType];
        g_pieceList[(captureType << 4) | g_pieceCount[captureType]] = epcEnd;
        g_pieceCount[captureType]++;
    }
}

function ExposesCheck(from, kingPos){
    var index = kingPos - from + 128;
    // If a queen can't reach it, nobody can!
    if ((g_vectorDelta[index].pieceMask[0] & (1 << (g_pieceQueen))) != 0) {
        var delta = g_vectorDelta[index].delta;
        var pos = kingPos + delta;
        while (g_board[pos] == 0) pos += delta;
        
        var piece = g_board[pos];
        if (((piece & (g_board[kingPos] ^ 0x18)) & 0x18) == 0)
            return false;

        // Now see if the piece can actually attack the king
        var backwardIndex = pos - kingPos + 128;
        return (g_vectorDelta[backwardIndex].pieceMask[(piece >> 3) & 1] & (1 << (piece & 0x7))) != 0;
    }
    return false;
}

function IsSquareOnPieceLine(target, from) {
    var index = from - target + 128;
    var piece = g_board[from];
    return (g_vectorDelta[index].pieceMask[(piece >> 3) & 1] & (1 << (piece & 0x7))) ? true : false;
}

function IsSquareAttackableFrom(target, from){
    var index = from - target + 128;
    var piece = g_board[from];
    if (g_vectorDelta[index].pieceMask[(piece >> 3) & 1] & (1 << (piece & 0x7))) {
        // Yes, this square is pseudo-attackable.  Now, check for real attack
    var inc = g_vectorDelta[index].delta;
        do {
      from += inc;
      if (from == target)
        return true;
    } while (g_board[from] == 0);
    }
    
    return false;
}

function IsSquareAttackable(target, color) {
  // Attackable by pawns?
  var inc = color ? -16 : 16;
  var pawn = (color ? g_colorWhite : g_colorBlack) | 1;
  if (g_board[target - (inc - 1)] == pawn)
    return true;
  if (g_board[target - (inc + 1)] == pawn)
    return true;
  
  // Attackable by pieces?
  for (var i = 2; i <= 6; i++) {
        var index = (color | i) << 4;
        var square = g_pieceList[index];
    while (square != 0) {
      if (IsSquareAttackableFrom(target, square))
        return true;
      square = g_pieceList[++index];
    }
    }
    return false;
}

function GenerateMove(from, to) {
    return from | (to << 8);
}

function GenerateMove(from, to, flags){
    return from | (to << 8) | flags;
}

function GenerateValidMoves() {
    var moveList = new Array();
    var allMoves = new Array();
    GenerateCaptureMoves(allMoves, null);
    GenerateAllMoves(allMoves);
    
    for (var i = allMoves.length - 1; i >= 0; i--) {
        if (MakeMove(allMoves[i])) {
            moveList[moveList.length] = allMoves[i];
            UnmakeMove(allMoves[i]);
        }
    }
    
    return moveList;
}

function GenerateAllMoves(moveStack) {
    var from, to, piece, pieceIdx;

  // Pawn quiet moves
    pieceIdx = (g_toMove | 1) << 4;
    from = g_pieceList[pieceIdx++];
    while (from != 0) {
        GeneratePawnMoves(moveStack, from);
        from = g_pieceList[pieceIdx++];
    }

    // Knight quiet moves
  pieceIdx = (g_toMove | 2) << 4;
  from = g_pieceList[pieceIdx++];
  while (from != 0) {
    to = from + 31; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 33; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 14; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 14; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 31; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 33; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 18; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 18; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    from = g_pieceList[pieceIdx++];
  }

  // Bishop quiet moves
  pieceIdx = (g_toMove | 3) << 4;
  from = g_pieceList[pieceIdx++];
  while (from != 0) {
    to = from - 15; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to -= 15; }
    to = from - 17; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to -= 17; }
    to = from + 15; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to += 15; }
    to = from + 17; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to += 17; }
    from = g_pieceList[pieceIdx++];
  }

  // Rook quiet moves
  pieceIdx = (g_toMove | 4) << 4;
  from = g_pieceList[pieceIdx++];
  while (from != 0) {
    to = from - 1; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to--; }
    to = from + 1; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to++; }
    to = from + 16; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to += 16; }
    to = from - 16; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to -= 16; }
    from = g_pieceList[pieceIdx++];
  }
  
  // Queen quiet moves
  pieceIdx = (g_toMove | 5) << 4;
  from = g_pieceList[pieceIdx++];
  while (from != 0) {
    to = from - 15; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to -= 15; }
    to = from - 17; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to -= 17; }
    to = from + 15; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to += 15; }
    to = from + 17; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to += 17; }
    to = from - 1; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to--; }
    to = from + 1; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to++; }
    to = from + 16; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to += 16; }
    to = from - 16; while (g_board[to] == 0) { moveStack[moveStack.length] = GenerateMove(from, to); to -= 16; }
    from = g_pieceList[pieceIdx++];
  }
  
  // King quiet moves
  {
    pieceIdx = (g_toMove | 6) << 4;
    from = g_pieceList[pieceIdx];
    to = from - 15; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 17; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 15; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 17; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 1; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 1; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 16; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 16; if (g_board[to] == 0) moveStack[moveStack.length] = GenerateMove(from, to);
    
        if (!g_inCheck) {
            var castleRights = g_castleRights;
            if (!g_toMove) 
                castleRights >>= 2;
            if (castleRights & 1) {
                // Kingside castle
                if (g_board[from + 1] == g_pieceEmpty && g_board[from + 2] == g_pieceEmpty) {
                    moveStack[moveStack.length] = GenerateMove(from, from + 0x02, g_moveflagCastleKing);
                }
            }
            if (castleRights & 2) {
                // Queenside castle
                if (g_board[from - 1] == g_pieceEmpty && g_board[from - 2] == g_pieceEmpty && g_board[from - 3] == g_pieceEmpty) {
                    moveStack[moveStack.length] = GenerateMove(from, from - 0x02, g_moveflagCastleQueen);
                }
            }
        }
  }
}

function GenerateCaptureMoves(moveStack, moveScores) {
    var from, to, piece, pieceIdx;
    var inc = (g_toMove == 8) ? -16 : 16;
    var enemy = g_toMove == 8 ? 0x10 : 0x8;

    // Pawn captures
    pieceIdx = (g_toMove | 1) << 4;
    from = g_pieceList[pieceIdx++];
    while (from != 0) {
        to = from + inc - 1;
        if (g_board[to] & enemy) {
            MovePawnTo(moveStack, from, to);
        }

        to = from + inc + 1;
        if (g_board[to] & enemy) {
            MovePawnTo(moveStack, from, to);
        }

        from = g_pieceList[pieceIdx++];
    }

    if (g_enPassentSquare != -1) {
        var inc = (g_toMove == g_colorWhite) ? -16 : 16;
        var pawn = g_toMove | g_piecePawn;

        var from = g_enPassentSquare - (inc + 1);
        if ((g_board[from] & 0xF) == pawn) {
            moveStack[moveStack.length] = GenerateMove(from, g_enPassentSquare, g_moveflagEPC);
        }

        from = g_enPassentSquare - (inc - 1);
        if ((g_board[from] & 0xF) == pawn) {
            moveStack[moveStack.length] = GenerateMove(from, g_enPassentSquare, g_moveflagEPC);
        }
    }

    // Knight captures
  pieceIdx = (g_toMove | 2) << 4;
  from = g_pieceList[pieceIdx++];
  while (from != 0) {
    to = from + 31; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 33; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 14; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 14; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 31; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 33; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 18; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 18; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    from = g_pieceList[pieceIdx++];
  }
  
  // Bishop captures
  pieceIdx = (g_toMove | 3) << 4;
  from = g_pieceList[pieceIdx++];
  while (from != 0) {
    to = from; do { to -= 15; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from; do { to -= 17; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from; do { to += 15; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from; do { to += 17; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    from = g_pieceList[pieceIdx++];
  }
  
  // Rook captures
  pieceIdx = (g_toMove | 4) << 4;
  from = g_pieceList[pieceIdx++];
  while (from != 0) {
    to = from; do { to--; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from; do { to++; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from; do { to -= 16; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from; do { to += 16; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    from = g_pieceList[pieceIdx++];
  }
  
  // Queen captures
  pieceIdx = (g_toMove | 5) << 4;
  from = g_pieceList[pieceIdx++];
  while (from != 0) {
    to = from; do { to -= 15; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from; do { to -= 17; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from; do { to += 15; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from; do { to += 17; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from; do { to--; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from; do { to++; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from; do { to -= 16; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from; do { to += 16; } while (g_board[to] == 0); if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    from = g_pieceList[pieceIdx++];
  }
  
  // King captures
  {
    pieceIdx = (g_toMove | 6) << 4;
    from = g_pieceList[pieceIdx];
    to = from - 15; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 17; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 15; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 17; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 1; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 1; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from - 16; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
    to = from + 16; if (g_board[to] & enemy) moveStack[moveStack.length] = GenerateMove(from, to);
  }
}

function MovePawnTo(moveStack, start, square) {
  var row = square & 0xF0;
    if ((row == 0x90) || (row == 0x20)) {
        moveStack[moveStack.length] = GenerateMove(start, square, g_moveflagPromotion | g_moveflagPromoteQueen);
        moveStack[moveStack.length] = GenerateMove(start, square, g_moveflagPromotion | g_moveflagPromoteKnight);
        moveStack[moveStack.length] = GenerateMove(start, square, g_moveflagPromotion | g_moveflagPromoteBishop);
        moveStack[moveStack.length] = GenerateMove(start, square, g_moveflagPromotion);
    }
    else {
        moveStack[moveStack.length] = GenerateMove(start, square, 0);
    }
}

function GeneratePawnMoves(moveStack, from) {
    var piece = g_board[from];
    var color = piece & g_colorWhite;
    var inc = (color == g_colorWhite) ? -16 : 16;
    
  // Quiet pawn moves
  var to = from + inc;
  if (g_board[to] == 0) {
    MovePawnTo(moveStack, from, to, g_pieceEmpty);
    
    // Check if we can do a 2 square jump
    if ((((from & 0xF0) == 0x30) && color != g_colorWhite) ||
        (((from & 0xF0) == 0x80) && color == g_colorWhite)) {
      to += inc;
      if (g_board[to] == 0) {
        moveStack[moveStack.length] = GenerateMove(from, to);
      }        
    }
  }
}

function UndoHistory(ep, castleRights, inCheck, baseEval, hashKeyLow, hashKeyHigh, move50, captured) {
    this.ep = ep;
    this.castleRights = castleRights;
    this.inCheck = inCheck;
    this.baseEval = baseEval;
    this.hashKeyLow = hashKeyLow;
    this.hashKeyHigh = hashKeyHigh;
    this.move50 = move50;
    this.captured = captured;
}



function See(move) {
    var from = move & 0xFF;
    var to = (move >> 8) & 0xFF;

    var fromPiece = g_board[from];

    var fromValue = g_seeValues[fromPiece & 0xF];
    var toValue = g_seeValues[g_board[to] & 0xF];

    if (fromValue <= toValue) {
        return true;
    }

    if (move >> 16) {
        // Castles, promotion, ep are always good
        return true;
    }

    var us = (fromPiece & g_colorWhite) ? g_colorWhite : 0;
    var them = 8 - us;

    // Pawn attacks 
    // If any opponent pawns can capture back, this capture is probably not worthwhile (as we must be using knight or above).
    var inc = (fromPiece & g_colorWhite) ? -16 : 16; // Note: this is capture direction from to, so reversed from normal move direction
    if (((g_board[to + inc + 1] & 0xF) == (g_piecePawn | them)) ||
        ((g_board[to + inc - 1] & 0xF) == (g_piecePawn | them))) {
        return false;
    }

    var themAttacks = new Array();

    // Knight attacks 
    // If any opponent knights can capture back, and the deficit we have to make up is greater than the knights value, 
    // it's not worth it.  We can capture on this square again, and the opponent doesn't have to capture back. 
    var captureDeficit = fromValue - toValue;
    SeeAddKnightAttacks(to, them, themAttacks);
    if (themAttacks.length != 0 && captureDeficit > g_seeValues[g_pieceKnight]) {
        return false;
    }

    // Slider attacks
    g_board[from] = 0;
    for (var pieceType = g_pieceBishop; pieceType <= g_pieceQueen; pieceType++) {
        if (SeeAddSliderAttacks(to, them, themAttacks, pieceType)) {
            if (captureDeficit > g_seeValues[pieceType]) {
                g_board[from] = fromPiece;
                return false;
            }
        }
    }

    // Pawn defenses 
    // At this point, we are sure we are making a "losing" capture.  The opponent can not capture back with a 
    // pawn.  They cannot capture back with a minor/major and stand pat either.  So, if we can capture with 
    // a pawn, it's got to be a winning or equal capture. 
    if (((g_board[to - inc + 1] & 0xF) == (g_piecePawn | us)) ||
        ((g_board[to - inc - 1] & 0xF) == (g_piecePawn | us))) {
        g_board[from] = fromPiece;
        return true;
    }

    // King attacks
    SeeAddSliderAttacks(to, them, themAttacks, g_pieceKing);

    // Our attacks
    var usAttacks = new Array();
    SeeAddKnightAttacks(to, us, usAttacks);
    for (var pieceType = g_pieceBishop; pieceType <= g_pieceKing; pieceType++) {
        SeeAddSliderAttacks(to, us, usAttacks, pieceType);
    }

    g_board[from] = fromPiece;

    // We are currently winning the amount of material of the captured piece, time to see if the opponent 
    // can get it back somehow.  We assume the opponent can capture our current piece in this score, which 
    // simplifies the later code considerably. 
    var seeValue = toValue - fromValue;

    for (; ; ) {
        var capturingPieceValue = 1000;
        var capturingPieceIndex = -1;

        // Find the least valuable piece of the opponent that can attack the square
        for (var i = 0; i < themAttacks.length; i++) {
            if (themAttacks[i] != 0) {
                var pieceValue = g_seeValues[g_board[themAttacks[i]] & 0x7];
                if (pieceValue < capturingPieceValue) {
                    capturingPieceValue = pieceValue;
                    capturingPieceIndex = i;
                }
            }
        }

        if (capturingPieceIndex == -1) {
            // Opponent can't capture back, we win
            return true;
        }

        // Now, if seeValue < 0, the opponent is winning.  If even after we take their piece, 
        // we can't bring it back to 0, then we have lost this battle. 
        seeValue += capturingPieceValue;
        if (seeValue < 0) {
            return false;
        }

        var capturingPieceSquare = themAttacks[capturingPieceIndex];
        themAttacks[capturingPieceIndex] = 0;

        // Add any x-ray attackers
        SeeAddXrayAttack(to, capturingPieceSquare, us, usAttacks, themAttacks);

        // Our turn to capture
        capturingPieceValue = 1000;
        capturingPieceIndex = -1;

        // Find our least valuable piece that can attack the square
        for (var i = 0; i < usAttacks.length; i++) {
            if (usAttacks[i] != 0) {
                var pieceValue = g_seeValues[g_board[usAttacks[i]] & 0x7];
                if (pieceValue < capturingPieceValue) {
                    capturingPieceValue = pieceValue;
                    capturingPieceIndex = i;
                }
            }
        }

        if (capturingPieceIndex == -1) {
            // We can't capture back, we lose :( 
            return false;
        }

        // Assume our opponent can capture us back, and if we are still winning, we can stand-pat 
        // here, and assume we've won. 
        seeValue -= capturingPieceValue;
        if (seeValue >= 0) {
            return true;
        }

        capturingPieceSquare = usAttacks[capturingPieceIndex];
        usAttacks[capturingPieceIndex] = 0;

        // Add any x-ray attackers
        SeeAddXrayAttack(to, capturingPieceSquare, us, usAttacks, themAttacks);
    }
}

function SeeAddXrayAttack(target, square, us, usAttacks, themAttacks) {
    var index = square - target + 128;
    var delta = -g_vectorDelta[index].delta;
    if (delta == 0)
        return;
    square += delta;
    while (g_board[square] == 0) {
        square += delta;
    }

    if ((g_board[square] & 0x18) && IsSquareOnPieceLine(target, square)) {
        if ((g_board[square] & 8) == us) {
            usAttacks[usAttacks.length] = square;
        } else {
            themAttacks[themAttacks.length] = square;
        }
    }
}

// target = attacking square, us = color of knights to look for, attacks = array to add squares to
function SeeAddKnightAttacks(target, us, attacks) {
    var pieceIdx = (us | g_pieceKnight) << 4;
    var attackerSq = g_pieceList[pieceIdx++];

    while (attackerSq != 0) {
        if (IsSquareOnPieceLine(target, attackerSq)) {
            attacks[attacks.length] = attackerSq;
        }
        attackerSq = g_pieceList[pieceIdx++];
    }
}

function SeeAddSliderAttacks(target, us, attacks, pieceType) {
    var pieceIdx = (us | pieceType) << 4;
    var attackerSq = g_pieceList[pieceIdx++];
    var hit = false;

    while (attackerSq != 0) {
        if (IsSquareAttackableFrom(target, attackerSq)) {
            attacks[attacks.length] = attackerSq;
            hit = true;
        }
        attackerSq = g_pieceList[pieceIdx++];
    }

    return hit;
}

function BuildPVMessage(bestMove, value, timeTaken, ply) {
    var totalNodes = g_nodeCount + g_qNodeCount;
    return "Ply:" + ply + " Score:" + value + " Nodes:" + totalNodes + " NPS:" + ((totalNodes / (timeTaken / 1000)) | 0) + " " + PVFromHash(bestMove, 15);
}