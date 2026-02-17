/**
 * board.js - 게임 상태 관리, 수 실행/취소, 렌더링
 */
(function() {
    'use strict';

    var C = window.Chess;

    // 게임 상태
    var state = {
        board: null,
        turn: C.WHITE,
        castlingRights: { wK: true, wQ: true, bK: true, bQ: true },
        enPassantTarget: null,  // [row, col] or null
        moveHistory: [],
        halfMoveClock: 0,
        fullMoveNumber: 1,
        playerName: '송현진',
        playerColor: C.WHITE,
        aiLevel: 5,
        gameOver: false,
        gameResult: null
    };

    function initBoard() {
        state.board = C.INITIAL_BOARD.map(function(row) { return row.slice(); });
        state.turn = C.WHITE;
        state.castlingRights = { wK: true, wQ: true, bK: true, bQ: true };
        state.enPassantTarget = null;
        state.moveHistory = [];
        state.halfMoveClock = 0;
        state.fullMoveNumber = 1;
        state.gameOver = false;
        state.gameResult = null;
    }

    function getState() {
        return state;
    }

    function getPiece(row, col) {
        if (row < 0 || row > 7 || col < 0 || col > 7) return -1;
        return state.board[row][col];
    }

    function setPiece(row, col, piece) {
        state.board[row][col] = piece;
    }

    function inBounds(row, col) {
        return row >= 0 && row <= 7 && col >= 0 && col <= 7;
    }

    function findKing(color) {
        var target = color === C.WHITE ? C.W_KING : C.B_KING;
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                if (state.board[r][c] === target) return [r, c];
            }
        }
        return null;
    }

    /**
     * makeMove - 수 실행
     * move: { from:[r,c], to:[r,c], piece, promotion }
     * Returns: move object with undo info
     */
    function makeMove(move) {
        var b = state.board;
        var fr = move.from[0], fc = move.from[1];
        var tr = move.to[0], tc = move.to[1];
        var piece = b[fr][fc];
        var captured = b[tr][tc];
        var pt = C.pieceType(piece);
        var color = C.pieceColor(piece);

        // 이전 상태 저장 (undo용)
        move.captured = captured;
        move.piece = piece;
        move.prevCastling = Object.assign({}, state.castlingRights);
        move.prevEnPassant = state.enPassantTarget;
        move.prevHalfMove = state.halfMoveClock;
        move.isEnPassant = false;
        move.isCastling = false;
        move.promotedTo = null;

        // 앙파상 캡처
        if (pt === 6 && state.enPassantTarget &&
            tr === state.enPassantTarget[0] && tc === state.enPassantTarget[1]) {
            move.isEnPassant = true;
            var epRow = color === C.WHITE ? tr + 1 : tr - 1;
            move.epCaptured = b[epRow][tc];
            move.epRow = epRow;
            b[epRow][tc] = C.EMPTY;
            captured = move.epCaptured;
            move.captured = C.EMPTY; // to square was empty
        }

        // 캐슬링
        if (pt === 1 && Math.abs(fc - tc) === 2) {
            move.isCastling = true;
            if (tc === 6) { // 킹사이드
                b[fr][5] = b[fr][7];
                b[fr][7] = C.EMPTY;
                move.rookFrom = [fr, 7];
                move.rookTo = [fr, 5];
            } else { // 퀸사이드
                b[fr][3] = b[fr][0];
                b[fr][0] = C.EMPTY;
                move.rookFrom = [fr, 0];
                move.rookTo = [fr, 3];
            }
        }

        // 기물 이동
        b[tr][tc] = piece;
        b[fr][fc] = C.EMPTY;

        // 폰 프로모션
        if (pt === 6 && (tr === 0 || tr === 7)) {
            var promoType = move.promotion || 2; // 기본: 퀸
            var promoPiece = color === C.WHITE ? promoType : promoType + 6;
            b[tr][tc] = promoPiece;
            move.promotedTo = promoPiece;
        }

        // 앙파상 타겟 업데이트
        state.enPassantTarget = null;
        if (pt === 6 && Math.abs(fr - tr) === 2) {
            var epR = (fr + tr) / 2;
            state.enPassantTarget = [epR, fc];
        }

        // 캐슬링 권리 업데이트
        if (piece === C.W_KING) { state.castlingRights.wK = false; state.castlingRights.wQ = false; }
        if (piece === C.B_KING) { state.castlingRights.bK = false; state.castlingRights.bQ = false; }
        if (piece === C.W_ROOK && fr === 7 && fc === 7) state.castlingRights.wK = false;
        if (piece === C.W_ROOK && fr === 7 && fc === 0) state.castlingRights.wQ = false;
        if (piece === C.B_ROOK && fr === 0 && fc === 7) state.castlingRights.bK = false;
        if (piece === C.B_ROOK && fr === 0 && fc === 0) state.castlingRights.bQ = false;
        // 룩이 잡힌 경우에도 캐슬링 권리 제거
        if (tr === 7 && tc === 7) state.castlingRights.wK = false;
        if (tr === 7 && tc === 0) state.castlingRights.wQ = false;
        if (tr === 0 && tc === 7) state.castlingRights.bK = false;
        if (tr === 0 && tc === 0) state.castlingRights.bQ = false;

        // Half-move clock
        if (pt === 6 || captured !== C.EMPTY || move.isEnPassant) {
            state.halfMoveClock = 0;
        } else {
            state.halfMoveClock++;
        }

        // Full move number
        if (color === C.BLACK) {
            state.fullMoveNumber++;
        }

        // SAN 표기 생성
        move.san = generateSAN(move, piece, captured, pt, color);

        // 턴 전환
        state.turn = state.turn === C.WHITE ? C.BLACK : C.WHITE;

        // 히스토리에 추가
        state.moveHistory.push(move);

        return move;
    }

    function generateSAN(move, piece, captured, pt, color) {
        if (move.isCastling) {
            return move.to[1] === 6 ? 'O-O' : 'O-O-O';
        }

        var san = '';
        if (pt !== 6) {
            san += C.SAN_CHARS[pt];
        }

        var hasCapture = captured !== C.EMPTY || move.isEnPassant;

        if (pt === 6 && hasCapture) {
            san += String.fromCharCode(97 + move.from[1]);
        }

        if (hasCapture) {
            san += 'x';
        }

        san += String.fromCharCode(97 + move.to[1]) + (8 - move.to[0]);

        if (move.promotedTo) {
            san += '=' + C.SAN_CHARS[C.pieceType(move.promotedTo)];
        }

        return san;
    }

    /**
     * undoMove - 수 취소
     */
    function undoMove() {
        if (state.moveHistory.length === 0) return null;

        var move = state.moveHistory.pop();
        var b = state.board;
        var fr = move.from[0], fc = move.from[1];
        var tr = move.to[0], tc = move.to[1];

        // 기물 복원
        b[fr][fc] = move.piece;
        b[tr][tc] = move.captured;

        // 프로모션 복원 (원래 폰으로)
        if (move.promotedTo) {
            b[fr][fc] = move.piece;
        }

        // 앙파상 복원
        if (move.isEnPassant) {
            b[move.epRow][tc] = move.epCaptured;
            b[tr][tc] = C.EMPTY;
        }

        // 캐슬링 복원
        if (move.isCastling) {
            b[move.rookFrom[0]][move.rookFrom[1]] = b[move.rookTo[0]][move.rookTo[1]];
            b[move.rookTo[0]][move.rookTo[1]] = C.EMPTY;
        }

        // 상태 복원
        state.castlingRights = move.prevCastling;
        state.enPassantTarget = move.prevEnPassant;
        state.halfMoveClock = move.prevHalfMove;

        // 턴 복원
        state.turn = state.turn === C.WHITE ? C.BLACK : C.WHITE;

        if (C.pieceColor(move.piece) === C.BLACK) {
            state.fullMoveNumber--;
        }

        return move;
    }

    /**
     * 렌더링
     */
    function renderBoard(flipped) {
        var boardEl = document.getElementById('board');
        if (!boardEl) return;
        boardEl.innerHTML = '';

        for (var i = 0; i < 8; i++) {
            for (var j = 0; j < 8; j++) {
                var r = flipped ? 7 - i : i;
                var c = flipped ? 7 - j : j;
                var sq = document.createElement('div');
                sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
                sq.dataset.row = r;
                sq.dataset.col = c;

                var piece = state.board[r][c];
                if (piece !== C.EMPTY) {
                    var span = document.createElement('span');
                    var pc = C.pieceColor(piece);
                    var isPlayer = pc === state.playerColor;
                    span.className = 'piece ' + (isPlayer ? 'piece-player' : 'piece-ai');
                    span.textContent = C.SYMBOLS[piece];
                    sq.appendChild(span);
                }

                boardEl.appendChild(sq);
            }
        }

        // 라벨 렌더링
        renderLabels(flipped);
    }

    function renderLabels(flipped) {
        var files = ['a','b','c','d','e','f','g','h'];
        var ranks = ['8','7','6','5','4','3','2','1'];

        if (flipped) {
            files = files.slice().reverse();
            ranks = ranks.slice().reverse();
        }

        var els = ['file-labels-bottom', 'rank-labels-left'];
        var fileEl = document.getElementById('file-labels-bottom');
        var rankEl = document.getElementById('rank-labels-left');

        if (fileEl) {
            fileEl.innerHTML = '';
            files.forEach(function(f) {
                var s = document.createElement('span');
                s.textContent = f;
                fileEl.appendChild(s);
            });
        }

        if (rankEl) {
            rankEl.innerHTML = '';
            ranks.forEach(function(r) {
                var s = document.createElement('span');
                s.textContent = r;
                rankEl.appendChild(s);
            });
        }
    }

    /**
     * 잡힌 기물 계산
     */
    function getCapturedPieces() {
        var initial = {};
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                var p = C.INITIAL_BOARD[r][c];
                if (p !== C.EMPTY) initial[p] = (initial[p] || 0) + 1;
            }
        }

        var current = {};
        for (r = 0; r < 8; r++) {
            for (c = 0; c < 8; c++) {
                var p = state.board[r][c];
                if (p !== C.EMPTY) current[p] = (current[p] || 0) + 1;
            }
        }

        var whiteCaptured = []; // 백이 잡은 것 (흑 기물)
        var blackCaptured = []; // 흑이 잡은 것 (백 기물)

        for (var piece in initial) {
            piece = parseInt(piece);
            var diff = (initial[piece] || 0) - (current[piece] || 0);
            for (var i = 0; i < diff; i++) {
                if (C.pieceColor(piece) === C.WHITE) {
                    blackCaptured.push(piece);
                } else {
                    whiteCaptured.push(piece);
                }
            }
        }

        // 프로모션으로 인한 기물 수 조정: promoted pieces counted as captures
        // 정렬: 가치 높은 순
        var sortFn = function(a, b) { return C.VALUES[C.pieceType(b)] - C.VALUES[C.pieceType(a)]; };
        whiteCaptured.sort(sortFn);
        blackCaptured.sort(sortFn);

        return { white: whiteCaptured, black: blackCaptured };
    }

    function getMaterialScore() {
        var score = 0;
        for (var r = 0; r < 8; r++) {
            for (var c = 0; c < 8; c++) {
                var p = state.board[r][c];
                if (p !== C.EMPTY) {
                    var val = C.VALUES[C.pieceType(p)];
                    if (C.pieceColor(p) === C.WHITE) score += val;
                    else score -= val;
                }
            }
        }
        return score;
    }

    /**
     * 보드 복사 (AI 내부 사용)
     */
    function cloneState() {
        return {
            board: state.board.map(function(row) { return row.slice(); }),
            turn: state.turn,
            castlingRights: Object.assign({}, state.castlingRights),
            enPassantTarget: state.enPassantTarget ? state.enPassantTarget.slice() : null,
            halfMoveClock: state.halfMoveClock,
            fullMoveNumber: state.fullMoveNumber
        };
    }

    // Export
    C.initBoard = initBoard;
    C.getState = getState;
    C.getPiece = getPiece;
    C.setPiece = setPiece;
    C.inBounds = inBounds;
    C.findKing = findKing;
    C.makeMove = makeMove;
    C.undoMove = undoMove;
    C.renderBoard = renderBoard;
    C.getCapturedPieces = getCapturedPieces;
    C.getMaterialScore = getMaterialScore;
    C.cloneState = cloneState;
})();
