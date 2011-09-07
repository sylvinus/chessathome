
function DebugCheckMove(hashMove) {
    var moves = new Array();
    GenerateCaptureMoves(moves, null);
    GenerateAllMoves(moves);
    for (var i = 0; i < moves.length; i++) {
        if (moves[i] == hashMove)
            return true;
    }
    return false;
}

function State() {
    this.board = new Array(256);
    for (var i = 0; i < 256; i++)
        this.board[i] = g_board[i];
    this.toMove = g_toMove;
    this.castleRights = g_castleRights;
    this.enPassentSquare = g_enPassentSquare;
    this.baseEval = g_baseEval;
    this.hashKeyLow = g_hashKeyLow;
    this.hashKeyHigh = g_hashKeyHigh;
    this.inCheck = g_inCheck;
}

State.prototype.CompareTo = function (other) {
    for (var i = 0; i < 256; i++)
        if (this.board[i] != other.board[i])
            return 1;
    if (this.toMove != other.toMove)
        return 3;
    if (this.castleRights != other.castleRights)
        return 4;
    if (this.enPassentSquare != other.enPassentSquare)
        return 5;
    if (this.baseEval != other.baseEval)
        return 6;
    if (this.hashKeyLow != other.hashKeyLow ||
        this.hashKeyHigh != other.hashKeyHigh)
        return 7;
    if (this.inCheck != other.inCheck)
        return 8;
    return 0;
}

function DebugValidate() {
    // Validate that pieceLists are correct
    for (var piece = 0; piece < 0xF; piece++) {
        for (var i = 0; i < g_pieceCount[piece]; i++) {
            var boardPiece = piece < 0x8 ? (piece | colorBlack) : piece;
            if (g_pieceList[(piece << 4) | i] == 0)
                return 1;
            if (g_board[g_pieceList[(piece << 4) | i]] != boardPiece)
                return 2;
        }
        for (var i = g_pieceCount[piece]; i < 16; i++) {
            if (g_pieceList[(piece << 4) | i] != 0)
                return 3;
        }
    }

    // Validate that board matches pieceList
    for (var i = 0; i < 256; i++) {
        var row = i >> 4;
        var col = i & 0xF;
        if (row >= 2 && row < 10 && col >= 4 && col < 12) {
            if (!(g_board[i] == 0 ||
                (g_board[i] & (colorBlack | colorWhite)) != 0)) {
                return 4;
            } else if (g_board[i] != 0) {
                if (g_pieceList[((g_board[i] & 0xF) << 4) | g_pieceIndex[i]] != i)
                    return 6;
            }
        } else {
            if (g_board[i] != 0x80)
                return 5;
        }
    }

    var hashResult = SetHash();
    if (hashResult.hashKeyLow != g_hashKeyLow ||
        hashResult.hashKeyHigh != g_hashKeyHigh) {
        return 6;
    }

    return 0;
}