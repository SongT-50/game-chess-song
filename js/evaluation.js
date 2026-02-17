/**
 * evaluation.js - 보드 평가 함수, Piece-Square Tables, 포지션 분석
 * 양수 = 백 유리, 음수 = 흑 유리
 */
(function() {
    'use strict';

    var C = window.Chess;

    // Piece-Square Tables (백 기준, 흑은 반전)
    // 값 범위: -50 ~ +50 centipawns
    var PST = {
        // 폰
        6: [
            [ 0,  0,  0,  0,  0,  0,  0,  0],
            [50, 50, 50, 50, 50, 50, 50, 50],
            [10, 10, 20, 30, 30, 20, 10, 10],
            [ 5,  5, 10, 25, 25, 10,  5,  5],
            [ 0,  0,  0, 20, 20,  0,  0,  0],
            [ 5, -5,-10,  0,  0,-10, -5,  5],
            [ 5, 10, 10,-20,-20, 10, 10,  5],
            [ 0,  0,  0,  0,  0,  0,  0,  0]
        ],
        // 나이트
        5: [
            [-50,-40,-30,-30,-30,-30,-40,-50],
            [-40,-20,  0,  0,  0,  0,-20,-40],
            [-30,  0, 10, 15, 15, 10,  0,-30],
            [-30,  5, 15, 20, 20, 15,  5,-30],
            [-30,  0, 15, 20, 20, 15,  0,-30],
            [-30,  5, 10, 15, 15, 10,  5,-30],
            [-40,-20,  0,  5,  5,  0,-20,-40],
            [-50,-40,-30,-30,-30,-30,-40,-50]
        ],
        // 비숍
        4: [
            [-20,-10,-10,-10,-10,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0, 10, 10, 10, 10,  0,-10],
            [-10,  5,  5, 10, 10,  5,  5,-10],
            [-10,  0,  5, 10, 10,  5,  0,-10],
            [-10, 10, 10, 10, 10, 10, 10,-10],
            [-10,  5,  0,  0,  0,  0,  5,-10],
            [-20,-10,-10,-10,-10,-10,-10,-20]
        ],
        // 룩
        3: [
            [ 0,  0,  0,  0,  0,  0,  0,  0],
            [ 5, 10, 10, 10, 10, 10, 10,  5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [-5,  0,  0,  0,  0,  0,  0, -5],
            [ 0,  0,  0,  5,  5,  0,  0,  0]
        ],
        // 퀸
        2: [
            [-20,-10,-10, -5, -5,-10,-10,-20],
            [-10,  0,  0,  0,  0,  0,  0,-10],
            [-10,  0,  5,  5,  5,  5,  0,-10],
            [ -5,  0,  5,  5,  5,  5,  0, -5],
            [  0,  0,  5,  5,  5,  5,  0, -5],
            [-10,  5,  5,  5,  5,  5,  0,-10],
            [-10,  0,  5,  0,  0,  0,  0,-10],
            [-20,-10,-10, -5, -5,-10,-10,-20]
        ],
        // 킹 미들게임
        1: [
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-30,-40,-40,-50,-50,-40,-40,-30],
            [-20,-30,-30,-40,-40,-30,-30,-20],
            [-10,-20,-20,-20,-20,-20,-20,-10],
            [ 20, 20,  0,  0,  0,  0, 20, 20],
            [ 20, 30, 10,  0,  0, 10, 30, 20]
        ]
    };

    // 킹 엔드게임 PST
    var KING_ENDGAME_PST = [
        [-50,-40,-30,-20,-20,-30,-40,-50],
        [-30,-20,-10,  0,  0,-10,-20,-30],
        [-30,-10, 20, 30, 30, 20,-10,-30],
        [-30,-10, 30, 40, 40, 30,-10,-30],
        [-30,-10, 30, 40, 40, 30,-10,-30],
        [-30,-10, 20, 30, 30, 20,-10,-30],
        [-30,-30,  0,  0,  0,  0,-30,-30],
        [-50,-30,-30,-30,-30,-30,-30,-50]
    ];

    /**
     * 엔드게임 판별 (기물이 적을 때)
     */
    function isEndgame(board) {
        var queens = 0;
        var minorMajor = 0;
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                var pt = C.pieceType(board[r][c]);
                if (pt === 2) queens++;
                if (pt === 3 || pt === 4 || pt === 5) minorMajor++;
            }
        }
        return queens === 0 || (queens <= 2 && minorMajor <= 4);
    }

    /**
     * 기본 평가 (Level 1-3): 기물 가치만
     */
    function evaluateMaterial(board) {
        var score = 0;
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                var piece = board[r][c];
                if (piece === C.EMPTY) continue;
                var val = C.VALUES[C.pieceType(piece)];
                if (C.pieceColor(piece) === C.WHITE) score += val;
                else score -= val;
            }
        }
        return score;
    }

    /**
     * Level 4+ 평가: 기물 가치 + PST
     */
    function evaluateWithPST(board) {
        var score = 0;
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                var piece = board[r][c];
                if (piece === C.EMPTY) continue;
                var pt = C.pieceType(piece);
                var val = C.VALUES[pt];
                var pstVal = PST[pt] ? PST[pt][r][c] : 0;

                if (C.pieceColor(piece) === C.WHITE) {
                    score += val + pstVal;
                } else {
                    // 흑: 행 반전
                    var pstValB = PST[pt] ? PST[pt][7 - r][c] : 0;
                    score -= val + pstValB;
                }
            }
        }
        return score;
    }

    /**
     * Level 5+: 킹 안전 평가
     */
    function evaluateKingSafety(board) {
        var score = 0;
        score += kingSafetyForColor(board, C.WHITE);
        score -= kingSafetyForColor(board, C.BLACK);
        return score;
    }

    function kingSafetyForColor(board, color) {
        var kingPos = C.findKing(color);
        if (!kingPos) return 0;
        var kr = kingPos[0], kc = kingPos[1];
        var score = 0;
        var pawn = color === C.WHITE ? C.W_PAWN : C.B_PAWN;
        var pawnDir = color === C.WHITE ? -1 : 1;

        // 킹 앞 폰 쉴드
        for (var dc = -1; dc <= 1; dc++) {
            var pc = kc + dc;
            if (pc < 0 || pc > 7) continue;
            var pr = kr + pawnDir;
            if (pr >= 0 && pr <= 7 && board[pr][pc] === pawn) {
                score += 10;
            } else {
                // 2칸 앞
                var pr2 = kr + pawnDir * 2;
                if (pr2 >= 0 && pr2 <= 7 && board[pr2][pc] === pawn) {
                    score += 5;
                }
            }
        }

        return score;
    }

    /**
     * Level 6+: 폰 구조 평가
     */
    function evaluatePawnStructure(board) {
        var score = 0;
        for (var c = 0; c < 8; c++) {
            var wPawns = 0, bPawns = 0;
            for (var r = 0; r < 8; r++) {
                if (board[r][c] === C.W_PAWN) wPawns++;
                if (board[r][c] === C.B_PAWN) bPawns++;
            }
            // 더블 폰 페널티
            if (wPawns > 1) score -= 15 * (wPawns - 1);
            if (bPawns > 1) score += 15 * (bPawns - 1);
        }

        // 고립 폰 페널티
        for (var c = 0; c < 8; c++) {
            var hasWhite = false, hasBlack = false;
            for (var r = 0; r < 8; r++) {
                if (board[r][c] === C.W_PAWN) hasWhite = true;
                if (board[r][c] === C.B_PAWN) hasBlack = true;
            }

            if (hasWhite) {
                var isolated = true;
                for (var dc = -1; dc <= 1; dc += 2) {
                    var nc = c + dc;
                    if (nc < 0 || nc > 7) continue;
                    for (var r = 0; r < 8; r++) {
                        if (board[r][nc] === C.W_PAWN) { isolated = false; break; }
                    }
                    if (!isolated) break;
                }
                if (isolated) score -= 12;
            }

            if (hasBlack) {
                var isolated = true;
                for (var dc = -1; dc <= 1; dc += 2) {
                    var nc = c + dc;
                    if (nc < 0 || nc > 7) continue;
                    for (var r = 0; r < 8; r++) {
                        if (board[r][nc] === C.B_PAWN) { isolated = false; break; }
                    }
                    if (!isolated) break;
                }
                if (isolated) score += 12;
            }
        }

        // 패스트 폰 보너스
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                if (board[r][c] === C.W_PAWN) {
                    if (isPassedPawn(board, r, c, C.WHITE)) {
                        score += 20 + (6 - r) * 10; // 진행할수록 높은 보너스
                    }
                }
                if (board[r][c] === C.B_PAWN) {
                    if (isPassedPawn(board, r, c, C.BLACK)) {
                        score -= 20 + (r - 1) * 10;
                    }
                }
            }
        }

        return score;
    }

    function isPassedPawn(board, row, col, color) {
        var enemyPawn = color === C.WHITE ? C.B_PAWN : C.W_PAWN;
        var dir = color === C.WHITE ? -1 : 1;
        var r = row + dir;

        while (r >= 0 && r <= 7) {
            for (var dc = -1; dc <= 1; dc++) {
                var nc = col + dc;
                if (nc >= 0 && nc <= 7 && board[r][nc] === enemyPawn) return false;
            }
            r += dir;
        }
        return true;
    }

    /**
     * Level 7+: 전체 평가
     */
    function evaluateFull(board) {
        var score = evaluateWithPST(board);
        score += evaluateKingSafety(board);
        score += evaluatePawnStructure(board);

        // 비숍 페어 보너스
        var wBishops = 0, bBishops = 0;
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                if (board[r][c] === C.W_BISHOP) wBishops++;
                if (board[r][c] === C.B_BISHOP) bBishops++;
            }
        }
        if (wBishops >= 2) score += 30;
        if (bBishops >= 2) score -= 30;

        // 룩 오픈파일 보너스
        for (var c = 0; c < 8; c++) {
            var hasPawn = false;
            for (var r = 0; r < 8; r++) {
                if (C.pieceType(board[r][c]) === 6) { hasPawn = true; break; }
            }
            if (!hasPawn) {
                for (var r = 0; r < 8; r++) {
                    if (board[r][c] === C.W_ROOK) score += 15;
                    if (board[r][c] === C.B_ROOK) score -= 15;
                }
            }
        }

        return score;
    }

    /**
     * Level 9+: 엔드게임 전체 평가
     */
    function evaluateEndgame(board) {
        var score = evaluateFull(board);
        var eg = isEndgame(board);

        if (eg) {
            // 킹 PST를 엔드게임 버전으로 교체
            for (var r = 0; r < 8; r++) {
                for (var c = 0; c < 8; c++) {
                    var piece = board[r][c];
                    if (piece === C.W_KING) {
                        score -= PST[1][r][c]; // 미들게임 PST 제거
                        score += KING_ENDGAME_PST[r][c]; // 엔드게임 PST 추가
                    }
                    if (piece === C.B_KING) {
                        score += PST[1][7 - r][c];
                        score -= KING_ENDGAME_PST[7 - r][c];
                    }
                }
            }
        }

        return score;
    }

    /**
     * 레벨별 평가 함수 선택
     */
    function evaluate(board, level) {
        if (level <= 3) return evaluateMaterial(board);
        if (level <= 4) return evaluateWithPST(board);
        if (level <= 5) return evaluateWithPST(board) + evaluateKingSafety(board);
        if (level <= 6) return evaluateWithPST(board) + evaluateKingSafety(board) + evaluatePawnStructure(board);
        if (level <= 8) return evaluateFull(board);
        return evaluateEndgame(board);
    }

    // Export
    C.evaluate = evaluate;
    C.evaluateFull = evaluateFull;
    C.isEndgame = isEndgame;
    C.PST = PST;
})();
