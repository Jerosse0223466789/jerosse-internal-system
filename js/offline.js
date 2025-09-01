/**
 * 離線功能支援
 * 實現離線資料儲存、同步和快取管理
 */

class OfflineManager {
    constructor(app) {
        this.app = app;
        this.dbName = 'WarehouseAppDB';
        this.dbVersion = 1;
        this.db = null;
        this.stores = {
            inventory: 'inventory',
            transfer: 'transfer',
            batch: 'batch',
            cache: 'cache'
        };
        
        this.init();
    }

    async init() {
        await this.initIndexedDB();
        this.setupEventListeners();
        this.startPeriodicSync();
    }

    async initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('IndexedDB 開啟失敗:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB 初始化成功');
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // 盤點資料存儲
                if (!db.objectStoreNames.contains(this.stores.inventory)) {
                    const inventoryStore = db.createObjectStore(this.stores.inventory, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    inventoryStore.createIndex('timestamp', 'timestamp', { unique: false });
                    inventoryStore.createIndex('synced', 'synced', { unique: false });
                }
                
                // 轉移資料存儲
                if (!db.objectStoreNames.contains(this.stores.transfer)) {
                    const transferStore = db.createObjectStore(this.stores.transfer, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    transferStore.createIndex('timestamp', 'timestamp', { unique: false });
                    transferStore.createIndex('synced', 'synced', { unique: false });
                }
                
                // 批號資料存儲
                if (!db.objectStoreNames.contains(this.stores.batch)) {
                    const batchStore = db.createObjectStore(this.stores.batch, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    batchStore.createIndex('batchNumber', 'batchNumber', { unique: false });
                    batchStore.createIndex('synced', 'synced', { unique: false });
                }
                
                // 快取資料存儲
                if (!db.objectStoreNames.contains(this.stores.cache)) {
                    const cacheStore = db.createObjectStore(this.stores.cache, {
                        keyPath: 'key'
                    });
                    cacheStore.createIndex('timestamp', 'timestamp', { unique: false });
                    cacheStore.createIndex('expiry', 'expiry', { unique: false });
                }
            };
        });
    }

    setupEventListeners() {
        // 監聽網路狀態變化
        window.addEventListener('online', () => {
            this.onOnline();
        });
        
        window.addEventListener('offline', () => {
            this.onOffline();
        });
        
        // 監聽頁面關閉事件，確保資料同步
        window.addEventListener('beforeunload', () => {
            this.syncUrgentData();
        });
    }

    onOnline() {
        console.log('網路已連線，開始同步離線資料');
        this.syncAllOfflineData();
    }

    onOffline() {
        console.log('網路已斷線，切換到離線模式');
        this.app.showMessage('已切換到離線模式', 'warning');
    }

    // 儲存離線資料
    async saveOfflineData(store, data) {
        if (!this.db) {
            console.error('IndexedDB 未初始化');
            return;
        }

        const transaction = this.db.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);
        
        const dataToSave = {
            ...data,
            timestamp: Date.now(),
            synced: false
        };

        return new Promise((resolve, reject) => {
            const request = objectStore.add(dataToSave);
            
            request.onsuccess = () => {
                console.log('離線資料已儲存:', dataToSave);
                resolve(request.result);
            };
            
            request.onerror = () => {
                console.error('儲存離線資料失敗:', request.error);
                reject(request.error);
            };
        });
    }

    // 讀取離線資料
    async getOfflineData(store, filter = null) {
        if (!this.db) return [];

        const transaction = this.db.transaction([store], 'readonly');
        const objectStore = transaction.objectStore(store);

        return new Promise((resolve, reject) => {
            const request = objectStore.getAll();
            
            request.onsuccess = () => {
                let data = request.result;
                
                if (filter) {
                    data = data.filter(filter);
                }
                
                resolve(data);
            };
            
            request.onerror = () => {
                reject(request.error);
            };
        });
    }

    // 更新離線資料同步狀態
    async markAsSynced(store, id) {
        if (!this.db) return;

        const transaction = this.db.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);

        return new Promise((resolve, reject) => {
            const getRequest = objectStore.get(id);
            
            getRequest.onsuccess = () => {
                const data = getRequest.result;
                if (data) {
                    data.synced = true;
                    data.syncedAt = Date.now();
                    
                    const putRequest = objectStore.put(data);
                    
                    putRequest.onsuccess = () => resolve();
                    putRequest.onerror = () => reject(putRequest.error);
                } else {
                    resolve();
                }
            };
            
            getRequest.onerror = () => reject(getRequest.error);
        });
    }

    // 刪除已同步的離線資料
    async deleteOfflineData(store, id) {
        if (!this.db) return;

        const transaction = this.db.transaction([store], 'readwrite');
        const objectStore = transaction.objectStore(store);

        return new Promise((resolve, reject) => {
            const request = objectStore.delete(id);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // 儲存盤點資料到離線
    async saveInventoryOffline(inventoryData) {
        try {
            await this.saveOfflineData(this.stores.inventory, {
                type: 'inventory',
                area: inventoryData.area,
                category: inventoryData.category,
                item: inventoryData.item,
                quantity: inventoryData.quantity,
                person: inventoryData.person,
                createdAt: inventoryData.timestamp || new Date().toISOString()
            });
            
            this.updateOfflineCount();
            return true;
        } catch (error) {
            console.error('儲存離線盤點資料失敗:', error);
            return false;
        }
    }

    // 儲存轉移資料到離線
    async saveTransferOffline(transferData) {
        try {
            await this.saveOfflineData(this.stores.transfer, {
                type: 'transfer',
                sourceWarehouse: transferData.sourceWarehouse,
                targetWarehouse: transferData.targetWarehouse,
                items: transferData.items,
                person: transferData.person,
                createdAt: transferData.timestamp || new Date().toISOString()
            });
            
            this.updateOfflineCount();
            return true;
        } catch (error) {
            console.error('儲存離線轉移資料失敗:', error);
            return false;
        }
    }

    // 儲存批號資料到離線
    async saveBatchOffline(batchData) {
        try {
            await this.saveOfflineData(this.stores.batch, {
                type: 'batch',
                batchNumber: batchData.batchNumber,
                product: batchData.product,
                quantity: batchData.quantity,
                expiry: batchData.expiry,
                location: batchData.location,
                createdAt: batchData.timestamp || new Date().toISOString()
            });
            
            this.updateOfflineCount();
            return true;
        } catch (error) {
            console.error('儲存離線批號資料失敗:', error);
            return false;
        }
    }

    // 同步所有離線資料
    async syncAllOfflineData() {
        if (!navigator.onLine) {
            console.log('網路未連線，無法同步');
            return;
        }

        try {
            await Promise.all([
                this.syncInventoryData(),
                this.syncTransferData(),
                this.syncBatchData()
            ]);
            
            this.app.showMessage('離線資料同步完成', 'success');
        } catch (error) {
            console.error('同步離線資料失敗:', error);
            this.app.showMessage('資料同步失敗', 'error');
        }
    }

    // 同步盤點資料
    async syncInventoryData() {
        const unsyncedData = await this.getOfflineData(
            this.stores.inventory, 
            item => !item.synced
        );

        for (const item of unsyncedData) {
            try {
                await this.app.apiCall('submitInventory', {
                    area: item.area,
                    category: item.category,
                    item: item.item,
                    quantity: item.quantity,
                    person: item.person,
                    timestamp: item.createdAt
                });
                
                await this.markAsSynced(this.stores.inventory, item.id);
                console.log('盤點資料同步成功:', item.id);
                
            } catch (error) {
                console.error('盤點資料同步失敗:', error);
            }
        }
    }

    // 同步轉移資料
    async syncTransferData() {
        const unsyncedData = await this.getOfflineData(
            this.stores.transfer, 
            item => !item.synced
        );

        for (const item of unsyncedData) {
            try {
                await this.app.apiCall('submitTransfer', {
                    sourceWarehouse: item.sourceWarehouse,
                    targetWarehouse: item.targetWarehouse,
                    items: item.items,
                    person: item.person,
                    timestamp: item.createdAt
                });
                
                await this.markAsSynced(this.stores.transfer, item.id);
                console.log('轉移資料同步成功:', item.id);
                
            } catch (error) {
                console.error('轉移資料同步失敗:', error);
            }
        }
    }

    // 同步批號資料
    async syncBatchData() {
        const unsyncedData = await this.getOfflineData(
            this.stores.batch, 
            item => !item.synced
        );

        for (const item of unsyncedData) {
            try {
                await this.app.apiCall('submitBatch', {
                    batchNumber: item.batchNumber,
                    product: item.product,
                    quantity: item.quantity,
                    expiry: item.expiry,
                    location: item.location,
                    timestamp: item.createdAt
                });
                
                await this.markAsSynced(this.stores.batch, item.id);
                console.log('批號資料同步成功:', item.id);
                
            } catch (error) {
                console.error('批號資料同步失敗:', error);
            }
        }
    }

    // 緊急資料同步（頁面關閉前）
    async syncUrgentData() {
        // 使用 sendBeacon API 在頁面關閉前快速同步重要資料
        if (!navigator.onLine) return;

        const urgentData = await this.getUrgentUnsyncedData();
        
        if (urgentData.length > 0) {
            const payload = JSON.stringify({
                action: 'syncUrgentData',
                data: urgentData
            });

            if (navigator.sendBeacon) {
                navigator.sendBeacon(this.app.apiBaseUrl, payload);
            }
        }
    }

    async getUrgentUnsyncedData() {
        const now = Date.now();
        const urgentThreshold = 5 * 60 * 1000; // 5分鐘內的資料
        
        const inventoryData = await this.getOfflineData(
            this.stores.inventory,
            item => !item.synced && (now - item.timestamp) < urgentThreshold
        );
        
        return inventoryData;
    }

    // 快取管理
    async setCache(key, data, ttl = 300000) { // 預設5分鐘過期
        const cacheData = {
            key,
            data,
            timestamp: Date.now(),
            expiry: Date.now() + ttl
        };

        const transaction = this.db.transaction([this.stores.cache], 'readwrite');
        const objectStore = transaction.objectStore(this.stores.cache);

        return new Promise((resolve, reject) => {
            const request = objectStore.put(cacheData);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getCache(key) {
        if (!this.db) return null;

        const transaction = this.db.transaction([this.stores.cache], 'readonly');
        const objectStore = transaction.objectStore(this.stores.cache);

        return new Promise((resolve, reject) => {
            const request = objectStore.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                
                if (!result) {
                    resolve(null);
                    return;
                }
                
                // 檢查是否過期
                if (Date.now() > result.expiry) {
                    this.deleteCache(key);
                    resolve(null);
                    return;
                }
                
                resolve(result.data);
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    async deleteCache(key) {
        if (!this.db) return;

        const transaction = this.db.transaction([this.stores.cache], 'readwrite');
        const objectStore = transaction.objectStore(this.stores.cache);

        return new Promise((resolve, reject) => {
            const request = objectStore.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // 清理過期快取
    async cleanExpiredCache() {
        if (!this.db) return;

        const transaction = this.db.transaction([this.stores.cache], 'readwrite');
        const objectStore = transaction.objectStore(this.stores.cache);
        const index = objectStore.index('expiry');
        
        const now = Date.now();
        const range = IDBKeyRange.upperBound(now);

        return new Promise((resolve, reject) => {
            const request = index.openCursor(range);
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    }

    // 定期同步
    startPeriodicSync() {
        // 每5分鐘檢查一次同步
        setInterval(() => {
            if (navigator.onLine) {
                this.syncAllOfflineData();
            }
        }, 5 * 60 * 1000);

        // 每小時清理一次過期快取
        setInterval(() => {
            this.cleanExpiredCache();
        }, 60 * 60 * 1000);
    }

    // 更新離線資料計數
    async updateOfflineCount() {
        try {
            const counts = await Promise.all([
                this.getOfflineData(this.stores.inventory, item => !item.synced),
                this.getOfflineData(this.stores.transfer, item => !item.synced),
                this.getOfflineData(this.stores.batch, item => !item.synced)
            ]);

            const totalCount = counts.reduce((total, items) => total + items.length, 0);
            
            const countElement = document.getElementById('offlineCount');
            if (countElement) {
                countElement.textContent = totalCount;
            }

            // 更新同步按鈕顯示
            const syncBtn = document.getElementById('syncBtn');
            if (syncBtn && totalCount > 0) {
                syncBtn.classList.add('has-offline-data');
            } else if (syncBtn) {
                syncBtn.classList.remove('has-offline-data');
            }

        } catch (error) {
            console.error('更新離線資料計數失敗:', error);
        }
    }

    // 匯出離線資料
    async exportOfflineData() {
        try {
            const allData = {
                inventory: await this.getOfflineData(this.stores.inventory),
                transfer: await this.getOfflineData(this.stores.transfer),
                batch: await this.getOfflineData(this.stores.batch),
                exportedAt: new Date().toISOString()
            };

            const dataStr = JSON.stringify(allData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `warehouse-offline-data-${Date.now()}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            this.app.showMessage('離線資料已匯出', 'success');
            
        } catch (error) {
            console.error('匯出離線資料失敗:', error);
            this.app.showMessage('匯出失敗', 'error');
        }
    }

    // 清除所有離線資料
    async clearAllOfflineData() {
        try {
            const stores = Object.values(this.stores);
            
            for (const store of stores) {
                const transaction = this.db.transaction([store], 'readwrite');
                const objectStore = transaction.objectStore(store);
                await new Promise((resolve, reject) => {
                    const request = objectStore.clear();
                    request.onsuccess = () => resolve();
                    request.onerror = () => reject(request.error);
                });
            }
            
            this.updateOfflineCount();
            this.app.showMessage('離線資料已清除', 'success');
            
        } catch (error) {
            console.error('清除離線資料失敗:', error);
            this.app.showMessage('清除失敗', 'error');
        }
    }
}

// 當應用程式初始化時創建離線管理器實例
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.warehouseApp) {
            window.warehouseApp.offline = new OfflineManager(window.warehouseApp);
            
            // 添加離線功能方法到主應用程式
            window.warehouseApp.saveOfflineInventory = (data) => {
                return window.warehouseApp.offline.saveInventoryOffline(data);
            };
            
            window.warehouseApp.syncOfflineData = () => {
                return window.warehouseApp.offline.syncAllOfflineData();
            };
        }
    }, 1000);
});
