/**
 * Service Worker for 倉庫助手 PWA
 * 提供離線功能、快取管理和後台同步
 */

const CACHE_NAME = 'warehouse-app-v1.0.0';
const API_CACHE = 'warehouse-api-v1';
const STATIC_CACHE = 'warehouse-static-v1';

// 需要快取的靜態資源
const STATIC_RESOURCES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/app.css',
    '/js/app.js',
    '/js/scanner.js',
    '/js/voice.js',
    '/js/offline.js',
    '/js/api.js',
    '/icons/icon-192.png',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js'
];

// 需要快取的 API 端點
const API_ENDPOINTS = [
    '/api/categories',
    '/api/items',
    '/api/people',
    '/api/warehouses'
];

// Service Worker 安裝事件
self.addEventListener('install', event => {
    console.log('Service Worker 安裝中...');
    
    event.waitUntil(
        Promise.all([
            // 快取靜態資源
            caches.open(STATIC_CACHE).then(cache => {
                console.log('快取靜態資源...');
                return cache.addAll(STATIC_RESOURCES);
            }),
            
            // 強制啟動新的 Service Worker
            self.skipWaiting()
        ])
    );
});

// Service Worker 啟動事件
self.addEventListener('activate', event => {
    console.log('Service Worker 啟動中...');
    
    event.waitUntil(
        Promise.all([
            // 清理舊的快取
            cleanUpOldCaches(),
            
            // 接管所有客戶端
            self.clients.claim()
        ])
    );
});

// 清理舊快取
async function cleanUpOldCaches() {
    const cacheNames = await caches.keys();
    const validCaches = [CACHE_NAME, API_CACHE, STATIC_CACHE];
    
    return Promise.all(
        cacheNames
            .filter(cacheName => !validCaches.includes(cacheName))
            .map(cacheName => {
                console.log('刪除舊快取:', cacheName);
                return caches.delete(cacheName);
            })
    );
}

// 攔截網路請求
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // 忽略非 HTTP(S) 請求
    if (!request.url.startsWith('http')) {
        return;
    }
    
    // 根據請求類型選擇不同的策略
    if (isStaticResource(request)) {
        // 靜態資源：快取優先
        event.respondWith(cacheFirst(request, STATIC_CACHE));
    } else if (isAPIRequest(request)) {
        // API 請求：網路優先，快取備用
        event.respondWith(networkFirst(request, API_CACHE));
    } else {
        // 其他請求：網路優先
        event.respondWith(networkFirst(request, CACHE_NAME));
    }
});

// 判斷是否為靜態資源
function isStaticResource(request) {
    const url = new URL(request.url);
    
    // CSS, JS, 圖片等靜態資源
    if (/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$/i.test(url.pathname)) {
        return true;
    }
    
    // Google Fonts 和外部庫
    if (url.hostname === 'fonts.googleapis.com' || 
        url.hostname === 'unpkg.com') {
        return true;
    }
    
    return false;
}

// 判斷是否為 API 請求
function isAPIRequest(request) {
    const url = new URL(request.url);
    
    // Google Apps Script 請求
    if (url.hostname === 'script.google.com') {
        return true;
    }
    
    // 本地 API 路徑
    if (url.pathname.startsWith('/api/')) {
        return true;
    }
    
    return false;
}

// 快取優先策略
async function cacheFirst(request, cacheName) {
    try {
        // 先檢查快取
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            console.log('從快取返回:', request.url);
            return cachedResponse;
        }
        
        // 快取未命中，發送網路請求
        const networkResponse = await fetch(request);
        
        // 快取成功的回應
        if (networkResponse.ok) {
            await cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.error('快取優先策略失敗:', error);
        
        // 如果是導航請求，返回離線頁面
        if (request.mode === 'navigate') {
            return getOfflinePage();
        }
        
        throw error;
    }
}

// 網路優先策略
async function networkFirst(request, cacheName) {
    try {
        // 先嘗試網路請求
        const networkResponse = await fetch(request);
        
        // 快取成功的回應
        if (networkResponse.ok && request.method === 'GET') {
            const cache = await caches.open(cacheName);
            await cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('網路請求失敗，嘗試從快取返回:', request.url);
        
        // 網路失敗，檢查快取
        const cache = await caches.open(cacheName);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            console.log('從快取返回:', request.url);
            return cachedResponse;
        }
        
        // 如果是導航請求，返回離線頁面
        if (request.mode === 'navigate') {
            return getOfflinePage();
        }
        
        throw error;
    }
}

// 獲取離線頁面
async function getOfflinePage() {
    const cache = await caches.open(STATIC_CACHE);
    const offlineResponse = await cache.match('/index.html');
    
    if (offlineResponse) {
        return offlineResponse;
    }
    
    // 如果沒有快取的主頁，返回簡單的離線頁面
    return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>離線模式 - 倉庫助手</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    text-align: center;
                    padding: 50px;
                    background: #f5f5f5;
                }
                .offline-message {
                    background: white;
                    padding: 30px;
                    border-radius: 10px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    max-width: 400px;
                    margin: 0 auto;
                }
                .icon {
                    font-size: 48px;
                    color: #ff9800;
                    margin-bottom: 20px;
                }
                h1 {
                    color: #333;
                    margin-bottom: 15px;
                }
                p {
                    color: #666;
                    line-height: 1.6;
                }
                .retry-btn {
                    background: #2196F3;
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <div class="offline-message">
                <div class="icon">📱</div>
                <h1>離線模式</h1>
                <p>您目前處於離線狀態。應用程式的基本功能仍然可用，資料將在網路恢復後自動同步。</p>
                <button class="retry-btn" onclick="window.location.reload()">重新載入</button>
            </div>
        </body>
        </html>
    `, {
        headers: { 'Content-Type': 'text/html' }
    });
}

// 後台同步
self.addEventListener('sync', event => {
    console.log('後台同步事件:', event.tag);
    
    if (event.tag === 'warehouse-data-sync') {
        event.waitUntil(syncWarehouseData());
    }
});

// 同步倉庫資料
async function syncWarehouseData() {
    try {
        console.log('開始後台同步倉庫資料...');
        
        // 通知主應用程式執行同步
        const clients = await self.clients.matchAll();
        
        clients.forEach(client => {
            client.postMessage({
                type: 'BACKGROUND_SYNC',
                payload: 'warehouse-data-sync'
            });
        });
        
        console.log('後台同步完成');
        
    } catch (error) {
        console.error('後台同步失敗:', error);
        throw error;
    }
}

// 推播通知
self.addEventListener('push', event => {
    console.log('收到推播通知:', event);
    
    const options = {
        body: event.data ? event.data.text() : '您有新的倉庫通知',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: '查看詳情',
                icon: '/icons/icon-192.png'
            },
            {
                action: 'close',
                title: '關閉',
                icon: '/icons/icon-192.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('倉庫助手', options)
    );
});

// 處理通知點擊
self.addEventListener('notificationclick', event => {
    console.log('通知被點擊:', event);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        // 開啟應用程式
        event.waitUntil(
            clients.openWindow('/')
        );
    } else if (event.action === 'close') {
        // 只關閉通知
        event.notification.close();
    } else {
        // 預設行為：開啟應用程式
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// 處理來自主應用程式的訊息
self.addEventListener('message', event => {
    console.log('Service Worker 收到訊息:', event.data);
    
    const { type, payload } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
            
        case 'CACHE_API_RESPONSE':
            cacheAPIResponse(payload.url, payload.response);
            break;
            
        case 'CLEAR_CACHE':
            clearSpecificCache(payload.cacheName);
            break;
            
        case 'GET_CACHE_STATUS':
            getCacheStatus().then(status => {
                event.ports[0].postMessage(status);
            });
            break;
            
        default:
            console.log('未知的訊息類型:', type);
    }
});

// 快取 API 回應
async function cacheAPIResponse(url, response) {
    try {
        const cache = await caches.open(API_CACHE);
        await cache.put(url, new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json' }
        }));
        console.log('API 回應已快取:', url);
    } catch (error) {
        console.error('快取 API 回應失敗:', error);
    }
}

// 清除特定快取
async function clearSpecificCache(cacheName) {
    try {
        await caches.delete(cacheName);
        console.log('已清除快取:', cacheName);
    } catch (error) {
        console.error('清除快取失敗:', error);
    }
}

// 獲取快取狀態
async function getCacheStatus() {
    try {
        const cacheNames = await caches.keys();
        const status = {};
        
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const keys = await cache.keys();
            status[cacheName] = keys.length;
        }
        
        return {
            caches: status,
            totalCaches: cacheNames.length,
            timestamp: Date.now()
        };
    } catch (error) {
        console.error('獲取快取狀態失敗:', error);
        return { error: error.message };
    }
}

// 定期清理過期的快取
setInterval(async () => {
    try {
        await cleanExpiredCacheEntries();
    } catch (error) {
        console.error('清理過期快取失敗:', error);
    }
}, 60 * 60 * 1000); // 每小時清理一次

// 清理過期的快取項目
async function cleanExpiredCacheEntries() {
    const cache = await caches.open(API_CACHE);
    const requests = await cache.keys();
    
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小時
    
    for (const request of requests) {
        const response = await cache.match(request);
        const cacheTime = response.headers.get('sw-cache-time');
        
        if (cacheTime && (now - parseInt(cacheTime)) > maxAge) {
            await cache.delete(request);
            console.log('清理過期快取:', request.url);
        }
    }
}

console.log('Service Worker 已載入');

