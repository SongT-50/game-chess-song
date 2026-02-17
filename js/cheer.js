/**
 * cheer.js - 송태은 큰아빠 응원 시스템 (텍스트 말풍선만)
 */
(function() {
    'use strict';

    var C = window.Chess;

    // 응원 메시지 카테고리
    var CHEERS = {
        // 게임 시작
        start: [
            '현진아, 화이팅! 큰아빠가 응원한다!',
            '현진아! 오늘 이기자! 파이팅!',
            '우리 현진이 한번 해보자! 큰아빠가 지켜보고 있어!',
            '현진아, 집중! 넌 할 수 있어!'
        ],
        // 플레이어가 기물 잡았을 때
        capture: [
            '오~ 현진이 잘한다!',
            '좋았어! 멋지다 현진아!',
            '와~ 잘 잡았어!',
            '현진아 대단해! 계속 이렇게!',
            '크~ 한 방이다!',
            '오호! 센스 있는데?'
        ],
        // 체크 걸었을 때
        check: [
            '체크! 현진아 공격 좋아!',
            '와~ 체크다! 현진이 멋있다!',
            '체크! 밀어붙여 현진아!',
            '좋아 좋아! 체크! 현진이 간다!'
        ],
        // 승리했을 때
        win: [
            '우와아! 현진아 이겼다! 큰아빠 너무 기쁘다!',
            '체크메이트! 현진이 최고! 큰아빠가 제일 자랑스러워!',
            '야호! 이겼다! 현진아 대단하다! 역시 우리 현진이!',
            '와아! 현진이가 해냈어! 큰아빠 감동이야!'
        ],
        // 패배했을 때
        lose: [
            '괜찮아 현진아, 다음엔 꼭 이기자!',
            '아쉽다... 근데 잘 싸웠어 현진아! 다시 해보자!',
            '현진아 다음판에 복수하자! 큰아빠가 믿는다!'
        ],
        // 무승부
        draw: [
            '무승부! 현진아 잘 버텼어!',
            '비겼네! 현진아 대단해, 안 졌잖아!'
        ],
        // 랜덤 격려 (몇 수마다)
        encourage: [
            '현진아 화이팅!',
            '잘하고 있어 현진아!',
            '현진아 천천히 생각해!',
            '큰아빠가 응원한다! 힘내!',
            '좋아 좋아, 잘하고 있어!',
            '현진아 침착하게!',
            '우리 현진이 멋지다!',
            '집중! 넌 잘할 수 있어!'
        ],
        // 기물 잃었을 때 위로
        comfort: [
            '괜찮아 현진아, 만회하자!',
            '아이고... 괜찮아! 아직 기회 있어!',
            '현진아 괜찮아, 다시 잡으면 돼!'
        ]
    };

    var bubbleEl = null;
    var textEl = null;
    var hideTimer = null;
    var lastCheerTime = 0;
    var moveCount = 0;
    var cheerCooldown = 3000; // 최소 3초 간격

    function init() {
        bubbleEl = document.getElementById('cheer-bubble');
        textEl = document.getElementById('cheer-text');
        moveCount = 0;
        lastCheerTime = 0;
    }

    function pickRandom(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /**
     * 말풍선 표시 (텍스트만)
     */
    function showCheer(text) {
        var now = Date.now();
        if (now - lastCheerTime < cheerCooldown) return;
        lastCheerTime = now;

        if (!bubbleEl || !textEl) return;

        // 텍스트 설정
        textEl.textContent = text;

        // 이전 타이머 취소
        if (hideTimer) clearTimeout(hideTimer);

        // 말풍선 표시
        bubbleEl.classList.remove('visible', 'animate-in');
        // reflow
        void bubbleEl.offsetWidth;
        bubbleEl.classList.add('visible', 'animate-in');

        // 일정 시간 후 숨기기
        var duration = Math.max(3000, text.length * 150);
        hideTimer = setTimeout(function() {
            bubbleEl.classList.remove('visible', 'animate-in');
        }, duration);
    }

    /**
     * 이벤트별 응원 트리거 - 항상 랜덤으로 표시
     */
    function cheerStart() {
        setTimeout(function() {
            showCheer(pickRandom(CHEERS.start));
        }, 500);
    }

    function cheerPlayerCapture() {
        showCheer(pickRandom(CHEERS.capture));
    }

    function cheerPlayerCheck() {
        showCheer(pickRandom(CHEERS.check));
    }

    function cheerWin() {
        showCheer(pickRandom(CHEERS.win));
    }

    function cheerLose() {
        showCheer(pickRandom(CHEERS.lose));
    }

    function cheerDraw() {
        showCheer(pickRandom(CHEERS.draw));
    }

    function cheerPlayerLostPiece() {
        showCheer(pickRandom(CHEERS.comfort));
    }

    /**
     * 매 수마다 호출 - 랜덤 격려 (3수마다)
     */
    function onPlayerMove() {
        moveCount++;
        if (moveCount % 3 === 0) {
            setTimeout(function() {
                showCheer(pickRandom(CHEERS.encourage));
            }, 1000);
        }
    }

    // Export
    C.Cheer = {
        init: init,
        cheerStart: cheerStart,
        cheerPlayerCapture: cheerPlayerCapture,
        cheerPlayerCheck: cheerPlayerCheck,
        cheerWin: cheerWin,
        cheerLose: cheerLose,
        cheerDraw: cheerDraw,
        cheerPlayerLostPiece: cheerPlayerLostPiece,
        onPlayerMove: onPlayerMove,
        showCheer: showCheer
    };
})();
