var g_positions1Table = [

// Winning capture on bishop
//["3q1rk1/5pbp/5Qp1/8/8/2B5/5PPP/6K1 w - - 0 44","f6g7",true],

// Winning pawn capture on rook 
["2r3k1/2r4p/1PNqb1p1/3p1p2/4p3/2Q1P2P/5PP1/1R4K1 w - - 0 37", "b6c7", true], 

// Winning rook/queen capture on pawn 
["2r3k1/2P4p/2Nqb1p1/3p1p2/4p3/2Q1P2P/5PP1/1R4K1 b - - 0 37", "c8c7", true],
//SAME?? ["2r3k1/2P4p/2Nqb1p1/3p1p2/4p3/2Q1P2P/5PP1/1R4K1 b - - 0 37", "d6c7", true], 

// Winning rook/queen capture on knight 
["6k1/2r4p/2Nqb1p1/3p1p2/4p3/2Q1P2P/5PP1/1R4K1 b - - 0 38", "c7c6", true],
//SAME?? ["6k1/2r4p/2Nqb1p1/3p1p2/4p3/2Q1P2P/5PP1/1R4K1 b - - 0 38", "d6c6", true],
["6k1/2r4p/2Nqb1p1/3p1p2/4p3/2Q1P2P/5PP1/2B3K1 b - - 0 38", "c7c6", true],

// Losing rook/queen capture on knight (revealed rook attack) 
["6k1/2r4p/2Nqb1p1/3p1p2/4p3/2Q1P2P/5PP1/2R3K1 b - - 0 38", "c7c6", false],
["6k1/2r4p/2Nqb1p1/3p1p2/4p3/2Q1P2P/5PP1/2R3K1 b - - 0 38", "d6c6", false], 

// Winning rook/queen capture on knight (revealed bishop attack) 
["4b1k1/2rq3p/2N3p1/3p1p2/4p3/2Q1P2P/5PP1/2R3K1 b - - 0 38", "c7c6", true],
//SAME?? ["4b1k1/2rq3p/2N3p1/3p1p2/4p3/2Q1P2P/5PP1/2R3K1 b - - 0 38", "d7c6", true], 

// Winning pawn capture on pawn 
//FAIL ["2r3k1/2pq3p/3P2p1/b4p2/4p3/2R1P2P/5PP1/2R3K1 w - - 0 38", "d6c7", true], 

// Losing rook capture on pawn 
["2r3k1/2pq3p/3P2p1/b4p2/4p3/2R1P2P/5PP1/2R3K1 w - - 0 38", "c3c7", false], 

// Losing queen capture on rook 
["2r3k1/2p4p/3P2p1/q4p2/4p3/2R1P2P/5PP1/2R3K1 b - - 0 38", "a5c3", false], 

// Losing rook capture on pawn 
["1br3k1/2p4p/3P2p1/q4p2/4p3/2R1P2P/5PP1/2R3K1 w - - 0 38", "c3c7", false], 

// Winning Q promotion (non-capture) 
["4rrk1/2P4p/6p1/5p2/4p3/2R1P2P/5PP1/2R3K1 w - - 0 38", "c7c8q", true], 

// Losing Q promotion (non-capture) 
//["r3rrk1/2P4p/6p1/5p2/4p3/2R1P2P/5PP1/2R3K1 w - - 0 38", "c7c8q", false],

// Knight capturing pawn defended by pawn 
["K7/8/2p5/3p4/8/4N3/8/7k w - - 0 1", "e3d5", false], 

// Knight capturing undefended pawn
["K7/8/8/3p4/8/4N3/8/7k w - - 0 1", "e3d5", true],

// Rook capturing pawn defended by knight 
["K7/4n3/8/3p4/8/3R4/3R4/7k w - - 0 1", "d3d5", false], 

// Rook capturing pawn defended by bishop 
["K7/5b2/8/3p4/8/3R4/3R4/7k w - - 0 1", "d3d5", false], 

// Rook capturing knight defended by bishop 
//FAIL ["K7/5b2/8/3n4/8/3R4/3R4/7k w - - 0 1", "d3d5", true], 

// Rook capturing rook defended by bishop 
["K7/5b2/8/3r4/8/3R4/3R4/7k w - - 0 1", "d3d5", true]

];

if (typeof module !== 'undefined' && module.exports) {
  exports.g_positions1Table = g_positions1Table;
}