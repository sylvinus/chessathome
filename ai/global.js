
var g_debug = true;
var g_timeout = 40;


//
// Searching code
//

var g_startTime;

var g_nodeCount;
var g_qNodeCount;
var g_searchValid;
var g_globalPly = 0;


var g_minEval = -2000000;
var g_maxEval = +2000000;

var g_minMateBuffer = g_minEval + 2000;
var g_maxMateBuffer = g_maxEval - 2000;

var g_materialTable = [0, 800, 3350, 3450, 5000, 9750, 600000];

var g_pawnAdg =
  [
    0, 0, 0, 0, 0, 0, 0, 0,
    -25, 105, 135, 270, 270, 135, 105, -25,
    -80, 0, 30, 176, 176, 30, 0, -80,
    -85, -5, 25, 175, 175, 25, -5, -85,
    -90, -10, 20, 125, 125, 20, -10, -90,
    -95, -15, 15, 75, 75, 15, -15, -95, 
    -100, -20, 10, 70, 70, 10, -20, -100, 
    0, 0, 0, 0, 0, 0, 0, 0
  ];

var g_knightAdj =
  [
    -200, -100, -50, -50, -50, -50, -100, -200,
    -100, 0, 0, 0, 0, 0, 0, -100,
    -50, 0, 60, 60, 60, 60, 0, -50,
    -50, 0, 30, 60, 60, 30, 0, -50,
    -50, 0, 30, 60, 60, 30, 0, -50,
    -50, 0, 30, 30, 30, 30, 0, -50,
    -100, 0, 0, 0, 0, 0, 0, -100,
    -200, -50, -25, -25, -25, -25, -50, -200
  ];

var g_bishopAdj =
  [
    -50,-50,-25,-10,-10,-25,-50,-50,
    -50,-25,-10,  0,  0,-10,-25,-50,
    -25,-10,  0, 25, 25,  0,-10,-25,
    -10,  0, 25, 40, 40, 25,  0,-10,
    -10,  0, 25, 40, 40, 25,  0,-10,
    -25,-10,  0, 25, 25,  0,-10,-25,
    -50,-25,-10,  0,  0,-10,-25,-50,
    -50,-50,-25,-10,-10,-25,-50,-50
  ];

var g_rookAdj =
  [
    -60, -30, -10, 20, 20, -10, -30, -60,
    40,  70,  90,120,120,  90,  70,  40,
    -60, -30, -10, 20, 20, -10, -30, -60,
    -60, -30, -10, 20, 20, -10, -30, -60,
    -60, -30, -10, 20, 20, -10, -30, -60,
    -60, -30, -10, 20, 20, -10, -30, -60,
    -60, -30, -10, 20, 20, -10, -30, -60,
    -60, -30, -10, 20, 20, -10, -30, -60
  ];

var g_kingAdj =
  [
    50, 150, -25, -125, -125, -25, 150, 50,
    50, 150, -25, -125, -125, -25, 150, 50,
    50, 150, -25, -125, -125, -25, 150, 50,
    50, 150, -25, -125, -125, -25, 150, 50,
    50, 150, -25, -125, -125, -25, 150, 50,
    50, 150, -25, -125, -125, -25, 150, 50,
    50, 150, -25, -125, -125, -25, 150, 50,
    150, 250, 75, -25, -25, 75, 250, 150
  ];

var g_emptyAdj =
  [
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
    0, 0, 0, 0, 0, 0, 0, 0, 
  ];

var g_pieceSquareAdj = new Array(8);

// Returns the square flipped
var g_flipTable = new Array(256);


// 
// Board code
//

// This somewhat funky scheme means that a piece is indexed by it's lower 4 bits when accessing in arrays.  The fifth bit (black bit)
// is used to allow quick edge testing on the board.
var g_colorBlack = 0x10;
var g_colorWhite = 0x08;

var g_pieceEmpty = 0x00;
var g_piecePawn = 0x01;
var g_pieceKnight = 0x02;
var g_pieceBishop = 0x03;
var g_pieceRook = 0x04;
var g_pieceQueen = 0x05;
var g_pieceKing = 0x06;

var g_vectorDelta = new Array(256);

var g_bishopDeltas = [-15, -17, 15, 17];
var g_knightDeltas = [31, 33, 14, -14, -31, -33, 18, -18];
var g_rookDeltas = [-1, +1, -16, +16];
var g_queenDeltas = [-1, +1, -15, +15, -17, +17, -16, +16];

var g_castleRightsMask = [
0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
0, 0, 0, 0, 7,15,15,15, 3,15,15,11, 0, 0, 0, 0,
0, 0, 0, 0,15,15,15,15,15,15,15,15, 0, 0, 0, 0,
0, 0, 0, 0,15,15,15,15,15,15,15,15, 0, 0, 0, 0,
0, 0, 0, 0,15,15,15,15,15,15,15,15, 0, 0, 0, 0,
0, 0, 0, 0,15,15,15,15,15,15,15,15, 0, 0, 0, 0,
0, 0, 0, 0,15,15,15,15,15,15,15,15, 0, 0, 0, 0,
0, 0, 0, 0,15,15,15,15,15,15,15,15, 0, 0, 0, 0,
0, 0, 0, 0,13,15,15,15,12,15,15,14, 0, 0, 0, 0,
0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

var g_moveflagEPC = 0x2 << 16;
var g_moveflagCastleKing = 0x4 << 16;
var g_moveflagCastleQueen = 0x8 << 16;
var g_moveflagPromotion = 0x10 << 16;
var g_moveflagPromoteKnight = 0x20 << 16;
var g_moveflagPromoteQueen = 0x40 << 16;
var g_moveflagPromoteBishop = 0x80 << 16;


// Position variables
var g_board = new Array(256); // Sentinel 0x80, pieces are in low 4 bits, 0x8 for color, 0x7 bits for piece type
var g_toMove; // side to move, 0 or 8, 0 = black, 8 = white
var g_castleRights; // bitmask representing castling rights, 1 = wk, 2 = wq, 4 = bk, 8 = bq
var g_enPassentSquare;
var g_baseEval;
var g_hashKeyLow, g_hashKeyHigh;
var g_inCheck;

// Utility variables
var g_moveCount = 0;
var g_moveUndoStack = new Array();

var g_move50 = 0;
var g_repMoveStack = new Array();

var g_hashSize = 1 << 22;
var g_hashMask = g_hashSize - 1;
var g_hashTable;

var g_killers;
var g_historyTable = new Array(32);

var g_zobristLow;
var g_zobristHigh;
var g_zobristBlackLow;
var g_zobristBlackHigh;

// Evaulation variables
var g_mobUnit;

var g_hashflagAlpha = 1;
var g_hashflagBeta = 2;
var g_hashflagExact = 3;



var g_pieceIndex = new Array(256);
var g_pieceList = new Array(2 * 8 * 16);
var g_pieceCount = new Array(2 * 8);


var g_seeValues = [0, 1, 3, 3, 5, 9, 900, 0,
                    0, 1, 3, 3, 5, 9, 900, 0];


var g_needsReset = true;

