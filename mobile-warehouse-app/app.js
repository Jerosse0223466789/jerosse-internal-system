/**
 * 主應用程式
 * 整合所有模組，提供統一的API和生命週期管理
 */

class SmartWarehouseApp {
    constructor(config = {}) {
        this.config = window.getConfig ? window.getConfig('production') : window.AppConfig;
        this.modules = {};
        this.isInitialized = false;
        this.currentUser = null;
        this.eventListeners = new Map();
        
        // 合併自定義配置
        if (config && typeof config === 'object') {
            this.config = this.mergeConfig(this.config, config);
        }

        this.init();
    }

    async init() {
        try {
            console.log('🚀 智能倉儲管理系統啟動中...');
            
            // 驗證配置
            this.validateConfig();
            
            // 初始化核心功能
            await this.initializeCore();
            
            // 載入模組
            await this.loadModules();
            
            // 設定事件監聽
            this.setupEventListeners();
            
            // 載入使用者資料
            await this.loadUserData();
            
            // 啟動定期任務
            this.startPeriodicTasks();
            
            this.isInitialized = true;
            this.dispatchEvent('app-initialized');
            
            console.log('✅ 系統初始化完成');
            
        } catch (error) {
            console.error('❌ 系統初始化失敗:', error);
            this.dispatchEvent('app-init-failed', { error });
            throw error;
        }
    }

    validateConfig() {
        if (window.ConfigManager && window.ConfigManager.validate) {
            window.ConfigManager.validate(this.config);
        }
    }

    async initializeCore() {
        // 檢查瀏覽器兼容性
        this.checkBrowserCompatibility();
        
        // 設定全域錯誤處理
        this.setupErrorHandling();
        
        // 初始化儲存
        this.initializeStorage();
        
        // 檢查網路狀態
        this.checkNetworkStatus();
    }

    checkBrowserCompatibility() {
        const requiredFeatures = [
            'localStorage',
            'sessionStorage',
            'fetch',
            'Promise',
            'addEventListener'
        ];

        const missing = requiredFeatures.filter(feature => !window[feature]);
        
        if (missing.length > 0) {
            throw new Error(`瀏覽器不支援必要功能: ${missing.join(', ')}`);
        }

        console.log('✅ 瀏覽器兼容性檢查通過');
    }

    setupErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('全域錯誤:', event.error);
            this.logError('global-error', event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('未處理的Promise拒絕:', event.reason);
            this.logError('unhandled-rejection', event.reason);
        });
    }

    initializeStorage() {
        try {
            // 測試localStorage可用性
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            
            console.log('✅ 本地儲存可用');
        } catch (error) {
            console.warn('⚠️ 本地儲存不可用，使用記憶體儲存');
            this.fallbackStorage = new Map();
        }
    }

    checkNetworkStatus() {
        this.isOnline = navigator.onLine;
        
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.dispatchEvent('network-online');
            console.log('🌐 網路已連線');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.dispatchEvent('network-offline');
            console.log('📵 網路已斷線');
        });
    }

    async loadModules() {
        console.log('📦 載入應用程式模組...');
        
        // 初始化數據同步管理器
        if (window.DataSyncManager) {
            this.modules.dataSync = new window.DataSyncManager();
            console.log('✅ 數據同步模組已載入');
        }

        // 初始化庫存管理器
        if (window.InventoryManager) {
            this.modules.inventory = new window.InventoryManager();
            console.log('✅ 庫存管理模組已載入');
        }

        // 初始化條碼掃描器
        if (window.BarcodeScanner) {
            this.modules.scanner = new window.BarcodeScanner();
            console.log('✅ 條碼掃描模組已載入');
        }

        // 設定API端點
        if (this.modules.dataSync && this.config.api.endpoints) {
            this.modules.dataSync.setEndpoints(this.config.api.endpoints);
        }

        console.log('✅ 所有模組載入完成');
    }

    setupEventListeners() {
        // 監聽掃描事件
        document.addEventListener('barcode-scanned', (event) => {
            this.handleBarcodeScanned(event.detail);
        });

        // 監聽同步事件
        document.addEventListener('sync-completed', (event) => {
            this.handleSyncCompleted(event.detail);
        });

        // 監聽庫存統計更新
        document.addEventListener('inventory-stats-updated', (event) => {
            this.handleStatsUpdated(event.detail);
        });

        // 監聽網路狀態變化
        this.addEventListener('network-online', () => {
            this.handleNetworkOnline();
        });

        this.addEventListener('network-offline', () => {
            this.handleNetworkOffline();
        });
    }

    async loadUserData() {
        try {
            const savedUser = this.getStorageItem('current-user');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                console.log('✅ 使用者資料已載入:', this.currentUser.name);
            } else {
                // 創建預設使用者
                this.currentUser = {
                    id: 'default',
                    name: '預設使用者',
                    role: 'operator',
                    permissions: ['read', 'write'],
                    lastLogin: new Date().toISOString()
                };
                this.saveUserData();
            }
        } catch (error) {
            console.error('載入使用者資料失敗:', error);
        }
    }

    saveUserData() {
        if (this.currentUser) {
            this.setStorageItem('current-user', JSON.stringify(this.currentUser));
        }
    }

    startPeriodicTasks() {
        // 每分鐘更新統計
        setInterval(() => {
            this.updateStats();
        }, 60000);

        // 每10分鐘清理過期資料
        setInterval(() => {
            this.cleanupExpiredData();
        }, 10 * 60000);

        // 每小時進行完整同步
        setInterval(() => {
            if (this.isOnline && this.modules.dataSync) {
                this.modules.dataSync.manualSync().catch(console.error);
            }
        }, 60 * 60000);
    }

    // 處理條碼掃描結果
    handleBarcodeScanned(barcodeData) {
        console.log('處理條碼掃描結果:', barcodeData);
        
        // 更新掃描統計
        this.incrementScanCount();
        
        // 查找對應商品
        if (this.modules.inventory) {
            this.modules.inventory.handleScanResult(barcodeData);
        }
        
        // 發送自定義事件供UI使用
        this.dispatchEvent('product-scanned', barcodeData);
    }

    // 處理同步完成
    handleSyncCompleted(syncResult) {
        console.log('同步完成:', syncResult);
        
        // 更新UI狀態
        this.dispatchEvent('sync-status-updated', syncResult);
        
        // 顯示通知
        if (syncResult.success > 0) {
            this.showNotification(`已同步 ${syncResult.success} 個項目`, 'success');
        }
        
        if (syncResult.failure > 0) {
            this.showNotification(`${syncResult.failure} 個項目同步失敗`, 'warning');
        }
    }

    // 處理統計更新
    handleStatsUpdated(stats) {
        this.dispatchEvent('dashboard-stats-updated', stats);
    }

    // 處理網路上線
    handleNetworkOnline() {
        this.showNotification('網路已連線，開始同步資料', 'info');
        
        // 觸發同步
        if (this.modules.dataSync) {
            this.modules.dataSync.manualSync().catch(console.error);
        }
    }

    // 處理網路離線
    handleNetworkOffline() {
        this.showNotification('網路已斷線，切換到離線模式', 'warning');
    }

    // 公開API方法

    // 開始庫存盤點
    async startInventory(sessionData) {
        if (!this.modules.inventory) {
            throw new Error('庫存管理模組未載入');
        }

        const session = this.modules.inventory.startInventorySession({
            ...sessionData,
            operator: this.currentUser ? this.currentUser.name : '未知使用者'
        });

        this.dispatchEvent('inventory-session-started', session);
        return session;
    }

    // 添加盤點項目
    async addInventoryItem(itemData) {
        if (!this.modules.inventory) {
            throw new Error('庫存管理模組未載入');
        }

        const item = this.modules.inventory.addInventoryItem(itemData);
        
        // 同步到後端
        if (this.modules.dataSync) {
            this.modules.dataSync.syncInventoryData(item);
        }

        this.dispatchEvent('inventory-item-added', item);
        return item;
    }

    // 完成庫存盤點
    async completeInventory(summary) {
        if (!this.modules.inventory) {
            throw new Error('庫存管理模組未載入');
        }

        const completedSession = this.modules.inventory.completeInventorySession(summary);
        
        // 同步完整的盤點結果
        if (this.modules.dataSync) {
            this.modules.dataSync.addToSyncQueue({
                endpoint: 'inventory',
                action: 'completeSession',
                priority: 'high',
                sessionData: completedSession
            });
        }

        this.dispatchEvent('inventory-session-completed', completedSession);
        return completedSession;
    }

    // 開始條碼掃描
    async startScanning(options = {}) {
        if (!this.modules.scanner) {
            throw new Error('條碼掃描模組未載入');
        }

        await this.modules.scanner.startScan(options);
    }

    // 停止條碼掃描
    stopScanning() {
        if (this.modules.scanner) {
            this.modules.scanner.stopScan();
        }
    }

    // 搜尋庫存
    searchInventory(query, filters = {}) {
        if (!this.modules.inventory) {
            return [];
        }

        return this.modules.inventory.searchItems(query, filters);
    }

    // 獲取統計資料
    getStats() {
        const stats = {
            app: {
                version: this.config.app.version,
                uptime: Date.now() - this.startTime,
                isOnline: this.isOnline
            }
        };

        if (this.modules.inventory) {
            stats.inventory = this.modules.inventory.getInventoryStats();
        }

        if (this.modules.scanner) {
            stats.scanner = this.modules.scanner.getScanStats();
        }

        if (this.modules.dataSync) {
            stats.sync = this.modules.dataSync.getSyncStats();
        }

        return stats;
    }

    // 匯出資料
    async exportData(format = 'json', modules = ['inventory']) {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: this.config.app.version,
            user: this.currentUser,
            data: {}
        };

        for (const moduleName of modules) {
            const module = this.modules[moduleName];
            if (module && typeof module.exportData === 'function') {
                exportData.data[moduleName] = module.exportData(format);
            }
        }

        return format === 'json' ? 
            JSON.stringify(exportData, null, 2) : 
            exportData;
    }

    // 設定API端點
    setApiEndpoints(endpoints) {
        if (this.modules.dataSync) {
            this.modules.dataSync.setEndpoints(endpoints);
        }
        
        // 儲存到配置
        Object.assign(this.config.api.endpoints, endpoints);
    }

    // 手動同步
    async manualSync() {
        if (!this.modules.dataSync) {
            throw new Error('數據同步模組未載入');
        }

        if (!this.isOnline) {
            throw new Error('無網路連線');
        }

        await this.modules.dataSync.manualSync();
    }

    // 顯示通知
    showNotification(message, type = 'info', duration = 3000) {
        const notification = {
            id: Date.now(),
            message,
            type,
            timestamp: new Date().toISOString()
        };

        this.dispatchEvent('notification-show', notification);

        // 自動隱藏
        setTimeout(() => {
            this.dispatchEvent('notification-hide', { id: notification.id });
        }, duration);

        return notification.id;
    }

    // 工具方法

    incrementScanCount() {
        const today = new Date().toDateString();
        const key = `scan-count-${today}`;
        const current = parseInt(this.getStorageItem(key) || '0');
        this.setStorageItem(key, (current + 1).toString());
    }

    updateStats() {
        const stats = this.getStats();
        this.dispatchEvent('stats-updated', stats);
    }

    cleanupExpiredData() {
        // 清理過期的同步佇列項目
        if (this.modules.dataSync) {
            this.modules.dataSync.cleanupExpiredItems();
        }

        // 清理過期的掃描記錄
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30天
        const cutoff = Date.now() - maxAge;
        
        // 清理每日統計
        const keys = Object.keys(localStorage).filter(key => 
            key.startsWith('scan-count-') || key.startsWith('inventory-count-')
        );
        
        keys.forEach(key => {
            try {
                const dateStr = key.split('-').slice(2).join('-');
                const date = new Date(dateStr);
                if (date.getTime() < cutoff) {
                    localStorage.removeItem(key);
                }
            } catch (error) {
                // 忽略無效的鍵
            }
        });
    }

    // 儲存方法
    getStorageItem(key) {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            return this.fallbackStorage ? this.fallbackStorage.get(key) : null;
        }
    }

    setStorageItem(key, value) {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            if (this.fallbackStorage) {
                this.fallbackStorage.set(key, value);
            }
        }
    }

    // 事件系統
    addEventListener(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        this.eventListeners.get(eventName).add(callback);
    }

    removeEventListener(eventName, callback) {
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).delete(callback);
        }
    }

    dispatchEvent(eventName, data = {}) {
        // 發送DOM事件
        document.dispatchEvent(new CustomEvent(`app-${eventName}`, {
            detail: data
        }));

        // 觸發內部監聽器
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件監聽器錯誤 (${eventName}):`, error);
                }
            });
        }
    }

    logError(type, error) {
        const errorLog = {
            type,
            message: error.message || error,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };

        console.error('錯誤記錄:', errorLog);
        
        // 可以在這裡添加錯誤報告邏輯
        this.dispatchEvent('error-logged', errorLog);
    }

    mergeConfig(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.mergeConfig(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    // 銷毀應用程式
    destroy() {
        console.log('🔄 應用程式銷毀中...');
        
        // 停止定期任務
        if (this.periodicTasks) {
            this.periodicTasks.forEach(clearInterval);
        }

        // 銷毀模組
        Object.values(this.modules).forEach(module => {
            if (typeof module.destroy === 'function') {
                module.destroy();
            }
        });

        // 清理事件監聽器
        this.eventListeners.clear();

        this.isInitialized = false;
        console.log('✅ 應用程式已銷毀');
    }
}

// 全域應用程式實例
let globalApp = null;

// 初始化應用程式
async function initializeApp(config = {}) {
    if (globalApp) {
        console.warn('應用程式已初始化');
        return globalApp;
    }

    try {
        globalApp = new SmartWarehouseApp(config);
        window.warehouseApp = globalApp; // 供除錯使用
        return globalApp;
    } catch (error) {
        console.error('應用程式初始化失敗:', error);
        throw error;
    }
}

// 獲取應用程式實例
function getApp() {
    return globalApp;
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SmartWarehouseApp, initializeApp, getApp };
} else if (typeof window !== 'undefined') {
    window.SmartWarehouseApp = SmartWarehouseApp;
    window.initializeApp = initializeApp;
    window.getApp = getApp;
}
