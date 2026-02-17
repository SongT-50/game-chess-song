/**
 * pieces.js - 기물 정의, 유니코드 심볼, 이동 패턴
 */
(function() {
    'use strict';

    window.Chess = window.Chess || {};

    // 기물 상수
    const EMPTY = 0;
    const W_KING = 1, W_QUEEN = 2, W_ROOK = 3, W_BISHOP = 4, W_KNIGHT = 5, W_PAWN = 6;
    const B_KING = 7, B_QUEEN = 8, B_ROOK = 9, B_BISHOP = 10, B_KNIGHT = 11, B_PAWN = 12;

    const WHITE = 'white';
    const BLACK = 'black';

    // 기물 -> 색상
    function pieceColor(piece) {
        if (piece === EMPTY) return null;
        return piece <= 6 ? WHITE : BLACK;
    }

    // 기물 -> 타입 (1-6)
    function pieceType(piece) {
        if (piece === EMPTY) return EMPTY;
        return piece <= 6 ? piece : piece - 6;
    }

    // 유니코드 심볼
    const SYMBOLS = {
        [EMPTY]: '',
        [W_KING]: '♔', [W_QUEEN]: '♕', [W_ROOK]: '♖', [W_BISHOP]: '♗', [W_KNIGHT]: '♘', [W_PAWN]: '♙',
        [B_KING]: '♚', [B_QUEEN]: '♛', [B_ROOK]: '♜', [B_BISHOP]: '♝', [B_KNIGHT]: '♞', [B_PAWN]: '♟'
    };

    // 기물 이름 (한국어)
    const NAMES_KO = {
        1: '킹', 2: '퀸', 3: '룩', 4: '비숍', 5: '나이트', 6: '폰'
    };

    // SAN 문자
    const SAN_CHARS = {
        1: 'K', 2: 'Q', 3: 'R', 4: 'B', 5: 'N', 6: ''
    };

    // 기물 가치
    const VALUES = {
        1: 0,      // King: 평가에서 제외
        2: 900,    // Queen
        3: 500,    // Rook
        4: 330,    // Bishop
        5: 320,    // Knight
        6: 100     // Pawn
    };

    // 슬라이딩 방향
    const ROOK_DIRS = [[0, 1], [0, -1], [1, 0], [-1, 0]];
    const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
    const QUEEN_DIRS = [...ROOK_DIRS, ...BISHOP_DIRS];
    const KNIGHT_OFFSETS = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    const KING_OFFSETS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

    // 초기 배치
    const INITIAL_BOARD = [
        [B_ROOK, B_KNIGHT, B_BISHOP, B_QUEEN, B_KING, B_BISHOP, B_KNIGHT, B_ROOK],
        [B_PAWN, B_PAWN, B_PAWN, B_PAWN, B_PAWN, B_PAWN, B_PAWN, B_PAWN],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
        [W_PAWN, W_PAWN, W_PAWN, W_PAWN, W_PAWN, W_PAWN, W_PAWN, W_PAWN],
        [W_ROOK, W_KNIGHT, W_BISHOP, W_QUEEN, W_KING, W_BISHOP, W_KNIGHT, W_ROOK]
    ];

    // Export
    Chess.EMPTY = EMPTY;
    Chess.W_KING = W_KING; Chess.W_QUEEN = W_QUEEN; Chess.W_ROOK = W_ROOK;
    Chess.W_BISHOP = W_BISHOP; Chess.W_KNIGHT = W_KNIGHT; Chess.W_PAWN = W_PAWN;
    Chess.B_KING = B_KING; Chess.B_QUEEN = B_QUEEN; Chess.B_ROOK = B_ROOK;
    Chess.B_BISHOP = B_BISHOP; Chess.B_KNIGHT = B_KNIGHT; Chess.B_PAWN = B_PAWN;
    Chess.WHITE = WHITE; Chess.BLACK = BLACK;

    Chess.pieceColor = pieceColor;
    Chess.pieceType = pieceType;
    Chess.SYMBOLS = SYMBOLS;
    Chess.NAMES_KO = NAMES_KO;
    Chess.SAN_CHARS = SAN_CHARS;
    Chess.VALUES = VALUES;

    Chess.ROOK_DIRS = ROOK_DIRS;
    Chess.BISHOP_DIRS = BISHOP_DIRS;
    Chess.QUEEN_DIRS = QUEEN_DIRS;
    Chess.KNIGHT_OFFSETS = KNIGHT_OFFSETS;
    Chess.KING_OFFSETS = KING_OFFSETS;
    Chess.INITIAL_BOARD = INITIAL_BOARD;
})();
