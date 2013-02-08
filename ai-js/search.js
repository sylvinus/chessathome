
//
// Searching code
//



function Search(finishMoveCallback, maxPly, finishPlyCallback) {
    var lastEval;
    var alpha = g_minEval;
    var beta = g_maxEval;
    
    g_globalPly++;
    g_nodeCount = 0;
    g_qNodeCount = 0;
    g_searchValid = true;
    
    var bestMove = 1;
    var value;
    
    //console.log('WAZAAAAAAA')
    g_startTime = (new Date()).getTime();

    try {
    if (!GenerateValidMoves().length) {
      if (finishMoveCallback != null)
        finishMoveCallback(0, null, null, null);
      return;
    }
      } catch (e) { postMessage({ 'e':e })}


    var i;
    for (i = 1; i <= maxPly && g_searchValid && bestMove; i++) {
      try {
        var tmp = AlphaBeta(i, 0, alpha, beta);
        if (g_searchValid) {

          value = tmp;

          if (value > alpha && value < beta) {
            alpha = value - 500;
            beta = value + 500;

            if (alpha < g_minEval) alpha = g_minEval;
            if (beta > g_maxEval) beta = g_maxEval;
          } else if (alpha != g_minEval) {
            alpha = g_minEval;
            beta = g_maxEval;
            i--;
          }

          if (g_hashTable[g_hashKeyLow & g_hashMask] != null) {
            bestMove = g_hashTable[g_hashKeyLow & g_hashMask].bestMove;
          }


        if (finishPlyCallback != null) 
            finishPlyCallback(bestMove, value, (new Date()).getTime() - g_startTime, i);
        }
      } catch (e) { postMessage({ 'e':e })}

    }

    if (finishMoveCallback != null) {
      finishMoveCallback(bestMove, value, (new Date()).getTime() - g_startTime, i - 1);
    }
}



function PawnEval(color) {
    var pieceIdx = (color | 1) << 4;
    var from = g_pieceList[pieceIdx++];
    while (from != 0) {
        from = g_pieceList[pieceIdx++];
    }
}

//Safe
function Mobility(color) {
    var result = 0;
    var from, to, mob, pieceIdx;
    var enemy = color == 8 ? 0x10 : 0x8
    var mobUnit = color == 8 ? g_mobUnit[0] : g_mobUnit[1];

    // Knight mobility
    mob = -3;
    pieceIdx = (color | 2) << 4;
    from = g_pieceList[pieceIdx++];
    while (from != 0) {
        mob += mobUnit[g_board[from + 31]];
        mob += mobUnit[g_board[from + 33]];
        mob += mobUnit[g_board[from + 14]];
        mob += mobUnit[g_board[from - 14]];
        mob += mobUnit[g_board[from - 31]];
        mob += mobUnit[g_board[from - 33]];
        mob += mobUnit[g_board[from + 18]];
        mob += mobUnit[g_board[from - 18]];
        from = g_pieceList[pieceIdx++];
    }
    result += 65 * mob;

    // Bishop mobility
    mob = -4;
    pieceIdx = (color | 3) << 4;
    from = g_pieceList[pieceIdx++];
    while (from != 0) {
        to = from - 15; while (g_board[to] == 0) { to -= 15; mob++; } if (g_board[to] & enemy) mob++;
        to = from - 17; while (g_board[to] == 0) { to -= 17; mob++; } if (g_board[to] & enemy) mob++;
        to = from + 15; while (g_board[to] == 0) { to += 15; mob++; } if (g_board[to] & enemy) mob++;
        to = from + 17; while (g_board[to] == 0) { to += 17; mob++; } if (g_board[to] & enemy) mob++;
        from = g_pieceList[pieceIdx++];
    }
    result += 50 * mob;

    // Rook mobility
    mob = -4;
    pieceIdx = (color | 4) << 4;
    from = g_pieceList[pieceIdx++];
    while (from != 0) {
        to = from - 1; while (g_board[to] == 0) { to--; mob++;}  if (g_board[to] & enemy) mob++;
        to = from + 1; while (g_board[to] == 0) { to++; mob++; } if (g_board[to] & enemy) mob++;
        to = from + 16; while (g_board[to] == 0) { to += 16; mob++; } if (g_board[to] & enemy) mob++;
        to = from - 16; while (g_board[to] == 0) { to -= 16; mob++; } if (g_board[to] & enemy) mob++;
        from = g_pieceList[pieceIdx++];
    }
    result += 25 * mob;

    // Queen mobility
    mob = -2;
    pieceIdx = (color | 5) << 4;
    from = g_pieceList[pieceIdx++];
    while (from != 0) {
        to = from - 15; while (g_board[to] == 0) { to -= 15; mob++; } if (g_board[to] & enemy) mob++;
        to = from - 17; while (g_board[to] == 0) { to -= 17; mob++; } if (g_board[to] & enemy) mob++;
        to = from + 15; while (g_board[to] == 0) { to += 15; mob++; } if (g_board[to] & enemy) mob++;
        to = from + 17; while (g_board[to] == 0) { to += 17; mob++; } if (g_board[to] & enemy) mob++;
        to = from - 1; while (g_board[to] == 0) { to--; mob++; } if (g_board[to] & enemy) mob++;
        to = from + 1; while (g_board[to] == 0) { to++; mob++; } if (g_board[to] & enemy) mob++;
        to = from + 16; while (g_board[to] == 0) { to += 16; mob++; } if (g_board[to] & enemy) mob++;
        to = from - 16; while (g_board[to] == 0) { to -= 16; mob++; } if (g_board[to] & enemy) mob++;
        from = g_pieceList[pieceIdx++];
    }
    result += 22 * mob;

    return result;
}

function Evaluate() {
    var curEval = g_baseEval;

    var evalAdjust = 0;
    // Black queen gone, then cancel white's penalty for king movement
    if (g_pieceList[g_pieceQueen << 4] == 0)
        evalAdjust -= g_pieceSquareAdj[g_pieceKing][g_pieceList[(g_colorWhite | g_pieceKing) << 4]];
    // White queen gone, then cancel black's penalty for king movement
    if (g_pieceList[(g_colorWhite | g_pieceQueen) << 4] == 0) 
        evalAdjust += g_pieceSquareAdj[g_pieceKing][g_flipTable[g_pieceList[g_pieceKing << 4]]];

    // Black bishop pair
    if (g_pieceCount[g_pieceBishop] >= 2)
        evalAdjust -= 500;
    // White bishop pair
    if (g_pieceCount[g_pieceBishop | g_colorWhite] >= 2)
        evalAdjust += 500;

    var mobility = Mobility(8) - Mobility(0);

    if (g_toMove == 0) {
        // Black
        curEval -= mobility;
        curEval -= evalAdjust;
    }
    else {
        curEval += mobility;
        curEval += evalAdjust;
    }
    
    return curEval;
}

function ScoreMove(move){
    var moveTo = (move >> 8) & 0xFF;
    var captured = g_board[moveTo] & 0x7;
    var piece = g_board[move & 0xFF];
    var score;
    if (captured != 0) {
        var pieceType = piece & 0x7;
        score = (captured << 5) - pieceType;
    } else {
        score = g_historyTable[piece & 0xF][moveTo];
    }
    return score;
}

function QSearch(alpha, beta, ply) {
    g_qNodeCount++;

    var realEval = g_inCheck ? (g_minEval + 1) : Evaluate();
    
    if (realEval >= beta) 
        return realEval;

    if (realEval > alpha)
        alpha = realEval;

    var moves = new Array();
    var moveScores = new Array();
    var wasInCheck = g_inCheck;

    if (wasInCheck) {
        // TODO: Fast check escape generator and fast checking moves generator
        GenerateCaptureMoves(moves, null);
        GenerateAllMoves(moves);

        for (var i = 0; i < moves.length; i++) {
            moveScores[i] = ScoreMove(moves[i]);
        }
    } else {
        GenerateCaptureMoves(moves, null);

        for (var i = 0; i < moves.length; i++) {
            var captured = g_board[(moves[i] >> 8) & 0xFF] & 0x7;
            var pieceType = g_board[moves[i] & 0xFF] & 0x7;

            moveScores[i] = (captured << 5) - pieceType;
        }
    }

    for (var i = 0; i < moves.length; i++) {
        var bestMove = i;
        for (var j = moves.length - 1; j > i; j--) {
            if (moveScores[j] > moveScores[bestMove]) {
                bestMove = j;
            }
        }
        {
            var tmpMove = moves[i];
            moves[i] = moves[bestMove];
            moves[bestMove] = tmpMove;
            
            var tmpScore = moveScores[i];
            moveScores[i] = moveScores[bestMove];
            moveScores[bestMove] = tmpScore;
        }

        if (!wasInCheck && !See(moves[i])) {
            continue;
        }

        if (!MakeMove(moves[i])) {
            continue;
        }

        var value = -QSearch(-beta, -alpha, ply - 1);
        
        UnmakeMove(moves[i]);
        
        if (value > realEval) {
            if (value >= beta) 
                return value;
            
            if (value > alpha)
                alpha = value;
            
            realEval = value;
        }
    }

    if (ply == 0 && !wasInCheck) {
        moves = new Array();
        GenerateAllMoves(moves);

        for (var i = 0; i < moves.length; i++) {
            moveScores[i] = ScoreMove(moves[i]);
        }

        for (var i = 0; i < moves.length; i++) {
            var bestMove = i;
            for (var j = moves.length - 1; j > i; j--) {
                if (moveScores[j] > moveScores[bestMove]) {
                    bestMove = j;
                }
            }
            {
                var tmpMove = moves[i];
                moves[i] = moves[bestMove];
                moves[bestMove] = tmpMove;

                var tmpScore = moveScores[i];
                moveScores[i] = moveScores[bestMove];
                moveScores[bestMove] = tmpScore;
            }

            if (!MakeMove(moves[i])) {
                continue;
            }
            var checking = g_inCheck;
            UnmakeMove(moves[i]);

            if (!checking) {
                continue;
            }

            if (!See(moves[i])) {
                continue;
            }
            
            MakeMove(moves[i]);

            var value = -QSearch(-beta, -alpha, ply - 1);

            UnmakeMove(moves[i]);

            if (value > realEval) {
                if (value >= beta)
                    return value;

                if (value > alpha)
                    alpha = value;

                realEval = value;
            }
        }
    }

    return realEval;
}



function StoreHash(value, flags, ply, move, depth) {
	if (value >= g_maxMateBuffer)
		value += depth;
	else if (value <= g_minMateBuffer)
		value -= depth;
	g_hashTable[g_hashKeyLow & g_hashMask] = new HashEntry(g_hashKeyHigh, value, flags, ply, move);
}

function IsHashMoveValid(hashMove) {
    var from = hashMove & 0xFF;
    var to = (hashMove >> 8) & 0xFF;
    var ourPiece = g_board[from];
    var pieceType = ourPiece & 0x7;
    if (pieceType < g_piecePawn || pieceType > g_pieceKing) return false;
    // Can't move a piece we don't control
    if (g_toMove != (ourPiece & 0x8))
        return false;
    // Can't move to a square that has something of the same color
    if (g_board[to] != 0 && (g_toMove == (g_board[to] & 0x8)))
        return false;
    if (pieceType == g_piecePawn) {
        if (hashMove & g_moveflagEPC) {
            return false;
        }

        // Valid moves are push, capture, double push, promotions
        var dir = to - from;
        if ((g_toMove == g_colorWhite) != (dir < 0))  {
            // Pawns have to move in the right direction
            return false;
        }

        var row = to & 0xF0;
        if (((row == 0x90 && !g_toMove) ||
             (row == 0x20 && g_toMove)) != (hashMove & g_moveflagPromotion)) {
            // Handle promotions
            return false;
        }

        if (dir == -16 || dir == 16) {
            // White/Black push
            return g_board[to] == 0;
        } else if (dir == -15 || dir == -17 || dir == 15 || dir == 17) {
            // White/Black capture
            return g_board[to] != 0;
        } else if (dir == -32) {
            // Double white push
            if (row != 0x60) return false;
            if (g_board[to] != 0) return false;
            if (g_board[from - 16] != 0) return false;
        } else if (dir == 32) {
            // Double black push
            if (row != 0x50) return false;
            if (g_board[to] != 0) return false;
            if (g_board[from + 16] != 0) return false;
        } else {
            return false;
        }

        return true;
    } else {
        // This validates that this piece type can actually make the attack
        if (hashMove >> 16) return false;
        return IsSquareAttackableFrom(to, from);
    }
}

function IsRepDraw() {
    var stop = g_moveCount - 1 - g_move50;
    stop = stop < 0 ? 0 : stop;
    for (var i = g_moveCount - 5; i >= stop; i -= 2) {
        if (g_repMoveStack[i] == g_hashKeyLow)
            return true;
    }
    return false;
}

function MovePicker(hashMove, depth, killer1, killer2) {
    this.hashMove = hashMove;
    this.depth = depth;
    this.killer1 = killer1;
    this.killer2 = killer2;

    this.moves = new Array();
    this.losingCaptures = null;
    this.moveCount = 0;
    this.atMove = -1;
    this.moveScores = null;
    this.stage = 0;

    this.nextMove = function () {
        if (++this.atMove == this.moveCount) {
            this.stage++;
            if (this.stage == 1) {
                if (this.hashMove != null && IsHashMoveValid(hashMove)) {
                    this.moves[0] = hashMove;
                    this.moveCount = 1;
                }
                if (this.moveCount != 1) {
                    this.hashMove = null;
                    this.stage++;
                }
            }

            if (this.stage == 2) {
                GenerateCaptureMoves(this.moves, null);
                this.moveCount = this.moves.length;
                this.moveScores = new Array(this.moveCount);
                // Move ordering
                for (var i = this.atMove; i < this.moveCount; i++) {
                    var captured = g_board[(this.moves[i] >> 8) & 0xFF] & 0x7;
                    var pieceType = g_board[this.moves[i] & 0xFF] & 0x7;
                    this.moveScores[i] = (captured << 5) - pieceType;
                }
                // No moves, onto next stage
                if (this.atMove == this.moveCount) this.stage++;
            }

            if (this.stage == 3) {
                if (IsHashMoveValid(this.killer1) &&
                    this.killer1 != this.hashMove) {
                    this.moves[this.moves.length] = this.killer1;
                    this.moveCount = this.moves.length;
                } else {
                    this.killer1 = 0;
                    this.stage++;
                }
            }

            if (this.stage == 4) {
                if (IsHashMoveValid(this.killer2) &&
                    this.killer2 != this.hashMove) {
                    this.moves[this.moves.length] = this.killer2;
                    this.moveCount = this.moves.length;
                } else {
                    this.killer2 = 0;
                    this.stage++;
                }
            }

            if (this.stage == 5) {
                GenerateAllMoves(this.moves);
                this.moveCount = this.moves.length;
                // Move ordering
                for (var i = this.atMove; i < this.moveCount; i++) this.moveScores[i] = ScoreMove(this.moves[i]);
                // No moves, onto next stage
                if (this.atMove == this.moveCount) this.stage++;
            }

            if (this.stage == 6) {
                // Losing captures
                if (this.losingCaptures != null) {
                    for (var i = 0; i < this.losingCaptures.length; i++) {
                        this.moves[this.moves.length] = this.losingCaptures[i];
                    }
                    for (var i = this.atMove; i < this.moveCount; i++) this.moveScores[i] = ScoreMove(this.moves[i]);
                    this.moveCount = this.moves.length;
                }
                // No moves, onto next stage
                if (this.atMove == this.moveCount) this.stage++;
            }

            if (this.stage == 7)
                return 0;
        }

        var bestMove = this.atMove;
        for (var j = this.atMove + 1; j < this.moveCount; j++) {
            if (this.moveScores[j] > this.moveScores[bestMove]) {
                bestMove = j;
            }
        }

        if (bestMove != this.atMove) {
            var tmpMove = this.moves[this.atMove];
            this.moves[this.atMove] = this.moves[bestMove];
            this.moves[bestMove] = tmpMove;

            var tmpScore = this.moveScores[this.atMove];
            this.moveScores[this.atMove] = this.moveScores[bestMove];
            this.moveScores[bestMove] = tmpScore;
        }

        var candidateMove = this.moves[this.atMove];
        if ((this.stage > 1 && candidateMove == this.hashMove) ||
            (this.stage > 3 && candidateMove == this.killer1) ||
            (this.stage > 4 && candidateMove == this.killer2)) {
            return this.nextMove();
        }

        if (this.stage == 2 && !See(candidateMove)) {
            if (this.losingCaptures == null) {
                this.losingCaptures = new Array();
            }
            this.losingCaptures[this.losingCaptures.length] = candidateMove;
            return this.nextMove();
        }

        return this.moves[this.atMove];
    }
}

function AllCutNode(ply, depth, beta, allowNull) {
    if (ply <= 0) {
        return QSearch(beta - 1, beta, 0);
    }

    if ((g_nodeCount & 127) == 127) {
        if ((new Date()).getTime() - g_startTime > g_timeout) {
            // Time cutoff
            g_searchValid = false;
            return beta - 1;
        }
    }

    g_nodeCount++;

    if (IsRepDraw())
        return 0;

    // Mate distance pruning
    if (g_minEval + depth >= beta)
       return beta;

    if (g_maxEval - (depth + 1) < beta)
	return beta - 1;

    var hashMove = null;
    var hashNode = g_hashTable[g_hashKeyLow & g_hashMask];
    if (hashNode != null && hashNode.lock == g_hashKeyHigh) {
        hashMove = hashNode.bestMove;
        if (hashNode.hashDepth >= ply) {
            var hashValue = hashNode.value;

            // Fixup mate scores
            if (hashValue >= g_maxMateBuffer)
		hashValue -= depth;
            else if (hashValue <= g_minMateBuffer)
                hashValue += depth;

            if (hashNode.flags == g_hashflagExact)
                return hashValue;
            if (hashNode.flags == g_hashflagAlpha && hashValue < beta)
                return hashValue;
            if (hashNode.flags == g_hashflagBeta && hashValue >= beta)
                return hashValue;
        }
    }

    // TODO - positional gain?

    if (!g_inCheck &&
        allowNull &&
        beta > g_minMateBuffer && 
        beta < g_maxMateBuffer) {
        // Try some razoring
        if (hashMove == null &&
            ply < 4) {
            var razorMargin = 2500 + 200 * ply;
            if (g_baseEval < beta - razorMargin) {
                var razorBeta = beta - razorMargin;
                var v = QSearch(razorBeta - 1, razorBeta, 0);
                if (v < razorBeta)
                    return v;
            }
        }
        
        // TODO - static null move

        // Null move
        if (ply > 1 &&
            g_baseEval >= beta - (ply >= 4 ? 2500 : 0) &&
            // Disable null move if potential zugzwang (no big pieces)
            (g_pieceCount[g_pieceBishop | g_toMove] != 0 ||
             g_pieceCount[g_pieceKnight | g_toMove] != 0 ||
             g_pieceCount[g_pieceRook | g_toMove] != 0 ||
             g_pieceCount[g_pieceQueen | g_toMove] != 0)) {
            var r = 3 + (ply >= 5 ? 1 : ply / 4);
            if (g_baseEval - beta > 1500) r++;

	        g_toMove = 8 - g_toMove;
	        g_baseEval = -g_baseEval;
	        g_hashKeyLow ^= g_zobristBlackLow;
	        g_hashKeyHigh ^= g_zobristBlackHigh;
			
	        var value = -AllCutNode(ply - r, depth + 1, -(beta - 1), false);

	        g_hashKeyLow ^= g_zobristBlackLow;
	        g_hashKeyHigh ^= g_zobristBlackHigh;
	        g_toMove = 8 - g_toMove;
	        g_baseEval = -g_baseEval;

            if (value >= beta)
	            return beta;
        }
    }

    var moveMade = false;
    var realEval = g_minEval - 1;
    var inCheck = g_inCheck;

    var movePicker = new MovePicker(hashMove, depth, g_killers[depth][0], g_killers[depth][1]);

    for (;;) {
        var currentMove = movePicker.nextMove();
        if (currentMove == 0) {
            break;
        }

        var plyToSearch = ply - 1;

        if (!MakeMove(currentMove)) {
            continue;
        }

        var value;
        var doFullSearch = true;

        if (g_inCheck) {
            // Check extensions
            plyToSearch++;
        } else {
            var reduced = plyToSearch - (movePicker.atMove > 14 ? 2 : 1);

            // Futility pruning
/*            if (movePicker.stage == 5 && !inCheck) {
                if (movePicker.atMove >= (15 + (1 << (5 * ply) >> 2)) &&
                    realEval > g_minMateBuffer) {
                    UnmakeMove(currentMove);
                    continue;
                }

                if (ply < 7) {
                    var reducedPly = reduced <= 0 ? 0 : reduced;
                    var futilityValue = -g_baseEval + (900 * (reducedPly + 2)) - (movePicker.atMove * 10);
                    if (futilityValue < beta) {
                        if (futilityValue > realEval) {
                            realEval = futilityValue;
                        }
                        UnmakeMove(currentMove);
                        continue;
                    }
                }
            }*/

            // Late move reductions
            if (movePicker.stage == 5 && movePicker.atMove > 5 && ply >= 3) {
                value = -AllCutNode(reduced, depth + 1, -(beta - 1), true);
                doFullSearch = (value >= beta);
            }
        }

        if (doFullSearch) {
            value = -AllCutNode(plyToSearch, depth + 1, -(beta  - 1), true);
        }

        moveMade = true;

        UnmakeMove(currentMove);

        if (!g_searchValid) {
            return beta - 1;
        }

        if (value > realEval) {
            if (value >= beta) {
				var histTo = (currentMove >> 8) & 0xFF;
				if (g_board[histTo] == 0) {
				    var histPiece = g_board[currentMove & 0xFF] & 0xF;
				    g_historyTable[histPiece][histTo] += ply * ply;
				    if (g_historyTable[histPiece][histTo] > 32767) {
				        g_historyTable[histPiece][histTo] >>= 1;
				    }

				    if (g_killers[depth][0] != currentMove) {
				        g_killers[depth][1] = g_killers[depth][0];
				        g_killers[depth][0] = currentMove;
				    }
				}

                StoreHash(value, g_hashflagBeta, ply, currentMove, depth);
                return value;
            }

            realEval = value;
            hashMove = currentMove;
        }
    }

    if (!moveMade) {
        // If we have no valid moves it's either stalemate or checkmate
        if (g_inCheck)
            // Checkmate.
            return g_minEval + depth;
        else 
            // Stalemate
            return 0;
    }

    StoreHash(realEval, g_hashflagAlpha, ply, hashMove, depth);
    
    return realEval;
}

function AlphaBeta(ply, depth, alpha, beta) {
    if (ply <= 0) {
        return QSearch(alpha, beta, 0);
    }


    //console.log('mp', ply, depth, alpha, beta)

    g_nodeCount++;

    if (depth > 0 && IsRepDraw())
        return 0;

    // Mate distance pruning
    var oldAlpha = alpha;
    alpha = alpha < g_minEval + depth ? alpha : g_minEval + depth;
    beta = beta > g_maxEval - (depth + 1) ? beta : g_maxEval - (depth + 1);
    if (alpha >= beta)
       return alpha;

    var hashMove = null;
    var hashFlag = g_hashflagAlpha;
    var hashNode = g_hashTable[g_hashKeyLow & g_hashMask];
    if (hashNode != null && hashNode.lock == g_hashKeyHigh) {
        hashMove = hashNode.bestMove;
    }
    
    var inCheck = g_inCheck;

    var moveMade = false;
    var realEval = g_minEval;

    var movePicker = new MovePicker(hashMove, depth, g_killers[depth][0], g_killers[depth][1]);


    for (;;) {
        var currentMove = movePicker.nextMove();
        if (currentMove == 0) {
            break;
        }

        var plyToSearch = ply - 1;

        if (!MakeMove(currentMove)) {
            continue;
        }

        if (g_inCheck) {
            // Check extensions
            plyToSearch++;
        }

        var value;
        if (moveMade) {
            value = -AllCutNode(plyToSearch, depth + 1, -alpha, true);
            if (value > alpha) {
                value = -AlphaBeta(plyToSearch, depth + 1, -beta, -alpha);
            }
        } else {
            value = -AlphaBeta(plyToSearch, depth + 1, -beta, -alpha);
        }

        moveMade = true;

        UnmakeMove(currentMove);

        if (!g_searchValid) {
            return alpha;
        }

        if (value > realEval) {
            if (value >= beta) {
                var histTo = (currentMove >> 8) & 0xFF;
                if (g_board[histTo] == 0) {
                    var histPiece = g_board[currentMove & 0xFF] & 0xF;
                    g_historyTable[histPiece][histTo] += ply * ply;
                    if (g_historyTable[histPiece][histTo] > 32767) {
                        g_historyTable[histPiece][histTo] >>= 1;
                    }

                    if (g_killers[depth][0] != currentMove) {
                        g_killers[depth][1] = g_killers[depth][0];
                        g_killers[depth][0] = currentMove;
                    }
                }

                StoreHash(value, g_hashflagBeta, ply, currentMove, depth);
                return value;
            }

            if (value > oldAlpha) {
                hashFlag = g_hashflagExact;
                alpha = value;
            }

            realEval = value;
            hashMove = currentMove;
        }
    }

    if (!moveMade) {
        // If we have no valid moves it's either stalemate or checkmate
        if (inCheck) 
            // Checkmate.
            return g_minEval + depth;
        else 
            // Stalemate
            return 0;
    }

    StoreHash(realEval, hashFlag, ply, hashMove, depth);
    
    return realEval;
}
