/**
 * main.js - 앱 진입점, 게임 흐름 관리
 */
(function() {
    'use strict';

    var C = window.Chess;
    var selectedLevel = 5;
    var selectedColor = C.WHITE;
    var controlsInitialized = false;

    // ========== 시작 화면 이벤트 ==========
    function initStartScreen() {
        var levelBtns = document.querySelectorAll('.level-btn');
        levelBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                levelBtns.forEach(function(b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
                selectedLevel = parseInt(btn.dataset.level);
            });
        });
        var defaultLevel = document.querySelector('.level-btn[data-level="5"]');
        if (defaultLevel) defaultLevel.classList.add('selected');

        var colorBtns = document.querySelectorAll('.color-btn');
        colorBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                colorBtns.forEach(function(b) { b.classList.remove('selected'); });
                btn.classList.add('selected');
                selectedColor = btn.dataset.color === 'white' ? C.WHITE : C.BLACK;
            });
        });

        document.getElementById('start-btn').addEventListener('click', startGame);
    }

    // ========== 게임 시작 ==========
    function startGame() {
        C.initBoard();
        var state = C.getState();
        state.playerColor = selectedColor;
        state.aiLevel = selectedLevel;

        // 화면 전환
        document.getElementById('start-screen').classList.remove('active');
        document.getElementById('game-screen').classList.add('active');

        // AI 이름 표시
        var aiName = 'AI Lv.' + selectedLevel + ' ' + C.LEVEL_NAMES[selectedLevel];
        document.getElementById('ai-name').textContent = aiName;

        // 플레이어 이름
        document.getElementById('player-name').textContent = state.playerName;

        // 보드 방향 (흑이면 뒤집기)
        var flipped = selectedColor === C.BLACK;
        C.UI.setFlipped(flipped);

        // 보드 렌더링
        C.renderBoard(flipped);
        C.UI.init();
        C.UI.updateMoveHistory();
        C.UI.updateCapturedPieces();
        C.UI.updateTurnIndicator();

        // 응원 시스템 초기화
        C.Cheer.init();

        // 시작 응원
        C.Cheer.cheerStart();

        // 흑 선택 시 AI(백)가 먼저
        if (selectedColor === C.BLACK) {
            C.UI.lockInput();
            document.getElementById('thinking-overlay').classList.remove('hidden');
            setTimeout(function() {
                C.UI.runAI();
                document.getElementById('thinking-overlay').classList.add('hidden');
            }, 300);
        }

        // 컨트롤 버튼 이벤트 (한 번만)
        if (!controlsInitialized) {
            initControls();
            controlsInitialized = true;
        }
    }

    // ========== 컨트롤 ==========
    function initControls() {
        document.getElementById('undo-btn').addEventListener('click', function() {
            C.UI.undoPlayerMove();
        });

        document.getElementById('new-game-btn').addEventListener('click', function() {
            goToMenu();
        });

        document.getElementById('resign-btn').addEventListener('click', function() {
            var state = C.getState();
            if (state.gameOver) return;
            if (confirm('정말 기권하시겠습니까?')) {
                state.gameOver = true;
                state.gameResult = { type: 'resign', winner: null };
                C.UI.showGameOver({ type: 'resign' });
                C.Cheer.cheerLose();
            }
        });

        document.getElementById('rematch-btn').addEventListener('click', function() {
            document.getElementById('gameover-modal').classList.add('hidden');
            startGame();
        });

        document.getElementById('menu-btn').addEventListener('click', function() {
            document.getElementById('gameover-modal').classList.add('hidden');
            goToMenu();
        });
    }

    function goToMenu() {
        document.getElementById('game-screen').classList.remove('active');
        document.getElementById('start-screen').classList.add('active');
        document.getElementById('gameover-modal').classList.add('hidden');
        document.getElementById('promotion-modal').classList.add('hidden');
    }

    // ========== 초기화 ==========
    document.addEventListener('DOMContentLoaded', function() {
        initStartScreen();
    });
})();
