/**
 * ui.js - 클릭 이동, 드래그&드롭, 하이라이트, 턴 표시, 응원 연동
 */
(function() {
    'use strict';

    var C = window.Chess;

    var selectedSquare = null;
    var legalMovesForSelected = [];
    var lastMoveFrom = null;
    var lastMoveTo = null;
    var isDragging = false;
    var dragPieceEl = null;
    var dragFromSquare = null;
    var pendingPromotion = null;
    var isFlipped = false;
    var isAnimating = false;
    var inputLocked = false;
    var initialized = false;

    function init() {
        selectedSquare = null;
        legalMovesForSelected = [];
        lastMoveFrom = null;
        lastMoveTo = null;
        isDragging = false;
        inputLocked = false;

        if (initialized) return;
        initialized = true;

        var boardEl = document.getElementById('board');
        boardEl.addEventListener('mousedown', onMouseDown);
        boardEl.addEventListener('touchstart', onTouchStart, { passive: false });
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    }

    function setFlipped(flipped) {
        isFlipped = flipped;
    }

    function lockInput() { inputLocked = true; }
    function unlockInput() { inputLocked = false; }

    // ========== 턴 표시 업데이트 ==========
    function updateTurnIndicator() {
        var state = C.getState();
        var topBar = document.getElementById('top-bar');
        var bottomBar = document.getElementById('bottom-bar');

        var playerIsBottom = true; // 플레이어가 항상 하단

        var isPlayerTurnNow = state.turn === state.playerColor;

        topBar.classList.toggle('active-turn', !isPlayerTurnNow);
        bottomBar.classList.toggle('active-turn', isPlayerTurnNow);
    }

    // ========== 클릭 & 드래그 ==========
    function getSquareFromEvent(e) {
        var boardEl = document.getElementById('board');
        var rect = boardEl.getBoundingClientRect();
        var x, y;
        if (e.touches) {
            x = e.touches[0].clientX - rect.left;
            y = e.touches[0].clientY - rect.top;
        } else {
            x = e.clientX - rect.left;
            y = e.clientY - rect.top;
        }
        var sqSize = rect.width / 8;
        var col = Math.floor(x / sqSize);
        var row = Math.floor(y / sqSize);
        if (col < 0 || col > 7 || row < 0 || row > 7) return null;
        if (isFlipped) {
            row = 7 - row;
            col = 7 - col;
        }
        return { row: row, col: col };
    }

    function onMouseDown(e) {
        if (inputLocked || isAnimating) return;
        var sq = getSquareFromEvent(e);
        if (!sq) return;
        handleSquareDown(sq.row, sq.col, e);
    }

    function onTouchStart(e) {
        if (inputLocked || isAnimating) return;
        var sq = getSquareFromEvent(e);
        if (!sq) return;
        e.preventDefault();
        handleSquareDown(sq.row, sq.col, e);
    }

    function handleSquareDown(row, col, e) {
        var state = C.getState();
        if (state.gameOver) return;
        var piece = C.getPiece(row, col);
        var color = C.pieceColor(piece);

        if (selectedSquare) {
            var isLegal = legalMovesForSelected.find(function(m) {
                return m.to[0] === row && m.to[1] === col;
            });

            if (isLegal) {
                handleMove(isLegal);
                return;
            }
        }

        if (piece !== C.EMPTY && color === state.turn && isPlayerTurn()) {
            selectSquare(row, col);
            startDrag(row, col, e);
        } else {
            clearSelection();
        }
    }

    function onMouseMove(e) {
        if (!isDragging || !dragPieceEl) return;
        moveDrag(e.clientX, e.clientY);
    }

    function onTouchMove(e) {
        if (!isDragging || !dragPieceEl) return;
        e.preventDefault();
        moveDrag(e.touches[0].clientX, e.touches[0].clientY);
    }

    function onMouseUp(e) {
        if (!isDragging) return;
        var sq = getSquareFromEvent(e);
        endDrag(sq);
    }

    function onTouchEnd(e) {
        if (!isDragging) return;
        var lastTouch = e.changedTouches[0];
        var boardEl = document.getElementById('board');
        var rect = boardEl.getBoundingClientRect();
        var x = lastTouch.clientX - rect.left;
        var y = lastTouch.clientY - rect.top;
        var sqSize = rect.width / 8;
        var col = Math.floor(x / sqSize);
        var row = Math.floor(y / sqSize);
        var sq = null;
        if (col >= 0 && col <= 7 && row >= 0 && row <= 7) {
            if (isFlipped) { row = 7 - row; col = 7 - col; }
            sq = { row: row, col: col };
        }
        endDrag(sq);
    }

    function startDrag(row, col, e) {
        isDragging = true;
        dragFromSquare = { row: row, col: col };

        var piece = C.getPiece(row, col);
        var state = C.getState();
        var isPlayer = C.pieceColor(piece) === state.playerColor;
        dragPieceEl = document.createElement('div');
        dragPieceEl.className = 'piece-dragging ' + (isPlayer ? 'piece-player' : 'piece-ai');
        dragPieceEl.textContent = C.SYMBOLS[piece];
        document.body.appendChild(dragPieceEl);

        var sqEl = getSquareElement(row, col);
        if (sqEl) sqEl.classList.add('drag-from');

        var x, y;
        if (e.touches) {
            x = e.touches[0].clientX;
            y = e.touches[0].clientY;
        } else {
            x = e.clientX;
            y = e.clientY;
        }
        moveDrag(x, y);
    }

    function moveDrag(x, y) {
        if (!dragPieceEl) return;
        var boardEl = document.getElementById('board');
        var rect = boardEl.getBoundingClientRect();
        var sqSize = rect.width / 8;
        dragPieceEl.style.left = (x - sqSize * 0.4) + 'px';
        dragPieceEl.style.top = (y - sqSize * 0.4) + 'px';
    }

    function endDrag(sq) {
        isDragging = false;

        if (dragPieceEl) {
            dragPieceEl.remove();
            dragPieceEl = null;
        }

        if (dragFromSquare) {
            var sqEl = getSquareElement(dragFromSquare.row, dragFromSquare.col);
            if (sqEl) sqEl.classList.remove('drag-from');
        }

        if (sq && dragFromSquare) {
            var move = legalMovesForSelected.find(function(m) {
                return m.to[0] === sq.row && m.to[1] === sq.col;
            });
            if (move) {
                handleMove(move);
            }
        }

        dragFromSquare = null;
    }

    function isPlayerTurn() {
        var state = C.getState();
        return state.turn === state.playerColor;
    }

    // ========== 선택 & 하이라이트 ==========
    function selectSquare(row, col) {
        clearSelection();
        selectedSquare = { row: row, col: col };
        legalMovesForSelected = C.getLegalMovesFrom(row, col);

        var sqEl = getSquareElement(row, col);
        if (sqEl) sqEl.classList.add('selected');

        var state = C.getState();
        legalMovesForSelected.forEach(function(m) {
            var targetEl = getSquareElement(m.to[0], m.to[1]);
            if (!targetEl) return;
            var targetPiece = C.getPiece(m.to[0], m.to[1]);
            var isEP = C.pieceType(state.board[m.from[0]][m.from[1]]) === 6 &&
                       state.enPassantTarget &&
                       m.to[0] === state.enPassantTarget[0] && m.to[1] === state.enPassantTarget[1];
            if (targetPiece !== C.EMPTY || isEP) {
                targetEl.classList.add('legal-capture');
            } else {
                targetEl.classList.add('legal-move');
            }
        });
    }

    function clearSelection() {
        selectedSquare = null;
        legalMovesForSelected = [];

        var board = document.getElementById('board');
        if (!board) return;
        var squares = board.querySelectorAll('.square');
        squares.forEach(function(sq) {
            sq.classList.remove('selected', 'legal-move', 'legal-capture');
        });
    }

    function highlightLastMove(from, to) {
        var board = document.getElementById('board');
        board.querySelectorAll('.highlighted').forEach(function(sq) {
            sq.classList.remove('highlighted');
        });

        lastMoveFrom = from;
        lastMoveTo = to;

        var fromEl = getSquareElement(from[0], from[1]);
        var toEl = getSquareElement(to[0], to[1]);
        if (fromEl) fromEl.classList.add('highlighted');
        if (toEl) toEl.classList.add('highlighted');
    }

    function highlightCheck() {
        var board = document.getElementById('board');
        board.querySelectorAll('.in-check').forEach(function(sq) {
            sq.classList.remove('in-check');
        });

        var state = C.getState();
        if (C.isInCheck(state.turn)) {
            var kingPos = C.findKing(state.turn);
            if (kingPos) {
                var kingEl = getSquareElement(kingPos[0], kingPos[1]);
                if (kingEl) kingEl.classList.add('in-check');
            }
        }
    }

    // ========== 수 처리 ==========
    function handleMove(move) {
        var state = C.getState();
        var piece = C.getPiece(move.from[0], move.from[1]);
        var pt = C.pieceType(piece);

        if (pt === 6 && (move.to[0] === 0 || move.to[0] === 7) && !move.promotion) {
            showPromotionModal(move);
            return;
        }

        clearSelection();
        executeMove(move, true);
    }

    function executeMove(move, isPlayer) {
        var state = C.getState();
        var movingColor = state.turn;

        // 캡처 여부 미리 확인 (응원용)
        var targetPiece = state.board[move.to[0]][move.to[1]];
        var isCapture = targetPiece !== C.EMPTY;
        // 앙파상 캡처 확인
        var movingPiece = state.board[move.from[0]][move.from[1]];
        if (C.pieceType(movingPiece) === 6 && state.enPassantTarget &&
            move.to[0] === state.enPassantTarget[0] && move.to[1] === state.enPassantTarget[1]) {
            isCapture = true;
        }

        C.makeMove(move);

        // 체크 표기 추가
        state = C.getState();
        var inCheck = C.isInCheck(state.turn);
        if (inCheck) {
            var endResult = C.checkGameEnd(state.turn);
            if (endResult && endResult.type === 'checkmate') {
                move.san += '#';
            } else {
                move.san += '+';
            }
        }

        refreshBoard();
        highlightLastMove(move.from, move.to);
        highlightCheck();
        updateMoveHistory();
        updateCapturedPieces();
        updateTurnIndicator();

        // === 응원 트리거 ===
        var playerColor = state.playerColor;
        if (isPlayer) {
            C.Cheer.onPlayerMove();
            if (isCapture) C.Cheer.cheerPlayerCapture();
            if (inCheck) C.Cheer.cheerPlayerCheck();
        } else {
            // AI가 플레이어 기물을 잡았을 때 위로
            if (isCapture) C.Cheer.cheerPlayerLostPiece();
        }

        // 게임 종료 체크
        var endResult = C.checkGameEnd(state.turn);
        if (endResult) {
            state.gameOver = true;
            state.gameResult = endResult;
            showGameOver(endResult);

            // 응원
            if (endResult.type === 'checkmate') {
                if (endResult.winner === playerColor) {
                    C.Cheer.cheerWin();
                } else {
                    C.Cheer.cheerLose();
                }
            } else {
                C.Cheer.cheerDraw();
            }
            return;
        }

        // AI 턴
        if (!isPlayerTurn()) {
            lockInput();
            showThinking(true);
            setTimeout(function() {
                runAI();
            }, 100);
        }
    }

    function runAI() {
        var state = C.getState();
        var aiMove = C.getBestMove(state.aiLevel);

        showThinking(false);

        if (aiMove) {
            if (!aiMove.promotion) {
                var piece = C.getPiece(aiMove.from[0], aiMove.from[1]);
                var pt = C.pieceType(piece);
                if (pt === 6 && (aiMove.to[0] === 0 || aiMove.to[0] === 7)) {
                    aiMove.promotion = 2;
                }
            }
            executeMove(aiMove, false);
        }

        unlockInput();
    }

    // ========== 프로모션 모달 ==========
    function showPromotionModal(move) {
        pendingPromotion = move;
        var modal = document.getElementById('promotion-modal');
        var choices = document.getElementById('promotion-choices');
        var state = C.getState();
        var color = state.turn;

        choices.innerHTML = '';
        var types = [2, 3, 4, 5];
        types.forEach(function(t) {
            var pieceId = color === C.WHITE ? t : t + 6;
            var btn = document.createElement('div');
            btn.className = 'promotion-choice';
            btn.textContent = C.SYMBOLS[pieceId];
            btn.addEventListener('click', function() {
                var m = Object.assign({}, pendingPromotion);
                m.promotion = t;
                pendingPromotion = null;
                modal.classList.add('hidden');
                clearSelection();
                executeMove(m, true);
            });
            choices.appendChild(btn);
        });

        modal.classList.remove('hidden');
    }

    // ========== UI 업데이트 ==========
    function refreshBoard() {
        C.renderBoard(isFlipped);
        if (lastMoveFrom && lastMoveTo) {
            highlightLastMove(lastMoveFrom, lastMoveTo);
        }
        highlightCheck();
    }

    function updateMoveHistory() {
        var historyEl = document.getElementById('move-history');
        var state = C.getState();
        historyEl.innerHTML = '';

        for (var i = 0; i < state.moveHistory.length; i += 2) {
            var moveNum = Math.floor(i / 2) + 1;
            var row = document.createElement('div');
            row.className = 'move-row';

            var numSpan = document.createElement('span');
            numSpan.className = 'move-number';
            numSpan.textContent = moveNum + '.';
            row.appendChild(numSpan);

            var whiteSpan = document.createElement('span');
            whiteSpan.className = 'move-white';
            whiteSpan.textContent = state.moveHistory[i].san || '';
            if (i === state.moveHistory.length - 1) whiteSpan.classList.add('move-current');
            row.appendChild(whiteSpan);

            if (i + 1 < state.moveHistory.length) {
                var blackSpan = document.createElement('span');
                blackSpan.className = 'move-black';
                blackSpan.textContent = state.moveHistory[i + 1].san || '';
                if (i + 1 === state.moveHistory.length - 1) blackSpan.classList.add('move-current');
                row.appendChild(blackSpan);
            }

            historyEl.appendChild(row);
        }

        historyEl.scrollTop = historyEl.scrollHeight;
    }

    function updateCapturedPieces() {
        var captured = C.getCapturedPieces();
        var state = C.getState();

        var playerEl, aiEl;
        if (state.playerColor === C.WHITE) {
            playerEl = document.getElementById('player-captured');
            aiEl = document.getElementById('ai-captured');
        } else {
            playerEl = document.getElementById('ai-captured');
            aiEl = document.getElementById('player-captured');
        }

        playerEl.innerHTML = '';
        captured.white.forEach(function(p) {
            var span = document.createElement('span');
            span.textContent = C.SYMBOLS[p];
            playerEl.appendChild(span);
        });

        aiEl.innerHTML = '';
        captured.black.forEach(function(p) {
            var span = document.createElement('span');
            span.textContent = C.SYMBOLS[p];
            aiEl.appendChild(span);
        });

        var matScore = C.getMaterialScore();
        var playerScore = state.playerColor === C.WHITE ? matScore : -matScore;
        var playerDiff = document.getElementById('player-score-diff');
        var aiDiff = document.getElementById('ai-score-diff');

        if (playerScore > 0) {
            playerDiff.textContent = '+' + Math.round(playerScore / 100);
            aiDiff.textContent = '';
        } else if (playerScore < 0) {
            aiDiff.textContent = '+' + Math.round(-playerScore / 100);
            playerDiff.textContent = '';
        } else {
            playerDiff.textContent = '';
            aiDiff.textContent = '';
        }
    }

    function showThinking(show) {
        var overlay = document.getElementById('thinking-overlay');
        if (show) overlay.classList.remove('hidden');
        else overlay.classList.add('hidden');
    }

    function showGameOver(result) {
        var modal = document.getElementById('gameover-modal');
        var content = document.getElementById('gameover-content');
        var title = document.getElementById('gameover-title');
        var msg = document.getElementById('gameover-message');
        var state = C.getState();

        content.classList.remove('result-win', 'result-lose', 'result-draw');

        if (result.type === 'checkmate') {
            if (result.winner === state.playerColor) {
                title.textContent = '승리!';
                msg.textContent = '축하합니다, ' + state.playerName + '님! 체크메이트!';
                content.classList.add('result-win');
            } else {
                title.textContent = '패배';
                msg.textContent = 'AI(Lv.' + state.aiLevel + ' ' + C.LEVEL_NAMES[state.aiLevel] + ')에게 졌습니다.';
                content.classList.add('result-lose');
            }
        } else if (result.type === 'stalemate') {
            title.textContent = '무승부';
            msg.textContent = '스테일메이트! 더 이상 합법수가 없습니다.';
            content.classList.add('result-draw');
        } else if (result.type === 'draw50') {
            title.textContent = '무승부';
            msg.textContent = '50수 규칙에 의한 무승부입니다.';
            content.classList.add('result-draw');
        } else if (result.type === 'insufficient') {
            title.textContent = '무승부';
            msg.textContent = '기물 부족으로 무승부입니다.';
            content.classList.add('result-draw');
        } else if (result.type === 'resign') {
            title.textContent = '패배';
            msg.textContent = '기권하셨습니다.';
            content.classList.add('result-lose');
        }

        modal.classList.remove('hidden');
    }

    function getSquareElement(row, col) {
        var board = document.getElementById('board');
        return board.querySelector('[data-row="' + row + '"][data-col="' + col + '"]');
    }

    function undoPlayerMove() {
        var state = C.getState();
        if (state.moveHistory.length < 2) return;
        if (state.gameOver) return;
        if (!isPlayerTurn()) return;

        C.undoMove();
        C.undoMove();

        lastMoveFrom = null;
        lastMoveTo = null;
        if (state.moveHistory.length > 0) {
            var last = state.moveHistory[state.moveHistory.length - 1];
            lastMoveFrom = last.from;
            lastMoveTo = last.to;
        }

        clearSelection();
        refreshBoard();
        updateMoveHistory();
        updateCapturedPieces();
        updateTurnIndicator();
    }

    // Export
    C.UI = {
        init: init,
        setFlipped: setFlipped,
        refreshBoard: refreshBoard,
        clearSelection: clearSelection,
        updateMoveHistory: updateMoveHistory,
        updateCapturedPieces: updateCapturedPieces,
        updateTurnIndicator: updateTurnIndicator,
        showGameOver: showGameOver,
        undoPlayerMove: undoPlayerMove,
        lockInput: lockInput,
        unlockInput: unlockInput,
        runAI: runAI
    };
})();
