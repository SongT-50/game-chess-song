/**
 * moves.js - 수 생성, 합법성 검증, 체크/메이트 판정
 */
(function() {
    'use strict';

    var C = window.Chess;

    /**
     * 특정 칸이 특정 색에 의해 공격받는지 확인
     */
    function isSquareAttacked(board, row, col, byColor) {
        var attacker, pt;
        // 나이트 체크
        for (var i = 0; i < C.KNIGHT_OFFSETS.length; i++) {
            var kr = row + C.KNIGHT_OFFSETS[i][0];
            var kc = col + C.KNIGHT_OFFSETS[i][1];
            if (kr >= 0 && kr <= 7 && kc >= 0 && kc <= 7) {
                attacker = board[kr][kc];
                if (attacker !== C.EMPTY && C.pieceColor(attacker) === byColor && C.pieceType(attacker) === 5) {
                    return true;
                }
            }
        }

        // 킹 체크
        for (i = 0; i < C.KING_OFFSETS.length; i++) {
            var or = row + C.KING_OFFSETS[i][0];
            var oc = col + C.KING_OFFSETS[i][1];
            if (or >= 0 && or <= 7 && oc >= 0 && oc <= 7) {
                attacker = board[or][oc];
                if (attacker !== C.EMPTY && C.pieceColor(attacker) === byColor && C.pieceType(attacker) === 1) {
                    return true;
                }
            }
        }

        // 폰 체크
        var pawnDir = byColor === C.WHITE ? 1 : -1;
        var pawnCols = [col - 1, col + 1];
        for (i = 0; i < 2; i++) {
            var pr = row + pawnDir;
            var pc = pawnCols[i];
            if (pr >= 0 && pr <= 7 && pc >= 0 && pc <= 7) {
                attacker = board[pr][pc];
                if (attacker !== C.EMPTY && C.pieceColor(attacker) === byColor && C.pieceType(attacker) === 6) {
                    return true;
                }
            }
        }

        // 슬라이딩: 룩/퀸 (직선)
        for (i = 0; i < C.ROOK_DIRS.length; i++) {
            var dr = C.ROOK_DIRS[i][0], dc = C.ROOK_DIRS[i][1];
            var r = row + dr, c = col + dc;
            while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                var sq = board[r][c];
                if (sq !== C.EMPTY) {
                    pt = C.pieceType(sq);
                    if (C.pieceColor(sq) === byColor && (pt === 3 || pt === 2)) {
                        return true;
                    }
                    break;
                }
                r += dr; c += dc;
            }
        }

        // 슬라이딩: 비숍/퀸 (대각선)
        for (i = 0; i < C.BISHOP_DIRS.length; i++) {
            var dr = C.BISHOP_DIRS[i][0], dc = C.BISHOP_DIRS[i][1];
            var r = row + dr, c = col + dc;
            while (r >= 0 && r <= 7 && c >= 0 && c <= 7) {
                var sq = board[r][c];
                if (sq !== C.EMPTY) {
                    pt = C.pieceType(sq);
                    if (C.pieceColor(sq) === byColor && (pt === 4 || pt === 2)) {
                        return true;
                    }
                    break;
                }
                r += dr; c += dc;
            }
        }

        return false;
    }

    function isInCheck(color) {
        var state = C.getState();
        var kingPos = C.findKing(color);
        if (!kingPos) return false;
        var enemy = color === C.WHITE ? C.BLACK : C.WHITE;
        return isSquareAttacked(state.board, kingPos[0], kingPos[1], enemy);
    }

    /**
     * 의사합법수(pseudo-legal moves) 생성
     */
    function generatePseudoLegalMoves(color) {
        var state = C.getState();
        var board = state.board;
        var moves = [];

        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                var piece = board[r][c];
                if (piece === C.EMPTY || C.pieceColor(piece) !== color) continue;

                var pt = C.pieceType(piece);

                switch (pt) {
                    case 6: // 폰
                        generatePawnMoves(board, r, c, color, state.enPassantTarget, moves);
                        break;
                    case 5: // 나이트
                        generateJumpMoves(board, r, c, color, C.KNIGHT_OFFSETS, moves);
                        break;
                    case 4: // 비숍
                        generateSlidingMoves(board, r, c, color, C.BISHOP_DIRS, moves);
                        break;
                    case 3: // 룩
                        generateSlidingMoves(board, r, c, color, C.ROOK_DIRS, moves);
                        break;
                    case 2: // 퀸
                        generateSlidingMoves(board, r, c, color, C.QUEEN_DIRS, moves);
                        break;
                    case 1: // 킹
                        generateJumpMoves(board, r, c, color, C.KING_OFFSETS, moves);
                        generateCastlingMoves(board, r, c, color, state.castlingRights, moves);
                        break;
                }
            }
        }
        return moves;
    }

    function generatePawnMoves(board, r, c, color, epTarget, moves) {
        var dir = color === C.WHITE ? -1 : 1;
        var startRow = color === C.WHITE ? 6 : 1;
        var promoRow = color === C.WHITE ? 0 : 7;

        // 1칸 전진
        var nr = r + dir;
        if (nr >= 0 && nr <= 7 && board[nr][c] === C.EMPTY) {
            if (nr === promoRow) {
                addPromotionMoves(r, c, nr, c, moves);
            } else {
                moves.push({ from: [r, c], to: [nr, c] });
                // 2칸 전진
                if (r === startRow) {
                    var nr2 = r + dir * 2;
                    if (board[nr2][c] === C.EMPTY) {
                        moves.push({ from: [r, c], to: [nr2, c] });
                    }
                }
            }
        }

        // 대각선 캡처
        var capCols = [c - 1, c + 1];
        for (var i = 0; i < 2; i++) {
            var nc = capCols[i];
            if (nc < 0 || nc > 7) continue;
            var target = board[nr][nc];
            if (target !== C.EMPTY && C.pieceColor(target) !== color) {
                if (nr === promoRow) {
                    addPromotionMoves(r, c, nr, nc, moves);
                } else {
                    moves.push({ from: [r, c], to: [nr, nc] });
                }
            }
            // 앙파상
            if (epTarget && epTarget[0] === nr && epTarget[1] === nc) {
                moves.push({ from: [r, c], to: [nr, nc] });
            }
        }
    }

    function addPromotionMoves(fr, fc, tr, tc, moves) {
        [2, 3, 4, 5].forEach(function(promo) {
            moves.push({ from: [fr, fc], to: [tr, tc], promotion: promo });
        });
    }

    function generateJumpMoves(board, r, c, color, offsets, moves) {
        for (var i = 0; i < offsets.length; i++) {
            var nr = r + offsets[i][0];
            var nc = c + offsets[i][1];
            if (nr < 0 || nr > 7 || nc < 0 || nc > 7) continue;
            var target = board[nr][nc];
            if (target === C.EMPTY || C.pieceColor(target) !== color) {
                moves.push({ from: [r, c], to: [nr, nc] });
            }
        }
    }

    function generateSlidingMoves(board, r, c, color, dirs, moves) {
        for (var i = 0; i < dirs.length; i++) {
            var dr = dirs[i][0], dc = dirs[i][1];
            var nr = r + dr, nc = c + dc;
            while (nr >= 0 && nr <= 7 && nc >= 0 && nc <= 7) {
                var target = board[nr][nc];
                if (target === C.EMPTY) {
                    moves.push({ from: [r, c], to: [nr, nc] });
                } else {
                    if (C.pieceColor(target) !== color) {
                        moves.push({ from: [r, c], to: [nr, nc] });
                    }
                    break;
                }
                nr += dr; nc += dc;
            }
        }
    }

    function generateCastlingMoves(board, r, c, color, castling, moves) {
        var enemy = color === C.WHITE ? C.BLACK : C.WHITE;

        // 체크 중이면 캐슬링 불가
        if (isSquareAttacked(board, r, c, enemy)) return;

        if (color === C.WHITE) {
            // 킹사이드
            if (castling.wK && board[7][5] === C.EMPTY && board[7][6] === C.EMPTY &&
                board[7][7] === C.W_ROOK &&
                !isSquareAttacked(board, 7, 5, enemy) && !isSquareAttacked(board, 7, 6, enemy)) {
                moves.push({ from: [7, 4], to: [7, 6] });
            }
            // 퀸사이드
            if (castling.wQ && board[7][3] === C.EMPTY && board[7][2] === C.EMPTY && board[7][1] === C.EMPTY &&
                board[7][0] === C.W_ROOK &&
                !isSquareAttacked(board, 7, 3, enemy) && !isSquareAttacked(board, 7, 2, enemy)) {
                moves.push({ from: [7, 4], to: [7, 2] });
            }
        } else {
            // 킹사이드
            if (castling.bK && board[0][5] === C.EMPTY && board[0][6] === C.EMPTY &&
                board[0][7] === C.B_ROOK &&
                !isSquareAttacked(board, 0, 5, enemy) && !isSquareAttacked(board, 0, 6, enemy)) {
                moves.push({ from: [0, 4], to: [0, 6] });
            }
            // 퀸사이드
            if (castling.bQ && board[0][3] === C.EMPTY && board[0][2] === C.EMPTY && board[0][1] === C.EMPTY &&
                board[0][0] === C.B_ROOK &&
                !isSquareAttacked(board, 0, 3, enemy) && !isSquareAttacked(board, 0, 2, enemy)) {
                moves.push({ from: [0, 4], to: [0, 2] });
            }
        }
    }

    /**
     * 합법수 생성 - pseudo-legal 수에서 체크를 회피하지 못하는 수를 제거
     */
    function generateLegalMoves(color) {
        var pseudoMoves = generatePseudoLegalMoves(color);
        var legalMoves = [];

        for (var i = 0; i < pseudoMoves.length; i++) {
            var move = pseudoMoves[i];
            // 수를 실행해보고 자신의 킹이 체크인지 확인
            C.makeMove(move);
            if (!isInCheck(color)) {
                legalMoves.push(move);
            }
            C.undoMove();
        }

        return legalMoves;
    }

    /**
     * 특정 칸에서 출발하는 합법수
     */
    function getLegalMovesFrom(row, col) {
        var piece = C.getPiece(row, col);
        if (piece === C.EMPTY) return [];
        var color = C.pieceColor(piece);
        var all = generateLegalMoves(color);
        return all.filter(function(m) {
            return m.from[0] === row && m.from[1] === col;
        });
    }

    /**
     * 게임 종료 조건 체크
     * Returns: null | { type: 'checkmate'|'stalemate'|'draw50'|'insufficient', winner: color|null }
     */
    function checkGameEnd(color) {
        var legalMoves = generateLegalMoves(color);

        if (legalMoves.length === 0) {
            if (isInCheck(color)) {
                var winner = color === C.WHITE ? C.BLACK : C.WHITE;
                return { type: 'checkmate', winner: winner };
            } else {
                return { type: 'stalemate', winner: null };
            }
        }

        // 50수 규칙
        if (C.getState().halfMoveClock >= 100) {
            return { type: 'draw50', winner: null };
        }

        // 기물 부족
        if (isInsufficientMaterial()) {
            return { type: 'insufficient', winner: null };
        }

        return null;
    }

    function isInsufficientMaterial() {
        var state = C.getState();
        var board = state.board;
        var whitePieces = [];
        var blackPieces = [];

        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                var p = board[r][c];
                if (p === C.EMPTY) continue;
                if (C.pieceColor(p) === C.WHITE) whitePieces.push(C.pieceType(p));
                else blackPieces.push(C.pieceType(p));
            }
        }

        // King vs King
        if (whitePieces.length === 1 && blackPieces.length === 1) return true;
        // King+Bishop vs King, King+Knight vs King
        if (whitePieces.length === 1 && blackPieces.length === 2) {
            if (blackPieces.indexOf(4) !== -1 || blackPieces.indexOf(5) !== -1) return true;
        }
        if (blackPieces.length === 1 && whitePieces.length === 2) {
            if (whitePieces.indexOf(4) !== -1 || whitePieces.indexOf(5) !== -1) return true;
        }

        return false;
    }

    // Export
    C.isSquareAttacked = isSquareAttacked;
    C.isInCheck = isInCheck;
    C.generateLegalMoves = generateLegalMoves;
    C.generatePseudoLegalMoves = generatePseudoLegalMoves;
    C.getLegalMovesFrom = getLegalMovesFrom;
    C.checkGameEnd = checkGameEnd;
})();
