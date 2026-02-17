/**
 * ai.js - Minimax + Alpha-Beta Pruning, 10단계 난이도
 */
(function() {
    'use strict';

    var C = window.Chess;

    // 레벨 설정
    var LEVEL_CONFIG = {
        1:  { depth: 1, randomPct: 70, useAlphaBeta: false, moveOrdering: false, openingBook: false, quiescence: false },
        2:  { depth: 1, randomPct: 50, useAlphaBeta: false, moveOrdering: false, openingBook: false, quiescence: false },
        3:  { depth: 2, randomPct: 30, useAlphaBeta: false, moveOrdering: false, openingBook: false, quiescence: false },
        4:  { depth: 2, randomPct: 0,  useAlphaBeta: true,  moveOrdering: false, openingBook: false, quiescence: false },
        5:  { depth: 3, randomPct: 0,  useAlphaBeta: true,  moveOrdering: false, openingBook: false, quiescence: false },
        6:  { depth: 3, randomPct: 0,  useAlphaBeta: true,  moveOrdering: true,  openingBook: false, quiescence: false },
        7:  { depth: 4, randomPct: 0,  useAlphaBeta: true,  moveOrdering: true,  openingBook: false, quiescence: false },
        8:  { depth: 4, randomPct: 0,  useAlphaBeta: true,  moveOrdering: true,  openingBook: true,  quiescence: false },
        9:  { depth: 5, randomPct: 0,  useAlphaBeta: true,  moveOrdering: true,  openingBook: true,  quiescence: false },
        10: { depth: 5, randomPct: 0,  useAlphaBeta: true,  moveOrdering: true,  openingBook: true,  quiescence: true  }
    };

    // 레벨 이름
    var LEVEL_NAMES = {
        1: '아기', 2: '초보', 3: '입문', 4: '초급', 5: '중급',
        6: '중상급', 7: '상급', 8: '고급', 9: '마스터', 10: '그랜드마스터'
    };

    // 오프닝북 (간단한 ECO 변형)
    var OPENING_BOOK = {};
    function initOpeningBook() {
        // 키: "from-to,from-to,..." 형태의 이동 시퀀스
        // E4 오프닝
        OPENING_BOOK[''] = [
            { from: [6,4], to: [4,4] }, // e4
            { from: [6,3], to: [4,3] }, // d4
            { from: [7,6], to: [5,5] }, // Nf3
            { from: [6,2], to: [4,2] }  // c4
        ];
        // e4 이후
        OPENING_BOOK['6,4-4,4'] = [
            { from: [1,4], to: [3,4] }, // e5
            { from: [1,2], to: [3,2] }, // c5 (시실리안)
            { from: [1,4], to: [2,4] }, // e6 (프렌치)
            { from: [1,2], to: [2,2] }  // c6 (카로칸)
        ];
        // d4 이후
        OPENING_BOOK['6,3-4,3'] = [
            { from: [1,3], to: [3,3] }, // d5
            { from: [0,6], to: [2,5] }, // Nf6
            { from: [1,4], to: [2,4] }  // e6
        ];
        // e4 e5
        OPENING_BOOK['6,4-4,4|1,4-3,4'] = [
            { from: [7,6], to: [5,5] }, // Nf3
            { from: [7,1], to: [5,2] }, // Nc3
            { from: [7,5], to: [4,2] }  // Bc4
        ];
        // e4 e5 Nf3
        OPENING_BOOK['6,4-4,4|1,4-3,4|7,6-5,5'] = [
            { from: [0,1], to: [2,2] }, // Nc6
            { from: [0,6], to: [2,5] }  // Nf6 (페트로프)
        ];
        // d4 d5
        OPENING_BOOK['6,3-4,3|1,3-3,3'] = [
            { from: [6,2], to: [4,2] }, // c4 (퀸즈 갬빗)
            { from: [7,6], to: [5,5] }, // Nf3
            { from: [7,1], to: [5,2] }  // Nc3
        ];
        // Nf3 이후
        OPENING_BOOK['7,6-5,5'] = [
            { from: [1,3], to: [3,3] }, // d5
            { from: [0,6], to: [2,5] }, // Nf6
            { from: [1,2], to: [3,2] }  // c5
        ];
        // c4 이후
        OPENING_BOOK['6,2-4,2'] = [
            { from: [1,4], to: [3,4] }, // e5
            { from: [0,6], to: [2,5] }, // Nf6
            { from: [1,2], to: [3,2] }  // c5
        ];
    }
    initOpeningBook();

    function getMoveKey(history) {
        return history.map(function(m) {
            return m.from[0] + ',' + m.from[1] + '-' + m.to[0] + ',' + m.to[1];
        }).join('|');
    }

    // Transposition Table (Level 10)
    var transpositionTable = {};
    var TT_EXACT = 0, TT_ALPHA = 1, TT_BETA = 2;

    function hashBoard(state) {
        // 간단한 해시 (실제 Zobrist 대신)
        var h = '';
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                h += state.board[r][c].toString(16);
            }
        }
        h += state.turn[0];
        h += (state.castlingRights.wK ? '1' : '0');
        h += (state.castlingRights.wQ ? '1' : '0');
        h += (state.castlingRights.bK ? '1' : '0');
        h += (state.castlingRights.bQ ? '1' : '0');
        if (state.enPassantTarget) h += state.enPassantTarget[0] + '' + state.enPassantTarget[1];
        return h;
    }

    /**
     * 수 정렬 (Level 6+): 캡처, 프로모션, 체크 우선
     */
    function orderMoves(moves, board, level) {
        if (!LEVEL_CONFIG[level].moveOrdering) return moves;

        return moves.slice().sort(function(a, b) {
            return scoreMoveForOrdering(b, board) - scoreMoveForOrdering(a, board);
        });
    }

    function scoreMoveForOrdering(move, board) {
        var score = 0;
        var captured = board[move.to[0]][move.to[1]];
        var piece = board[move.from[0]][move.from[1]];

        // MVV-LVA (Most Valuable Victim - Least Valuable Attacker)
        if (captured !== C.EMPTY) {
            score += C.VALUES[C.pieceType(captured)] * 10 - C.VALUES[C.pieceType(piece)];
        }

        // 프로모션
        if (move.promotion) {
            score += C.VALUES[move.promotion];
        }

        // 중앙으로의 이동 보너스
        var tr = move.to[0], tc = move.to[1];
        if (tr >= 2 && tr <= 5 && tc >= 2 && tc <= 5) {
            score += 5;
        }

        return score;
    }

    /**
     * Quiescence Search (Level 10): 캡처만 확장 탐색
     */
    function quiescence(alpha, beta, color, level, depth) {
        var state = C.getState();
        var standPat = C.evaluate(state.board, level);
        if (color === -1) standPat = -standPat;

        if (standPat >= beta) return beta;
        if (standPat > alpha) alpha = standPat;

        if (depth <= -4) return alpha; // 최대 깊이 제한

        var moves = C.generateLegalMoves(color === 1 ? C.WHITE : C.BLACK);

        // 캡처만 필터링
        var captures = moves.filter(function(m) {
            return state.board[m.to[0]][m.to[1]] !== C.EMPTY || m.promotion;
        });

        captures = orderMoves(captures, state.board, level);

        for (var i = 0; i < captures.length; i++) {
            C.makeMove(captures[i]);
            var score = -quiescence(-beta, -alpha, -color, level, depth - 1);
            C.undoMove();

            if (score >= beta) return beta;
            if (score > alpha) alpha = score;
        }

        return alpha;
    }

    /**
     * Minimax with Alpha-Beta Pruning
     */
    function minimax(depth, alpha, beta, isMaximizing, level) {
        var state = C.getState();
        var turnColor = isMaximizing ? C.WHITE : C.BLACK;

        // 게임 종료 체크
        var endResult = C.checkGameEnd(turnColor);
        if (endResult) {
            if (endResult.type === 'checkmate') {
                return isMaximizing ? -99999 - depth : 99999 + depth;
            }
            return 0; // 무승부
        }

        // 리프 노드
        if (depth === 0) {
            if (LEVEL_CONFIG[level].quiescence) {
                var colorSign = isMaximizing ? 1 : -1;
                return quiescence(alpha, beta, colorSign, level, 0) * colorSign;
            }
            return C.evaluate(state.board, level);
        }

        // Transposition Table 조회 (Level 10)
        var hash, ttEntry;
        if (level >= 10) {
            hash = hashBoard(state);
            ttEntry = transpositionTable[hash];
            if (ttEntry && ttEntry.depth >= depth) {
                if (ttEntry.flag === TT_EXACT) return ttEntry.score;
                if (ttEntry.flag === TT_ALPHA && ttEntry.score <= alpha) return alpha;
                if (ttEntry.flag === TT_BETA && ttEntry.score >= beta) return beta;
            }
        }

        var moves = C.generateLegalMoves(turnColor);
        moves = orderMoves(moves, state.board, level);

        var bestScore;
        var origAlpha = alpha;

        if (isMaximizing) {
            bestScore = -Infinity;
            for (var i = 0; i < moves.length; i++) {
                C.makeMove(moves[i]);
                var score = minimax(depth - 1, alpha, beta, false, level);
                C.undoMove();
                if (score > bestScore) bestScore = score;
                if (LEVEL_CONFIG[level].useAlphaBeta) {
                    alpha = Math.max(alpha, score);
                    if (beta <= alpha) break;
                }
            }
        } else {
            bestScore = Infinity;
            for (var i = 0; i < moves.length; i++) {
                C.makeMove(moves[i]);
                var score = minimax(depth - 1, alpha, beta, true, level);
                C.undoMove();
                if (score < bestScore) bestScore = score;
                if (LEVEL_CONFIG[level].useAlphaBeta) {
                    beta = Math.min(beta, score);
                    if (beta <= alpha) break;
                }
            }
        }

        // Transposition Table 저장
        if (level >= 10 && hash) {
            var flag = TT_EXACT;
            if (bestScore <= origAlpha) flag = TT_ALPHA;
            else if (bestScore >= beta) flag = TT_BETA;
            transpositionTable[hash] = { score: bestScore, depth: depth, flag: flag };
        }

        return bestScore;
    }

    /**
     * Iterative Deepening (Level 10)
     */
    function iterativeDeepening(aiColor, level, maxTime) {
        var startTime = Date.now();
        var bestMove = null;
        var maxDepth = LEVEL_CONFIG[level].depth;

        transpositionTable = {};

        for (var d = 1; d <= maxDepth + 2; d++) {
            var moves = C.generateLegalMoves(aiColor);
            moves = orderMoves(moves, C.getState().board, level);

            var isMax = aiColor === C.WHITE;
            var bestScore = isMax ? -Infinity : Infinity;
            var currentBest = null;

            for (var i = 0; i < moves.length; i++) {
                if (Date.now() - startTime > maxTime) {
                    return bestMove || currentBest || moves[0];
                }

                C.makeMove(moves[i]);
                var score = minimax(d - 1, -Infinity, Infinity, !isMax, level);
                C.undoMove();

                if (isMax ? score > bestScore : score < bestScore) {
                    bestScore = score;
                    currentBest = moves[i];
                }
            }

            if (currentBest) bestMove = currentBest;
        }

        return bestMove;
    }

    /**
     * AI 수 계산 - 메인 함수
     */
    function getBestMove(level) {
        var state = C.getState();
        var aiColor = state.turn;
        var config = LEVEL_CONFIG[level];

        // 오프닝북 체크 (Level 8+)
        if (config.openingBook && state.moveHistory.length < 12) {
            var key = getMoveKey(state.moveHistory);
            var bookMoves = OPENING_BOOK[key];
            if (bookMoves && bookMoves.length > 0) {
                // 합법수인지 확인
                var legalMoves = C.generateLegalMoves(aiColor);
                var validBook = bookMoves.filter(function(bm) {
                    return legalMoves.some(function(lm) {
                        return lm.from[0] === bm.from[0] && lm.from[1] === bm.from[1] &&
                               lm.to[0] === bm.to[0] && lm.to[1] === bm.to[1];
                    });
                });
                if (validBook.length > 0) {
                    var chosen = validBook[Math.floor(Math.random() * validBook.length)];
                    // 합법수 객체 반환
                    return legalMoves.find(function(lm) {
                        return lm.from[0] === chosen.from[0] && lm.from[1] === chosen.from[1] &&
                               lm.to[0] === chosen.to[0] && lm.to[1] === chosen.to[1];
                    });
                }
            }
        }

        var legalMoves = C.generateLegalMoves(aiColor);
        if (legalMoves.length === 0) return null;
        if (legalMoves.length === 1) return legalMoves[0];

        // 랜덤 비율 적용 (Level 1-3)
        if (config.randomPct > 0 && Math.random() * 100 < config.randomPct) {
            return legalMoves[Math.floor(Math.random() * legalMoves.length)];
        }

        // Level 10: Iterative Deepening
        if (level === 10) {
            return iterativeDeepening(aiColor, level, 2500);
        }

        // 일반 Minimax
        var isMax = aiColor === C.WHITE;
        var bestScore = isMax ? -Infinity : Infinity;
        var bestMoves = [];

        legalMoves = orderMoves(legalMoves, state.board, level);

        for (var i = 0; i < legalMoves.length; i++) {
            C.makeMove(legalMoves[i]);
            var score = minimax(config.depth - 1, -Infinity, Infinity, !isMax, level);
            C.undoMove();

            if (isMax ? score > bestScore : score < bestScore) {
                bestScore = score;
                bestMoves = [legalMoves[i]];
            } else if (score === bestScore) {
                bestMoves.push(legalMoves[i]);
            }
        }

        // 동점인 수 중 랜덤 선택
        return bestMoves[Math.floor(Math.random() * bestMoves.length)];
    }

    // Export
    C.getBestMove = getBestMove;
    C.LEVEL_CONFIG = LEVEL_CONFIG;
    C.LEVEL_NAMES = LEVEL_NAMES;
})();
