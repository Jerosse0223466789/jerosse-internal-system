/**
 * 數據同步模組
 * 處理與後端的數據同步、離線支持等功能
 */

class DataSyncManager {
    constructor(config = {}) {
        this.config = config;
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.lastSyncTime = null;
        this.syncInProgress = false;
        this.retryAttempts = 0;
        
        // 同步統計
        this.syncStats = {
            success: 0,
            failure: 0,
            lastSync: null,
            totalBytes: 0
        };
        
        this.init();
    }

    async init() {
        console.log('🔄 數據同步管理器初始化中...');
        
        // 載入離線數據
        this.loadOfflineData();
        
        // 設定網路狀態監聽
        this.setupNetworkMonitoring();
        
        // 設定定期同步
        this.setupPeriodicSync();
        
        // 嘗試初始同步
        if (this.isOnline) {
            await this.initialSync();
        }
        
        console.log('✅ 數據同步管理器初始化完成');
    }

    // 載入離線數據
    loadOfflineData() {
        try {
            const cacheData = localStorage.getItem(this.config.storage.keys.cacheData);
            if (cacheData) {
                const cached = JSON.parse(cacheData);
                
                // 檢查緩存是否過期
                const now = Date.now();
                if (cached.timestamp && (now - cached.timestamp) < this.config.storage.cacheExpiry) {
                    console.log('✅ 載入緩存數據');
                    this.dispatchEvent('cache-loaded', cached.data);
                } else {
                    console.log('⚠️ 緩存數據已過期');
                    this.clearCache();
                }
            }
            
            // 載入同步佇列
            const queueData = localStorage.getItem('sync-queue');
            if (queueData) {
                this.syncQueue = JSON.parse(queueData);
                console.log(`📋 載入 ${this.syncQueue.length} 個待同步項目`);
            }
            
        } catch (error) {
            console.error('載入離線數據失敗:', error);
            this.clearCache();
        }
    }

    // 設定網路狀態監聽
    setupNetworkMonitoring() {
        window.addEventListener('online', () => {
            console.log('🌐 網路已連線');
            this.isOnline = true;
            this.dispatchEvent('network-online');
            this.handleNetworkOnline();
        });

        window.addEventListener('offline', () => {
            console.log('📵 網路已斷線');
            this.isOnline = false;
            this.dispatchEvent('network-offline');
            this.handleNetworkOffline();
        });
    }

    // 設定定期同步
    setupPeriodicSync() {
        // 每5分鐘檢查一次同步
        setInterval(() => {
            if (this.isOnline && !this.syncInProgress) {
                this.checkAndSync();
            }
        }, 5 * 60 * 1000);
    }

    // 初始同步
    async initialSync() {
        try {
            console.log('🚀 開始初始同步...');
            
            await this.syncDocuments();
            await this.syncUserData();
            
            this.lastSyncTime = Date.now();
            this.dispatchEvent('initial-sync-complete');
            
            console.log('✅ 初始同步完成');
            
        } catch (error) {
            console.error('初始同步失敗:', error);
            this.dispatchEvent('sync-failed', { error: error.message });
        }
    }

    // 同步文件數據
    async syncDocuments() {
        if (!this.config.api.endpoints.documents) {
            console.log('⚠️ 未配置文件同步端點');
            return;
        }

        try {
            const response = await this.makeRequest('documents', {
                action: 'getDocuments',
                data: {
                    lastSync: this.lastSyncTime
                }
            });

            if (response.success && response.data) {
                // 緩存文件數據
                this.cacheData('documents', response.data);
                
                this.syncStats.success++;
                this.dispatchEvent('documents-synced', response.data);
                
                console.log('✅ 文件數據同步完成');
            }

        } catch (error) {
            console.error('同步文件數據失敗:', error);
            this.syncStats.failure++;
            throw error;
        }
    }

    // 同步用戶數據
    async syncUserData() {
        if (!this.config.api.endpoints.users) {
            console.log('⚠️ 未配置用戶同步端點');
            return;
        }

        try {
            const response = await this.makeRequest('users', {
                action: 'getUserData',
                data: {
                    lastSync: this.lastSyncTime
                }
            });

            if (response.success && response.data) {
                this.cacheData('users', response.data);
                this.syncStats.success++;
                
                console.log('✅ 用戶數據同步完成');
            }

        } catch (error) {
            console.error('同步用戶數據失敗:', error);
            this.syncStats.failure++;
            // 用戶數據同步失敗不拋出錯誤，繼續其他同步
        }
    }

    // 發送HTTP請求
    async makeRequest(endpoint, data) {
        const url = this.config.api.endpoints[endpoint];
        if (!url) {
            throw new Error(`未配置端點: ${endpoint}`);
        }

        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            timeout: this.config.api.timeout || 30000
        };

        let response;
        let attempts = 0;
        const maxAttempts = this.config.api.retryAttempts || 3;

        while (attempts < maxAttempts) {
            try {
                response = await fetch(url, requestOptions);
                
                if (response.ok) {
                    const result = await response.json();
                    this.retryAttempts = 0; // 重置重試計數
                    return result;
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

            } catch (error) {
                attempts++;
                console.error(`請求失敗 (第${attempts}次嘗試):`, error);
                
                if (attempts >= maxAttempts) {
                    throw error;
                }
                
                // 等待後重試
                await this.delay(this.config.api.retryDelay || 1000);
            }
        }

        throw new Error('達到最大重試次數');
    }

    // 添加到同步佇列
    addToSyncQueue(item) {
        const queueItem = {
            id: Date.now() + Math.random(),
            timestamp: Date.now(),
            ...item
        };

        this.syncQueue.push(queueItem);
        this.saveSyncQueue();

        console.log('📝 添加到同步佇列:', queueItem);

        // 如果在線，立即嘗試同步
        if (this.isOnline && !this.syncInProgress) {
            this.processSyncQueue();
        }
    }

    // 處理同步佇列
    async processSyncQueue() {
        if (this.syncQueue.length === 0 || this.syncInProgress) {
            return;
        }

        this.syncInProgress = true;
        console.log(`📤 處理 ${this.syncQueue.length} 個同步項目`);

        const processedItems = [];
        
        try {
            for (const item of this.syncQueue) {
                try {
                    await this.processSyncItem(item);
                    processedItems.push(item.id);
                    this.syncStats.success++;
                    
                } catch (error) {
                    console.error('同步項目失敗:', item, error);
                    this.syncStats.failure++;
                    
                    // 如果項目過期，從佇列中移除
                    if (this.isItemExpired(item)) {
                        processedItems.push(item.id);
                    }
                }
            }

            // 從佇列中移除已處理的項目
            this.syncQueue = this.syncQueue.filter(item => !processedItems.includes(item.id));
            this.saveSyncQueue();

            console.log(`✅ 同步完成，移除 ${processedItems.length} 個項目`);

        } finally {
            this.syncInProgress = false;
            this.lastSyncTime = Date.now();
            this.syncStats.lastSync = new Date().toISOString();
        }
    }

    // 處理單個同步項目
    async processSyncItem(item) {
        const { endpoint, action, data } = item;
        
        if (!endpoint || !action) {
            throw new Error('同步項目缺少必要信息');
        }

        const response = await this.makeRequest(endpoint, {
            action,
            data
        });

        if (!response.success) {
            throw new Error(response.error || '同步失敗');
        }

        return response;
    }

    // 檢查項目是否過期
    isItemExpired(item) {
        const maxAge = 24 * 60 * 60 * 1000; // 24小時
        return (Date.now() - item.timestamp) > maxAge;
    }

    // 緩存數據
    cacheData(key, data) {
        try {
            const cacheEntry = {
                timestamp: Date.now(),
                data: data
            };

            localStorage.setItem(
                this.config.storage.keys.cacheData + '-' + key,
                JSON.stringify(cacheEntry)
            );

            console.log(`💾 緩存數據: ${key}`);

        } catch (error) {
            console.error('緩存數據失敗:', error);
        }
    }

    // 獲取緩存數據
    getCachedData(key) {
        try {
            const cached = localStorage.getItem(this.config.storage.keys.cacheData + '-' + key);
            if (cached) {
                const cacheEntry = JSON.parse(cached);
                
                // 檢查是否過期
                if ((Date.now() - cacheEntry.timestamp) < this.config.storage.cacheExpiry) {
                    return cacheEntry.data;
                }
            }
        } catch (error) {
            console.error('獲取緩存數據失敗:', error);
        }
        
        return null;
    }

    // 清除緩存
    clearCache() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.config.storage.keys.cacheData)) {
                    localStorage.removeItem(key);
                }
            });
            console.log('🗑️ 緩存已清除');
        } catch (error) {
            console.error('清除緩存失敗:', error);
        }
    }

    // 保存同步佇列
    saveSyncQueue() {
        try {
            localStorage.setItem('sync-queue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('保存同步佇列失敗:', error);
        }
    }

    // 網路上線處理
    async handleNetworkOnline() {
        console.log('🔄 網路恢復，開始同步...');
        
        try {
            // 處理待同步項目
            await this.processSyncQueue();
            
            // 執行完整同步
            await this.fullSync();
            
        } catch (error) {
            console.error('網路恢復同步失敗:', error);
        }
    }

    // 網路離線處理
    handleNetworkOffline() {
        console.log('📱 切換到離線模式');
        
        // 停止正在進行的同步
        this.syncInProgress = false;
        
        // 通知應用切換到離線模式
        this.dispatchEvent('offline-mode-activated');
    }

    // 完整同步
    async fullSync() {
        if (!this.isOnline) {
            console.log('⚠️ 離線狀態，無法執行完整同步');
            return;
        }

        try {
            console.log('🔄 開始完整同步...');
            this.syncInProgress = true;

            await this.syncDocuments();
            await this.syncUserData();
            await this.processSyncQueue();

            this.lastSyncTime = Date.now();
            this.syncStats.lastSync = new Date().toISOString();

            console.log('✅ 完整同步完成');
            this.dispatchEvent('full-sync-complete', this.syncStats);

        } catch (error) {
            console.error('完整同步失敗:', error);
            this.dispatchEvent('sync-failed', { error: error.message });
        } finally {
            this.syncInProgress = false;
        }
    }

    // 檢查並同步
    async checkAndSync() {
        // 檢查是否需要同步
        const shouldSync = this.shouldPerformSync();
        
        if (shouldSync) {
            await this.fullSync();
        }
    }

    // 判斷是否需要同步
    shouldPerformSync() {
        // 如果從未同步過
        if (!this.lastSyncTime) {
            return true;
        }
        
        // 如果有待同步項目
        if (this.syncQueue.length > 0) {
            return true;
        }
        
        // 檢查時間間隔
        const syncInterval = 10 * 60 * 1000; // 10分鐘
        return (Date.now() - this.lastSyncTime) > syncInterval;
    }

    // 手動同步
    async manualSync() {
        if (this.syncInProgress) {
            console.log('⚠️ 同步正在進行中，請稍候');
            return;
        }

        if (!this.isOnline) {
            throw new Error('無網路連線，無法執行同步');
        }

        await this.fullSync();
    }

    // 獲取同步統計
    getSyncStats() {
        return {
            ...this.syncStats,
            isOnline: this.isOnline,
            queueLength: this.syncQueue.length,
            syncInProgress: this.syncInProgress,
            lastSyncTime: this.lastSyncTime
        };
    }

    // 導出數據
    exportSyncData() {
        return {
            syncStats: this.syncStats,
            syncQueue: this.syncQueue,
            isOnline: this.isOnline,
            lastSyncTime: this.lastSyncTime
        };
    }

    // 工具方法
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 事件系統
    dispatchEvent(eventName, data = {}) {
        document.dispatchEvent(new CustomEvent(`sync-${eventName}`, {
            detail: data
        }));
    }

    // 銷毀
    destroy() {
        console.log('🔄 數據同步管理器銷毀中...');
        
        this.syncInProgress = false;
        this.syncQueue = [];
        
        console.log('✅ 數據同步管理器已銷毀');
    }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataSyncManager;
} else if (typeof window !== 'undefined') {
    window.DataSyncManager = DataSyncManager;
}
