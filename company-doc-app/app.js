/**
 * 公司文件管理系統 - 主應用程式
 * 整合所有模組，提供統一的API和生命週期管理
 */

class CompanyDocApp {
    constructor(config = {}) {
        this.config = window.getDocConfig ? window.getDocConfig('production') : window.DocAppConfig;
        this.modules = {};
        this.isInitialized = false;
        this.eventListeners = new Map();
        
        // 合併自定義配置
        if (config && typeof config === 'object') {
            this.config = this.mergeConfig(this.config, config);
        }

        // 檢測開發環境
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            this.config = window.getDocConfig('development');
        }

        this.init();
    }

    async init() {
        try {
            console.log('🚀 公司文件管理系統啟動中...');
            
            // 驗證配置
            this.validateConfig();
            
            // 初始化核心功能
            await this.initializeCore();
            
            // 載入模組
            await this.loadModules();
            
            // 設定事件監聽
            this.setupEventListeners();
            
            // 設定登入表單
            this.setupLoginForm();
            
            this.isInitialized = true;
            this.dispatchEvent('app-initialized');
            
            console.log('✅ 系統初始化完成');
            
        } catch (error) {
            console.error('❌ 系統初始化失敗:', error);
            this.dispatchEvent('app-init-failed', { error });
            this.showCriticalError(error);
        }
    }

    validateConfig() {
        if (window.DocConfigManager && window.DocConfigManager.validate) {
            window.DocConfigManager.validate(this.config);
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
        
        // 設定主題
        this.applyTheme();
    }

    checkBrowserCompatibility() {
        const requiredFeatures = [
            'localStorage',
            'sessionStorage',
            'fetch',
            'Promise',
            'addEventListener',
            'CustomEvent'
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
            this.showNotification('網路已連線', 'success');
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.dispatchEvent('network-offline');
            console.log('📵 網路已斷線');
            this.showNotification('網路已斷線，切換到離線模式', 'warning');
        });
    }

    applyTheme() {
        const theme = this.config.ui.theme;
        const root = document.documentElement;
        
        // 設定CSS變數
        Object.entries(theme).forEach(([key, value]) => {
            root.style.setProperty(`--${key}`, value);
        });
        
        console.log('🎨 主題已套用');
    }

    async loadModules() {
        console.log('📦 載入應用程式模組...');
        
        try {
            // 初始化認證管理器
            if (window.AuthManager) {
                this.modules.auth = new window.AuthManager(this.config);
                console.log('✅ 認證模組已載入');
            }

            // 初始化數據同步管理器
            if (window.DataSyncManager) {
                this.modules.dataSync = new window.DataSyncManager(this.config);
                console.log('✅ 數據同步模組已載入');
            }

            // 初始化文件管理器（需要認證管理器）
            if (window.DocumentManager) {
                this.modules.documentManager = new window.DocumentManager(this.config, this.modules.auth);
                console.log('✅ 文件管理模組已載入');
            }

            console.log('✅ 所有模組載入完成');
            
        } catch (error) {
            console.error('模組載入失敗:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // 監聽認證事件
        document.addEventListener('auth-login-success', (event) => {
            console.log('用戶登入成功:', event.detail);
            this.handleLoginSuccess(event.detail);
        });

        document.addEventListener('auth-login-failed', (event) => {
            console.log('用戶登入失敗:', event.detail);
            this.handleLoginFailed(event.detail);
        });

        document.addEventListener('auth-logout', (event) => {
            console.log('用戶登出');
            this.handleLogout();
        });

        // 監聽同步事件
        document.addEventListener('sync-full-sync-complete', (event) => {
            console.log('同步完成:', event.detail);
            this.handleSyncComplete(event.detail);
        });

        document.addEventListener('sync-failed', (event) => {
            console.log('同步失敗:', event.detail);
            this.handleSyncFailed(event.detail);
        });

        // 監聽網路事件
        document.addEventListener('network-online', () => {
            this.handleNetworkOnline();
        });

        document.addEventListener('network-offline', () => {
            this.handleNetworkOffline();
        });
    }

    setupLoginForm() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                await this.handleLoginSubmit(event);
            });
        }
    }

    async handleLoginSubmit(event) {
        const form = event.target;
        const formData = new FormData(form);
        const username = formData.get('username') || document.getElementById('username').value;
        const password = formData.get('password') || document.getElementById('password').value;

        if (!username || !password) {
            this.showNotification('請輸入帳號和密碼', 'error');
            return;
        }

        try {
            // 顯示載入狀態
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = '🔄 登入中...';
            submitBtn.disabled = true;

            // 執行登入
            if (this.modules.auth) {
                await this.modules.auth.login(username, password);
            }

        } catch (error) {
            console.error('登入錯誤:', error);
            this.showNotification(error.message, 'error');
        } finally {
            // 恢復按鈕狀態
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.textContent = '🔐 登入系統';
            submitBtn.disabled = false;
        }
    }

    handleLoginSuccess(userInfo) {
        this.showNotification(`歡迎回來，${userInfo.name}！`, 'success');
        
        // 切換到主界面
        this.showMainContent();
        
        // 觸發應用程式就緒事件
        this.dispatchEvent('app-ready', userInfo);
    }

    handleLoginFailed(errorInfo) {
        this.showNotification(errorInfo.error || '登入失敗', 'error');
    }

    handleLogout() {
        this.showNotification('已安全登出', 'info');
        
        // 切換到登入界面
        this.showLoginForm();
        
        // 清理敏感數據
        this.clearSensitiveData();
    }

    handleSyncComplete(syncStats) {
        if (syncStats.success > 0) {
            this.showNotification(`同步完成，更新了 ${syncStats.success} 項資料`, 'success');
        }
    }

    handleSyncFailed(errorInfo) {
        this.showNotification('數據同步失敗: ' + errorInfo.error, 'warning');
    }

    handleNetworkOnline() {
        // 觸發自動同步
        if (this.modules.dataSync) {
            this.modules.dataSync.manualSync().catch(console.error);
        }
    }

    handleNetworkOffline() {
        // 通知用戶切換到離線模式
        this.showNotification('已切換到離線模式，部分功能可能受限', 'warning', 5000);
    }

    showMainContent() {
        const loginContainer = document.getElementById('loginContainer');
        const mainContent = document.getElementById('mainContent');
        
        if (loginContainer) {
            loginContainer.style.display = 'none';
        }
        
        if (mainContent) {
            mainContent.style.display = 'grid';
        }
    }

    showLoginForm() {
        const loginContainer = document.getElementById('loginContainer');
        const mainContent = document.getElementById('mainContent');
        
        if (loginContainer) {
            loginContainer.style.display = 'block';
        }
        
        if (mainContent) {
            mainContent.style.display = 'none';
        }
    }

    clearSensitiveData() {
        // 清除敏感的會話數據
        sessionStorage.clear();
        
        // 清除部分快取（保留用戶偏好）
        try {
            const keysToRemove = [
                this.config.storage.keys.userSession,
                this.config.storage.keys.cacheData
            ];
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
            });
        } catch (error) {
            console.error('清理敏感數據失敗:', error);
        }
    }

    // 公開API方法

    // 獲取當前用戶
    getCurrentUser() {
        return this.modules.auth ? this.modules.auth.getCurrentUser() : null;
    }

    // 檢查用戶權限
    hasPermission(permission, category = null) {
        return this.modules.auth ? this.modules.auth.hasPermission(permission, category) : false;
    }

    // 搜尋文件
    searchDocuments(query) {
        if (this.modules.documentManager) {
            this.modules.documentManager.searchDocuments(query);
        }
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

    // 獲取應用程式統計
    getAppStats() {
        const stats = {
            app: {
                version: this.config.app.version,
                uptime: Date.now() - this.startTime,
                isOnline: this.isOnline,
                initialized: this.isInitialized
            }
        };

        // 添加各模組統計
        if (this.modules.documentManager) {
            stats.documents = this.modules.documentManager.getStats();
        }

        if (this.modules.dataSync) {
            stats.sync = this.modules.dataSync.getSyncStats();
        }

        if (this.modules.auth) {
            stats.auth = {
                isAuthenticated: this.modules.auth.isLoggedIn(),
                userRole: this.modules.auth.getUserRole()
            };
        }

        return stats;
    }

    // 匯出數據
    async exportAppData(format = 'json') {
        const exportData = {
            timestamp: new Date().toISOString(),
            version: this.config.app.version,
            user: this.getCurrentUser(),
            stats: this.getAppStats(),
            data: {}
        };

        // 匯出文件數據
        if (this.modules.documentManager) {
            exportData.data.documents = this.modules.documentManager.exportDocuments(format);
        }

        // 匯出同步數據
        if (this.modules.dataSync) {
            exportData.data.sync = this.modules.dataSync.exportSyncData();
        }

        return format === 'json' ? 
            JSON.stringify(exportData, null, 2) : 
            exportData;
    }

    // 通知系統
    showNotification(message, type = 'info', duration = 3000) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type, duration);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }

    // 顯示嚴重錯誤
    showCriticalError(error) {
        const errorMessage = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 500px;
                text-align: center;
            ">
                <h2 style="color: #ef4444; margin-bottom: 15px;">❌ 系統初始化失敗</h2>
                <p style="margin-bottom: 20px; color: #64748b;">${error.message}</p>
                <button onclick="location.reload()" style="
                    background: #3b82f6;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                ">🔄 重新載入</button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', errorMessage);
    }

    // 工具方法
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

    logError(type, error) {
        const errorLog = {
            type,
            message: error.message || error,
            stack: error.stack,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            user: this.getCurrentUser()?.username || 'anonymous'
        };

        console.error('錯誤記錄:', errorLog);
        
        // 如果有同步模組，加入同步佇列
        if (this.modules.dataSync) {
            this.modules.dataSync.addToSyncQueue({
                endpoint: 'analytics',
                action: 'logError',
                data: errorLog
            });
        }
        
        this.dispatchEvent('error-logged', errorLog);
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

    // 銷毀應用程式
    destroy() {
        console.log('🔄 應用程式銷毀中...');
        
        // 銷毀模組
        Object.values(this.modules).forEach(module => {
            if (typeof module.destroy === 'function') {
                module.destroy();
            }
        });

        // 清理事件監聽器
        this.eventListeners.clear();

        // 清理定時器（如果有的話）
        if (this.timers) {
            this.timers.forEach(clearInterval);
        }

        this.isInitialized = false;
        console.log('✅ 應用程式已銷毀');
    }
}

// 全域應用程式實例
let globalDocApp = null;

// 初始化應用程式
async function initializeDocApp(config = {}) {
    if (globalDocApp) {
        console.warn('應用程式已初始化');
        return globalDocApp;
    }

    try {
        globalDocApp = new CompanyDocApp(config);
        window.docApp = globalDocApp; // 供除錯使用
        return globalDocApp;
    } catch (error) {
        console.error('應用程式初始化失敗:', error);
        throw error;
    }
}

// 獲取應用程式實例
function getDocApp() {
    return globalDocApp;
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CompanyDocApp, initializeDocApp, getDocApp };
} else if (typeof window !== 'undefined') {
    window.CompanyDocApp = CompanyDocApp;
    window.initializeDocApp = initializeDocApp;
    window.getDocApp = getDocApp;
}
