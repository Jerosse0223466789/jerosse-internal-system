/**
 * API 調用管理
 * 與現有 Google Apps Script 倉庫管理系統整合
 */

class APIManager {
    constructor(app) {
        this.app = app;
        
        // Google Apps Script Web App URLs
        // 請替換為您實際的 Google Apps Script 部署 URL
        this.endpoints = {
            inventory: 'https://script.google.com/macros/s/YOUR_INVENTORY_SCRIPT_ID/exec',
            batch: 'https://script.google.com/macros/s/YOUR_BATCH_SCRIPT_ID/exec',
            transfer: 'https://script.google.com/macros/s/YOUR_TRANSFER_SCRIPT_ID/exec',
            warehouse: 'https://script.google.com/macros/s/YOUR_WAREHOUSE_SCRIPT_ID/exec'
        };

        this.requestTimeout = 10000; // 10秒超時
        this.retryAttempts = 3;
        this.retryDelay = 1000; // 1秒

        this.init();
    }

    init() {
        // 設定請求攔截器
        this.setupRequestInterceptor();
    }

    setupRequestInterceptor() {
        // 監聽網路狀態
        window.addEventListener('online', () => {
            this.processOfflineQueue();
        });
    }

    /**
     * 通用 API 調用方法
     * @param {string} action - 操作類型
     * @param {object} data - 資料
     * @param {string} endpoint - 端點類型
     * @returns {Promise} 回應資料
     */
    async call(action, data = null, endpoint = 'inventory') {
        const url = this.endpoints[endpoint];
        
        if (!url || url.includes('YOUR_')) {
            throw new Error('請設定正確的 Google Apps Script URL');
        }

        const payload = {
            action: action,
            data: data,
            timestamp: new Date().toISOString(),
            source: 'mobile-app'
        };

        try {
            return await this.makeRequest(url, payload);
        } catch (error) {
            // 如果網路錯誤，儲存到離線佇列
            if (!navigator.onLine || error.name === 'NetworkError') {
                await this.addToOfflineQueue(action, data, endpoint);
                throw new Error('網路未連線，已儲存到離線佇列');
            }
            throw error;
        }
    }

    /**
     * 發送 HTTP 請求
     * @param {string} url - 請求 URL
     * @param {object} payload - 請求資料
     * @returns {Promise} 回應資料
     */
    async makeRequest(url, payload) {
        let lastError;

        for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'text/plain', // Google Apps Script 需要
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
                    const jsonResponse = JSON.parse(responseText);
                    
                    if (jsonResponse.error) {
                        throw new Error(jsonResponse.error);
                    }
                    
                    return jsonResponse;
                } catch (parseError) {
                    // 如果回應不是 JSON，可能是純文字
                    return { success: true, data: responseText };
                }

            } catch (error) {
                lastError = error;
                console.error(`API 調用失敗 (嘗試 ${attempt}/${this.retryAttempts}):`, error);

                if (attempt < this.retryAttempts) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }

        throw lastError;
    }

    /**
     * 延遲函數
     * @param {number} ms - 延遲毫秒數
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 添加到離線佇列
     * @param {string} action - 操作類型
     * @param {object} data - 資料
     * @param {string} endpoint - 端點類型
     */
    async addToOfflineQueue(action, data, endpoint) {
        const queueItem = {
            id: Date.now(),
            action,
            data,
            endpoint,
            timestamp: new Date().toISOString(),
            retries: 0
        };

        const queue = JSON.parse(localStorage.getItem('apiQueue') || '[]');
        queue.push(queueItem);
        localStorage.setItem('apiQueue', JSON.stringify(queue));

        console.log('已添加到離線佇列:', queueItem);
    }

    /**
     * 處理離線佇列
     */
    async processOfflineQueue() {
        const queue = JSON.parse(localStorage.getItem('apiQueue') || '[]');
        
        if (queue.length === 0) return;

        console.log(`處理離線佇列: ${queue.length} 個項目`);

        const successful = [];
        const failed = [];

        for (const item of queue) {
            try {
                await this.call(item.action, item.data, item.endpoint);
                successful.push(item);
                console.log('離線佇列項目處理成功:', item.id);
            } catch (error) {
                item.retries++;
                if (item.retries < 3) {
                    failed.push(item);
                } else {
                    console.error('離線佇列項目處理失敗，已放棄:', item.id, error);
                }
            }
        }

        // 更新佇列，移除成功的項目
        localStorage.setItem('apiQueue', JSON.stringify(failed));

        if (successful.length > 0) {
            this.app.showMessage(`已同步 ${successful.length} 個離線操作`, 'success');
        }
    }

    // === 盤點相關 API ===

    /**
     * 提交盤點資料
     */
    async submitInventory(inventoryData) {
        return await this.call('submitInventory', inventoryData, 'inventory');
    }

    /**
     * 獲取今日盤點統計
     */
    async getTodayStats() {
        return await this.call('getTodayStats', null, 'inventory');
    }

    /**
     * 獲取今日盤點記錄
     */
    async getTodayInventoryRecords() {
        return await this.call('getTodayInventoryRecords', null, 'inventory');
    }

    /**
     * 獲取分類列表
     */
    async getCategories(area) {
        return await this.call('getCategories', { area }, 'inventory');
    }

    /**
     * 獲取品項列表
     */
    async getItems(category) {
        return await this.call('getItems', { category }, 'inventory');
    }

    /**
     * 獲取人員列表
     */
    async getPeople() {
        return await this.call('getPeople', null, 'inventory');
    }

    // === 批號相關 API ===

    /**
     * 提交批號資料
     */
    async submitBatch(batchData) {
        return await this.call('submitBatch', batchData, 'batch');
    }

    /**
     * 搜尋批號
     */
    async searchBatch(searchTerm) {
        return await this.call('searchBatch', { searchTerm }, 'batch');
    }

    /**
     * 獲取批號資訊
     */
    async getBatchInfo(batchNumber) {
        return await this.call('getBatchInfo', { batchNumber }, 'batch');
    }

    /**
     * 獲取即將到期的批號
     */
    async getExpiringBatches(days = 30) {
        return await this.call('getExpiringBatches', { days }, 'batch');
    }

    /**
     * 根據條碼獲取產品資訊
     */
    async getProductByBarcode(barcode) {
        return await this.call('getProductByBarcode', { barcode }, 'batch');
    }

    // === 轉移相關 API ===

    /**
     * 提交轉移資料
     */
    async submitTransfer(transferData) {
        return await this.call('submitTransfer', transferData, 'transfer');
    }

    /**
     * 獲取轉移記錄
     */
    async getTransferHistory(days = 7) {
        return await this.call('getTransferHistory', { days }, 'transfer');
    }

    /**
     * 獲取倉庫列表
     */
    async getWarehouses() {
        return await this.call('getWarehouses', null, 'transfer');
    }

    /**
     * 根據倉庫獲取庫存
     */
    async getStockByWarehouse(warehouse) {
        return await this.call('getStockByWarehouse', { warehouse }, 'transfer');
    }

    // === 警示相關 API ===

    /**
     * 獲取警示資訊
     */
    async getAlerts() {
        return await this.call('getAlerts', null, 'warehouse');
    }

    /**
     * 標記警示為已讀
     */
    async markAlertAsRead(alertId) {
        return await this.call('markAlertAsRead', { alertId }, 'warehouse');
    }

    // === 統計相關 API ===

    /**
     * 獲取庫存統計
     */
    async getInventoryStats(timeRange = '7d') {
        return await this.call('getInventoryStats', { timeRange }, 'warehouse');
    }

    /**
     * 獲取操作記錄
     */
    async getOperationLogs(limit = 50) {
        return await this.call('getOperationLogs', { limit }, 'warehouse');
    }

    // === 同步相關 API ===

    /**
     * 批量同步離線資料
     */
    async syncOfflineData(offlineData) {
        return await this.call('syncOfflineData', { offlineData }, 'warehouse');
    }

    /**
     * 獲取同步狀態
     */
    async getSyncStatus() {
        return await this.call('getSyncStatus', null, 'warehouse');
    }

    // === 快取管理 ===

    /**
     * 從快取或 API 獲取資料
     * @param {string} cacheKey - 快取鍵值
     * @param {Function} apiFunction - API 函數
     * @param {number} ttl - 快取存活時間（毫秒）
     */
    async getWithCache(cacheKey, apiFunction, ttl = 300000) {
        // 嘗試從快取獲取
        if (this.app.offline) {
            const cachedData = await this.app.offline.getCache(cacheKey);
            if (cachedData) {
                return cachedData;
            }
        }

        // 快取未命中，調用 API
        try {
            const data = await apiFunction();
            
            // 儲存到快取
            if (this.app.offline) {
                await this.app.offline.setCache(cacheKey, data, ttl);
            }
            
            return data;
        } catch (error) {
            // API 調用失敗，嘗試返回過期的快取資料
            if (this.app.offline) {
                const staleData = await this.app.offline.getCache(cacheKey, true);
                if (staleData) {
                    this.app.showMessage('使用快取資料', 'warning');
                    return staleData;
                }
            }
            throw error;
        }
    }

    // === 錯誤處理 ===

    /**
     * 標準化錯誤處理
     * @param {Error} error - 錯誤物件
     * @returns {object} 標準化的錯誤資訊
     */
    handleError(error) {
        let errorMessage = '未知錯誤';
        let errorType = 'unknown';

        if (error.name === 'AbortError') {
            errorMessage = '請求超時';
            errorType = 'timeout';
        } else if (error.message.includes('網路')) {
            errorMessage = '網路連線問題';
            errorType = 'network';
        } else if (error.message.includes('權限')) {
            errorMessage = '權限不足';
            errorType = 'permission';
        } else if (error.message.includes('驗證')) {
            errorMessage = '資料驗證失敗';
            errorType = 'validation';
        } else {
            errorMessage = error.message || '操作失敗';
        }

        return {
            type: errorType,
            message: errorMessage,
            originalError: error
        };
    }

    // === 健康檢查 ===

    /**
     * 檢查 API 連接狀態
     */
    async healthCheck() {
        try {
            const startTime = Date.now();
            await this.call('ping', null, 'warehouse');
            const responseTime = Date.now() - startTime;
            
            return {
                status: 'healthy',
                responseTime: responseTime,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: this.handleError(error),
                timestamp: new Date().toISOString()
            };
        }
    }

    // === 開發調試 ===

    /**
     * 模擬 API 回應（開發用）
     */
    createMockResponse(action, data) {
        const mockResponses = {
            getTodayStats: {
                inventoryCount: Math.floor(Math.random() * 100),
                transferCount: Math.floor(Math.random() * 20),
                batchCount: Math.floor(Math.random() * 50)
            },
            getCategories: ['纖體組', '美肌組', '機能組'],
            getItems: [
                { name: '產品A', barcode: '1234567890' },
                { name: '產品B', barcode: '2345678901' },
                { name: '產品C', barcode: '3456789012' }
            ],
            getPeople: ['張三', '李四', '王五'],
            getWarehouses: ['1F', '2F', '3F'],
            getAlerts: []
        };

        return mockResponses[action] || { success: true };
    }
}

// 當應用程式初始化時創建 API 管理器實例
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.warehouseApp) {
            window.warehouseApp.api = new APIManager(window.warehouseApp);
            
            // 替換主應用程式的 apiCall 方法
            window.warehouseApp.apiCall = (action, data, endpoint) => {
                return window.warehouseApp.api.call(action, data, endpoint);
            };
        }
    }, 1000);
});
