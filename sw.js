// sw.js
const CACHE_NAME = 'voca-master-v2';

// 캐싱할 핵심 파일 목록
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './word.js',
  './manifest.json'
];

// 서비스 워커 설치 시 캐싱 시작
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// 활성화 및 구버전 캐시 삭제
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 네트워크 요청을 가로채서 캐시 파일 우선 제공 (오프라인 완벽 작동 지원)
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
