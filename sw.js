/**
 * Service Worker - 오프라인 캐싱
 */
var CACHE_NAME = 'chess-song-v1';
var ASSETS = [
    './',
    './index.html',
    './css/style.css',
    './js/pieces.js',
    './js/board.js',
    './js/moves.js',
    './js/evaluation.js',
    './js/ai.js',
    './js/cheer.js',
    './js/ui.js',
    './js/main.js',
    './icons/icon-192.svg',
    './icons/icon-512.svg',
    './manifest.json'
];

// 설치: 모든 파일 캐싱
self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(ASSETS);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

// 활성화: 이전 캐시 삭제
self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(name) {
                    return name !== CACHE_NAME;
                }).map(function(name) {
                    return caches.delete(name);
                })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// 네트워크 요청: 캐시 우선, 실패 시 네트워크
self.addEventListener('fetch', function(e) {
    e.respondWith(
        caches.match(e.request).then(function(cached) {
            return cached || fetch(e.request).then(function(response) {
                // 새 응답도 캐시에 저장
                if (response.ok) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(e.request, clone);
                    });
                }
                return response;
            });
        }).catch(function() {
            // 오프라인이고 캐시에도 없으면 기본 페이지
            if (e.request.mode === 'navigate') {
                return caches.match('./index.html');
            }
        })
    );
});
