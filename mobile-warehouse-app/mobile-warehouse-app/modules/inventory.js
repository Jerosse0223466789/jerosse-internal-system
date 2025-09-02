/**
 * 庫存管理模組
 * 提供庫存盤點、查詢、調整等功能
 */

class InventoryManager {
    constructor() {
        this.items = [];
        this.categories = [];
        this.locations = [];
        this.currentSession = null;
        this.init();
    }

    async init() {
        console.log('📦 庫存管理模組初始化中...');
        await this.loadData();
        this.setupEventListeners();
        console.log('✅ 庫存管理模組初始化完成');
    }

    async loadData() {
        // 載入庫存資料
        try {
            const savedItems = localStorage.getItem('inventory-items');
            if (savedItems) {
                this.items = JSON.parse(savedItems);
            }

            const savedCategories = localStorage.getItem('inventory-categories');
            if (savedCategories) {
                this.categories = JSON.parse(savedCategories);
            } else {
                // 預設分類
                this.categories = [
                    { id: 'food', name: '食品類', icon: '🍎' },
                    { id: 'medicine', name: '藥品類', icon: '💊' },
                    { id: 'cosmetic', name: '美妝類', icon: '💄' },
                    { id: 'supplement', name: '保健品', icon: '💚' },
                    { id: 'others', name: '其他類', icon: '📦' }
                ];
                this.saveCategories();
            }

            const savedLocations = localStorage.getItem('inventory-locations');
            if (savedLocations) {
                this.locations = JSON.parse(savedLocations);
            } else {
                // 預設倉庫位置
                this.locations = [
                    { id: '1F-A', name: '一樓A區', zone: '1F' },
                    { id: '1F-B', name: '一樓B區', zone: '1F' },
                    { id: '2F-A', name: '二樓A區', zone: '2F' },
                    { id: '2F-B', name: '二樓B區', zone: '2F' },
                    { id: 'COLD', name: '冷藏區', zone: 'SPECIAL' },
                    { id: 'TEMP', name: '暫存區', zone: 'SPECIAL' }
                ];
                this.saveLocations();
            }
        } catch (error) {
            console.error('載入庫存資料失敗:', error);
        }
    }

    setupEventListeners() {
        // 設定事件監聽器
        document.addEventListener('inventory-scan-result', (event) => {
            this.handleScanResult(event.detail);
        });
    }

    // 開始新的盤點作業
    startInventorySession(sessionData) {
        const session = {
            id: `session_${Date.now()}`,
            startTime: new Date().toISOString(),
            operator: sessionData.operator || 'Unknown',
            location: sessionData.location,
            type: sessionData.type || 'routine', // routine, spot, full
            items: [],
            status: 'active'
        };

        this.currentSession = session;
        this.saveSession();
        
        return session;
    }

    // 添加盤點項目
    addInventoryItem(itemData) {
        if (!this.currentSession) {
            throw new Error('請先開始盤點作業');
        }

        const item = {
            id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            barcode: itemData.barcode || '',
            name: itemData.name || '',
            category: itemData.category || '',
            location: itemData.location || '',
            expectedQty: itemData.expectedQty || 0,
            actualQty: itemData.actualQty || 0,
            unit: itemData.unit || 'pcs',
            batchNumber: itemData.batchNumber || '',
            expiryDate: itemData.expiryDate || '',
            notes: itemData.notes || '',
            timestamp: new Date().toISOString(),
            operator: this.currentSession.operator,
            status: this.getItemStatus(itemData.expectedQty, itemData.actualQty)
        };

        this.currentSession.items.push(item);
        this.saveSession();

        // 更新統計
        this.updateSessionStats();

        return item;
    }

    // 獲取項目狀態
    getItemStatus(expected, actual) {
        if (expected === actual) return 'normal';
        if (actual > expected) return 'excess';
        if (actual < expected) return 'shortage';
        return 'unknown';
    }

    // 更新盤點項目
    updateInventoryItem(itemId, updateData) {
        if (!this.currentSession) return false;

        const itemIndex = this.currentSession.items.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return false;

        const item = this.currentSession.items[itemIndex];
        Object.assign(item, updateData);
        item.status = this.getItemStatus(item.expectedQty, item.actualQty);
        item.lastModified = new Date().toISOString();

        this.saveSession();
        this.updateSessionStats();

        return item;
    }

    // 完成盤點作業
    completeInventorySession(summary) {
        if (!this.currentSession) {
            throw new Error('沒有進行中的盤點作業');
        }

        this.currentSession.endTime = new Date().toISOString();
        this.currentSession.status = 'completed';
        this.currentSession.summary = {
            totalItems: this.currentSession.items.length,
            normalItems: this.currentSession.items.filter(item => item.status === 'normal').length,
            excessItems: this.currentSession.items.filter(item => item.status === 'excess').length,
            shortageItems: this.currentSession.items.filter(item => item.status === 'shortage').length,
            notes: summary.notes || '',
            completedBy: summary.completedBy || this.currentSession.operator
        };

        // 儲存完成的作業
        this.saveCompletedSession();
        
        // 清除當前作業
        const completedSession = { ...this.currentSession };
        this.currentSession = null;
        localStorage.removeItem('current-inventory-session');

        return completedSession;
    }

    // 搜尋庫存項目
    searchItems(query, filters = {}) {
        let results = [...this.items];

        // 文字搜尋
        if (query) {
            const searchTerm = query.toLowerCase();
            results = results.filter(item => 
                item.name.toLowerCase().includes(searchTerm) ||
                item.barcode.includes(searchTerm) ||
                item.batchNumber.toLowerCase().includes(searchTerm)
            );
        }

        // 分類篩選
        if (filters.category) {
            results = results.filter(item => item.category === filters.category);
        }

        // 位置篩選
        if (filters.location) {
            results = results.filter(item => item.location === filters.location);
        }

        // 狀態篩選
        if (filters.status) {
            results = results.filter(item => item.status === filters.status);
        }

        // 排序
        if (filters.sortBy) {
            results.sort((a, b) => {
                switch (filters.sortBy) {
                    case 'name':
                        return a.name.localeCompare(b.name);
                    case 'quantity':
                        return b.actualQty - a.actualQty;
                    case 'date':
                        return new Date(b.timestamp) - new Date(a.timestamp);
                    default:
                        return 0;
                }
            });
        }

        return results;
    }

    // 獲取庫存統計
    getInventoryStats() {
        const stats = {
            totalItems: this.items.length,
            totalValue: this.items.reduce((sum, item) => sum + (item.actualQty * (item.unitPrice || 0)), 0),
            lowStockItems: this.items.filter(item => item.actualQty < (item.minStock || 0)).length,
            expiringSoonItems: this.getExpiringSoonItems().length,
            categories: {}
        };

        // 按分類統計
        this.categories.forEach(category => {
            const categoryItems = this.items.filter(item => item.category === category.id);
            stats.categories[category.id] = {
                name: category.name,
                itemCount: categoryItems.length,
                totalQuantity: categoryItems.reduce((sum, item) => sum + item.actualQty, 0)
            };
        });

        return stats;
    }

    // 獲取即將過期的項目
    getExpiringSoonItems(days = 30) {
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + days);

        return this.items.filter(item => {
            if (!item.expiryDate) return false;
            const expiryDate = new Date(item.expiryDate);
            return expiryDate <= thresholdDate && expiryDate > new Date();
        });
    }

    // 處理掃描結果
    handleScanResult(scanData) {
        console.log('處理掃描結果:', scanData);
        
        // 根據掃描的條碼查找商品
        const existingItem = this.items.find(item => item.barcode === scanData.barcode);
        
        if (existingItem) {
            // 如果有進行中的盤點作業，自動填入資料
            if (this.currentSession) {
                this.addInventoryItem({
                    barcode: scanData.barcode,
                    name: existingItem.name,
                    category: existingItem.category,
                    expectedQty: existingItem.actualQty,
                    actualQty: 1 // 預設掃描到就是1個
                });
            }
            
            return existingItem;
        } else {
            // 新商品，需要手動輸入資料
            return null;
        }
    }

    // 更新作業統計
    updateSessionStats() {
        if (!this.currentSession) return;

        const stats = {
            totalItems: this.currentSession.items.length,
            normalItems: this.currentSession.items.filter(item => item.status === 'normal').length,
            excessItems: this.currentSession.items.filter(item => item.status === 'excess').length,
            shortageItems: this.currentSession.items.filter(item => item.status === 'shortage').length
        };

        // 發送統計更新事件
        document.dispatchEvent(new CustomEvent('inventory-stats-updated', {
            detail: stats
        }));
    }

    // 儲存方法
    saveSession() {
        if (this.currentSession) {
            localStorage.setItem('current-inventory-session', JSON.stringify(this.currentSession));
        }
    }

    saveCompletedSession() {
        if (!this.currentSession) return;

        const completedSessions = JSON.parse(localStorage.getItem('completed-inventory-sessions') || '[]');
        completedSessions.push(this.currentSession);
        
        // 只保留最近100個作業記錄
        if (completedSessions.length > 100) {
            completedSessions.splice(0, completedSessions.length - 100);
        }
        
        localStorage.setItem('completed-inventory-sessions', JSON.stringify(completedSessions));
    }

    saveItems() {
        localStorage.setItem('inventory-items', JSON.stringify(this.items));
    }

    saveCategories() {
        localStorage.setItem('inventory-categories', JSON.stringify(this.categories));
    }

    saveLocations() {
        localStorage.setItem('inventory-locations', JSON.stringify(this.locations));
    }

    // 匯出資料
    exportData(format = 'json') {
        const data = {
            items: this.items,
            categories: this.categories,
            locations: this.locations,
            sessions: JSON.parse(localStorage.getItem('completed-inventory-sessions') || '[]'),
            exportTime: new Date().toISOString(),
            version: '1.0'
        };

        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertToCSV(data.items);
            default:
                throw new Error('不支援的匯出格式');
        }
    }

    convertToCSV(items) {
        if (items.length === 0) return '';

        const headers = ['條碼', '名稱', '分類', '位置', '數量', '單位', '批號', '有效期', '備註', '最後更新'];
        const csvData = items.map(item => [
            item.barcode || '',
            item.name || '',
            item.category || '',
            item.location || '',
            item.actualQty || 0,
            item.unit || '',
            item.batchNumber || '',
            item.expiryDate || '',
            item.notes || '',
            item.timestamp || ''
        ]);

        return [headers, ...csvData]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
    }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = InventoryManager;
} else if (typeof window !== 'undefined') {
    window.InventoryManager = InventoryManager;
}
