/**
 * 數據同步模組
 * 處理與後端系統的數據同步，支援離線操作和自動重試
 */

class DataSyncManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.syncQueue = [];
        this.syncInProgress = false;
        this.retryAttempts = {};
        this.maxRetries = 3;
        this.syncInterval = null;
        this.endpoints = {
            inventory: '',
            batch: '',
            warehouse: '',
            users: ''
        };
        this.init();
    }

    async init() {
        console.log('🔄 數據同步模組初始化中...');
        this.loadSyncQueue();
        this.setupNetworkListeners();
        this.setupPeriodicSync();
        this.loadEndpoints();
        console.log('✅ 數據同步模組初始化完成');
    }

    // 設定API端點
    setEndpoints(endpoints) {
        this.endpoints = { ...this.endpoints, ...endpoints };
        this.saveEndpoints();
        console.log('API端點已更新:', this.endpoints);
    }

    loadEndpoints() {
        try {
            const saved = localStorage.getItem('sync-endpoints');
            if (saved) {
                this.endpoints = { ...this.endpoints, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.error('載入API端點失敗:', error);
        }
    }

    saveEndpoints() {
        try {
            localStorage.setItem('sync-endpoints', JSON.stringify(this.endpoints));
        } catch (error) {
            console.error('儲存API端點失敗:', error);
        }
    }

    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('網路已連線，開始同步資料');
            this.dispatchEvent('network-status-changed', { online: true });
            this.processSyncQueue();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('網路已斷線，切換到離線模式');
            this.dispatchEvent('network-status-changed', { online: false });
        });
    }

    setupPeriodicSync() {
        // 每30秒檢查一次同步佇列
        this.syncInterval = setInterval(() => {
            if (this.isOnline && this.syncQueue.length > 0) {
                this.processSyncQueue();
            }
        }, 30000);
    }

    // 添加資料到同步佇列
    addToSyncQueue(data) {
        const syncItem = {
            id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now(),
            data: data,
            retries: 0,
            priority: data.priority || 'normal', // high, normal, low
            endpoint: data.endpoint || 'inventory',
            action: data.action || 'create'
        };

        // 根據優先級插入佇列
        if (syncItem.priority === 'high') {
            this.syncQueue.unshift(syncItem);
        } else {
            this.syncQueue.push(syncItem);
        }

        this.saveSyncQueue();
        
        // 如果在線且沒有同步進行中，立即處理
        if (this.isOnline && !this.syncInProgress) {
            this.processSyncQueue();
        }

        console.log('已添加到同步佇列:', syncItem.id);
        return syncItem.id;
    }

    // 處理同步佇列
    async processSyncQueue() {
        if (this.syncInProgress || !this.isOnline || this.syncQueue.length === 0) {
            return;
        }

        this.syncInProgress = true;
        this.dispatchEvent('sync-started', { queueLength: this.syncQueue.length });

        let successCount = 0;
        let failureCount = 0;

        // 處理高優先級項目
        const highPriorityItems = this.syncQueue.filter(item => item.priority === 'high');
        for (const item of highPriorityItems) {
            const result = await this.syncSingleItem(item);
            if (result.success) {
                successCount++;
                this.removeSyncItem(item.id);
            } else {
                failureCount++;
            }
        }

        // 處理一般優先級項目 (最多10個)
        const normalItems = this.syncQueue
            .filter(item => item.priority !== 'high')
            .slice(0, 10);

        for (const item of normalItems) {
            const result = await this.syncSingleItem(item);
            if (result.success) {
                successCount++;
                this.removeSyncItem(item.id);
            } else {
                failureCount++;
            }
        }

        this.syncInProgress = false;
        this.saveSyncQueue();

        this.dispatchEvent('sync-completed', {
            success: successCount,
            failure: failureCount,
            remaining: this.syncQueue.length
        });

        console.log(`同步完成: 成功 ${successCount}, 失敗 ${failureCount}, 剩餘 ${this.syncQueue.length}`);
    }

    // 同步單個項目
    async syncSingleItem(item) {
        try {
            console.log(`正在同步項目: ${item.id}`);

            const endpoint = this.endpoints[item.endpoint];
            if (!endpoint) {
                throw new Error(`未設定的端點: ${item.endpoint}`);
            }

            const payload = {
                action: item.action,
                data: item.data,
                timestamp: item.timestamp,
                source: 'mobile-app',
                syncId: item.id
            };

            const response = await this.makeRequest(endpoint, payload);
            
            if (response.success !== false) {
                console.log(`項目同步成功: ${item.id}`);
                this.dispatchEvent('item-synced', { item, response });
                return { success: true, response };
            } else {
                throw new Error(response.error || '同步失敗');
            }

        } catch (error) {
            console.error(`項目同步失敗: ${item.id}`, error);
            
            // 增加重試次數
            item.retries = (item.retries || 0) + 1;
            
            if (item.retries >= this.maxRetries) {
                console.error(`項目重試次數已達上限，移除: ${item.id}`);
                this.removeSyncItem(item.id);
                this.dispatchEvent('item-sync-failed', { item, error });
            } else {
                console.log(`項目將重試: ${item.id} (第 ${item.retries}/${this.maxRetries} 次)`);
            }

            return { success: false, error };
        }
    }

    // 發送HTTP請求
    async makeRequest(url, payload) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超時

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const responseText = await response.text();
            
            try {
                return JSON.parse(responseText);
            } catch (parseError) {
                // 如果回應不是JSON，視為成功
                return { success: true, data: responseText };
            }

        } catch (error) {
            clearTimeout(timeoutId);
            
            if (error.name === 'AbortError') {
                throw new Error('請求超時');
            }
            
            throw error;
        }
    }

    // 移除同步項目
    removeSyncItem(itemId) {
        const index = this.syncQueue.findIndex(item => item.id === itemId);
        if (index !== -1) {
            this.syncQueue.splice(index, 1);
        }
    }

    // 清除所有同步項目
    clearSyncQueue() {
        this.syncQueue = [];
        this.saveSyncQueue();
        console.log('同步佇列已清空');
    }

    // 取得同步統計
    getSyncStats() {
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;
        const oneDayAgo = now - 24 * 60 * 60 * 1000;

        const recentItems = this.syncQueue.filter(item => item.timestamp > oneHourAgo);
        const todayItems = this.syncQueue.filter(item => item.timestamp > oneDayAgo);

        const priorityStats = {
            high: this.syncQueue.filter(item => item.priority === 'high').length,
            normal: this.syncQueue.filter(item => item.priority === 'normal').length,
            low: this.syncQueue.filter(item => item.priority === 'low').length
        };

        return {
            total: this.syncQueue.length,
            recentHour: recentItems.length,
            today: todayItems.length,
            priority: priorityStats,
            isOnline: this.isOnline,
            syncInProgress: this.syncInProgress,
            oldestItem: this.syncQueue.length > 0 ? Math.min(...this.syncQueue.map(item => item.timestamp)) : null
        };
    }

    // 手動觸發同步
    async manualSync() {
        if (!this.isOnline) {
            throw new Error('無網路連線，無法進行同步');
        }

        if (this.syncInProgress) {
            throw new Error('同步已在進行中');
        }

        console.log('手動觸發同步');
        await this.processSyncQueue();
    }

    // 強制重試失敗項目
    retryFailedItems() {
        const failedItems = this.syncQueue.filter(item => item.retries >= this.maxRetries);
        
        failedItems.forEach(item => {
            item.retries = 0;
            console.log(`重置重試次數: ${item.id}`);
        });

        this.saveSyncQueue();
        
        if (this.isOnline) {
            this.processSyncQueue();
        }

        return failedItems.length;
    }

    // 同步庫存資料
    async syncInventoryData(inventoryData) {
        return this.addToSyncQueue({
            endpoint: 'inventory',
            action: 'submitInventory',
            priority: 'high',
            ...inventoryData
        });
    }

    // 同步批號資料
    async syncBatchData(batchData) {
        return this.addToSyncQueue({
            endpoint: 'batch',
            action: 'submitBatch',
            priority: 'normal',
            ...batchData
        });
    }

    // 同步倉庫資料
    async syncWarehouseData(warehouseData) {
        return this.addToSyncQueue({
            endpoint: 'warehouse',
            action: 'updateWarehouse',
            priority: 'normal',
            ...warehouseData
        });
    }

    // 獲取遠端資料
    async fetchRemoteData(endpoint, action, params = {}) {
        if (!this.isOnline) {
            throw new Error('無網路連線');
        }

        const url = this.endpoints[endpoint];
        if (!url) {
            throw new Error(`未設定的端點: ${endpoint}`);
        }

        const payload = {
            action: action,
            data: params,
            timestamp: Date.now(),
            source: 'mobile-app'
        };

        try {
            const response = await this.makeRequest(url, payload);
            console.log(`遠端資料獲取成功: ${endpoint}/${action}`);
            return response;
        } catch (error) {
            console.error(`遠端資料獲取失敗: ${endpoint}/${action}`, error);
            throw error;
        }
    }

    // 同步設定資料
    async syncSettings(settings) {
        return this.addToSyncQueue({
            endpoint: 'warehouse',
            action: 'updateSettings',
            priority: 'low',
            settings: settings
        });
    }

    // 載入同步佇列
    loadSyncQueue() {
        try {
            const saved = localStorage.getItem('sync-queue');
            if (saved) {
                this.syncQueue = JSON.parse(saved);
                console.log(`載入同步佇列: ${this.syncQueue.length} 個項目`);
            }
        } catch (error) {
            console.error('載入同步佇列失敗:', error);
            this.syncQueue = [];
        }
    }

    // 儲存同步佇列
    saveSyncQueue() {
        try {
            localStorage.setItem('sync-queue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.error('儲存同步佇列失敗:', error);
        }
    }

    // 發送自定義事件
    dispatchEvent(eventName, data = {}) {
        document.dispatchEvent(new CustomEvent(`sync-${eventName}`, {
            detail: data
        }));
    }

    // 獲取同步佇列詳情
    getSyncQueueDetails() {
        return this.syncQueue.map(item => ({
            id: item.id,
            timestamp: item.timestamp,
            action: item.action,
            endpoint: item.endpoint,
            priority: item.priority,
            retries: item.retries,
            age: Date.now() - item.timestamp
        }));
    }

    // 匯出同步資料
    exportSyncData() {
        const data = {
            queue: this.syncQueue,
            endpoints: this.endpoints,
            stats: this.getSyncStats(),
            exportTime: new Date().toISOString()
        };

        return JSON.stringify(data, null, 2);
    }

    // 匯入同步資料
    importSyncData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (data.queue && Array.isArray(data.queue)) {
                this.syncQueue = data.queue;
                this.saveSyncQueue();
            }

            if (data.endpoints) {
                this.setEndpoints(data.endpoints);
            }

            console.log('同步資料匯入成功');
            return true;
        } catch (error) {
            console.error('同步資料匯入失敗:', error);
            return false;
        }
    }

    // 清理過期項目
    cleanupExpiredItems(maxAge = 7 * 24 * 60 * 60 * 1000) { // 預設7天
        const cutoffTime = Date.now() - maxAge;
        const beforeCount = this.syncQueue.length;
        
        this.syncQueue = this.syncQueue.filter(item => item.timestamp > cutoffTime);
        
        const removedCount = beforeCount - this.syncQueue.length;
        if (removedCount > 0) {
            this.saveSyncQueue();
            console.log(`清理過期項目: ${removedCount} 個`);
        }

        return removedCount;
    }

    // 銷毀模組
    destroy() {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        // 移除事件監聽器
        window.removeEventListener('online', this.onOnline);
        window.removeEventListener('offline', this.onOffline);

        console.log('數據同步模組已銷毀');
    }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DataSyncManager;
} else if (typeof window !== 'undefined') {
    window.DataSyncManager = DataSyncManager;
}
