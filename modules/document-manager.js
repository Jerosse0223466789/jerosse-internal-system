/**
 * 文件管理模組
 * 處理文件展示、搜索、分類、收藏等功能
 */

class DocumentManager {
    constructor(config = {}, authManager = null) {
        this.config = config;
        this.authManager = authManager;
        this.documents = new Map();
        this.filteredDocuments = [];
        this.currentCategory = 'all';
        this.searchQuery = '';
        this.recentDocuments = [];
        this.favoriteDocuments = new Set();
        
        // 事件監聽器
        this.eventListeners = new Map();
        
        this.init();
    }

    async init() {
        console.log('📚 文件管理器初始化中...');
        
        // 載入文件數據
        await this.loadDocuments();
        
        // 載入用戶偏好
        this.loadUserPreferences();
        
        // 設定事件監聽
        this.setupEventListeners();
        
        // 顯示初始內容
        this.showAllDocuments();
        
        console.log('✅ 文件管理器初始化完成');
    }

    // 載入文件數據
    async loadDocuments() {
        try {
            // 如果有API端點，從服務器載入
            if (this.config.api.endpoints.documents && !this.config.debug.mockData) {
                await this.loadFromAPI();
            } else {
                // 使用配置中的預設文件
                this.loadDefaultDocuments();
            }
            
            console.log(`📄 已載入 ${this.documents.size} 個文件`);
            
        } catch (error) {
            console.error('載入文件失敗:', error);
            // 降級到預設文件
            this.loadDefaultDocuments();
        }
    }

    // 從API載入文件
    async loadFromAPI() {
        const response = await fetch(this.config.api.endpoints.documents, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getDocuments',
                data: {}
            })
        });

        const result = await response.json();
        
        if (result.success && result.data) {
            this.processDocuments(result.data);
        }
    }

    // 載入預設文件
    loadDefaultDocuments() {
        const defaultDocs = this.config.defaultDocuments || {};
        
        Object.values(defaultDocs).forEach(categoryDocs => {
            if (Array.isArray(categoryDocs)) {
                categoryDocs.forEach(doc => {
                    this.documents.set(doc.id, doc);
                });
            }
        });
    }

    // 處理文件數據
    processDocuments(documents) {
        this.documents.clear();
        
        if (Array.isArray(documents)) {
            documents.forEach(doc => {
                this.documents.set(doc.id, doc);
            });
        } else if (typeof documents === 'object') {
            Object.values(documents).forEach(categoryDocs => {
                if (Array.isArray(categoryDocs)) {
                    categoryDocs.forEach(doc => {
                        this.documents.set(doc.id, doc);
                    });
                }
            });
        }
    }

    // 載入用戶偏好
    loadUserPreferences() {
        try {
            // 載入最近瀏覽的文件
            const recent = localStorage.getItem(this.config.storage.keys.recentDocuments);
            if (recent) {
                this.recentDocuments = JSON.parse(recent);
            }

            // 載入收藏的文件
            const favorites = localStorage.getItem('favorite-documents');
            if (favorites) {
                this.favoriteDocuments = new Set(JSON.parse(favorites));
            }

        } catch (error) {
            console.error('載入用戶偏好失敗:', error);
        }
    }

    // 保存用戶偏好
    saveUserPreferences() {
        try {
            localStorage.setItem(
                this.config.storage.keys.recentDocuments,
                JSON.stringify(this.recentDocuments)
            );
            
            localStorage.setItem(
                'favorite-documents',
                JSON.stringify([...this.favoriteDocuments])
            );
        } catch (error) {
            console.error('保存用戶偏好失敗:', error);
        }
    }

    // 設定事件監聽
    setupEventListeners() {
        // 分類導航點擊
        document.addEventListener('click', (event) => {
            const navItem = event.target.closest('.nav-item');
            if (navItem) {
                const category = navItem.dataset.category;
                if (category) {
                    this.showCategory(category);
                }
            }
        });

        // 文件項目點擊
        document.addEventListener('click', (event) => {
            const docItem = event.target.closest('.doc-item');
            if (docItem) {
                const docId = docItem.dataset.docId;
                if (docId) {
                    this.openDocument(docId);
                }
            }
        });

        // 搜尋輸入
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (event) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.searchDocuments(event.target.value);
                }, this.config.ui.search.debounceDelay || 300);
            });
        }
    }

    // 顯示所有文件
    showAllDocuments() {
        this.currentCategory = 'all';
        this.filteredDocuments = this.getFilteredDocuments();
        this.updateUI();
        this.updateNavigation();
    }

    // 顯示特定分類
    showCategory(category) {
        this.currentCategory = category;
        this.filteredDocuments = this.getFilteredDocuments();
        this.updateUI();
        this.updateNavigation();
        
        // 更新標題
        this.updateContentTitle(category);
    }

    // 搜尋文件
    searchDocuments(query) {
        this.searchQuery = query.trim();
        this.filteredDocuments = this.getFilteredDocuments();
        this.updateUI();
        
        // 記錄搜尋
        if (this.searchQuery) {
            this.logActivity('search', { query: this.searchQuery, results: this.filteredDocuments.length });
        }
    }

    // 獲取過濾後的文件
    getFilteredDocuments() {
        let docs = Array.from(this.documents.values());
        
        // 權限過濾
        docs = docs.filter(doc => {
            if (this.authManager && this.authManager.canView) {
                return this.authManager.canView(doc);
            }
            return true; // 如果沒有認證管理器，顯示所有文件
        });
        
        // 分類過濾
        if (this.currentCategory !== 'all') {
            docs = docs.filter(doc => doc.category === this.currentCategory);
        }
        
        // 搜尋過濾
        if (this.searchQuery) {
            const query = this.searchQuery.toLowerCase();
            docs = docs.filter(doc => {
                return this.matchesSearch(doc, query);
            });
        }
        
        // 排序
        docs.sort((a, b) => {
            // 收藏的文件排前面
            const aFav = this.favoriteDocuments.has(a.id);
            const bFav = this.favoriteDocuments.has(b.id);
            if (aFav !== bFav) {
                return bFav ? 1 : -1;
            }
            
            // 按最後修改時間排序
            return new Date(b.lastModified) - new Date(a.lastModified);
        });
        
        return docs;
    }

    // 搜尋匹配
    matchesSearch(doc, query) {
        const searchFields = this.config.search.fields || ['title', 'description', 'tags'];
        
        return searchFields.some(field => {
            const value = doc[field];
            if (Array.isArray(value)) {
                return value.some(item => 
                    item.toLowerCase().includes(query)
                );
            } else if (typeof value === 'string') {
                return value.toLowerCase().includes(query);
            }
            return false;
        });
    }

    // 開啟文件
    async openDocument(docId) {
        const doc = this.documents.get(docId);
        if (!doc) {
            console.error('文件不存在:', docId);
            return;
        }

        // 權限檢查
        if (this.authManager && !this.authManager.canView(doc)) {
            this.showNotification('您沒有權限查看此文件', 'error');
            return;
        }

        try {
            // 記錄訪問
            this.addToRecentDocuments(doc);
            this.logActivity('view', { docId, title: doc.title });

            // 根據文件類型開啟
            await this.handleDocumentType(doc);

        } catch (error) {
            console.error('開啟文件失敗:', error);
            this.showNotification('開啟文件失敗: ' + error.message, 'error');
        }
    }

    // 處理不同文件類型
    async handleDocumentType(doc) {
        switch (doc.type) {
            case 'url':
                this.openUrl(doc.url);
                break;
            case 'pdf':
                this.openPdf(doc.url);
                break;
            case 'doc':
            case 'excel':
                this.openOfficeDoc(doc.url);
                break;
            case 'html':
                this.openHtml(doc.url);
                break;
            case 'system':
                this.openSystem(doc.url);
                break;
            default:
                this.openGeneric(doc.url);
        }
    }

    // 開啟網址
    openUrl(url) {
        window.open(url, '_blank');
    }

    // 開啟PDF
    openPdf(url) {
        // 在新標籤頁開啟PDF
        window.open(url, '_blank');
    }

    // 開啟Office文件
    openOfficeDoc(url) {
        // 使用Google Docs查看器或直接下載
        if (url.startsWith('http')) {
            window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(url)}`, '_blank');
        } else {
            window.open(url, '_blank');
        }
    }

    // 開啟HTML頁面
    openHtml(url) {
        window.open(url, '_blank');
    }

    // 開啟系統
    openSystem(url) {
        if (url.startsWith('gas://')) {
            // 處理Google Apps Script系統
            const systemName = url.replace('gas://', '');
            this.showNotification(`正在連接到 ${systemName}...`, 'info');
            // 這裡可以實現具體的系統連接邏輯
        } else {
            window.open(url, '_blank');
        }
    }

    // 開啟通用文件
    openGeneric(url) {
        window.open(url, '_blank');
    }

    // 添加到最近文件
    addToRecentDocuments(doc) {
        // 移除已存在的項目
        this.recentDocuments = this.recentDocuments.filter(item => item.id !== doc.id);
        
        // 添加到開頭
        this.recentDocuments.unshift({
            id: doc.id,
            title: doc.title,
            accessTime: new Date().toISOString()
        });
        
        // 限制數量
        this.recentDocuments = this.recentDocuments.slice(0, 20);
        
        // 保存
        this.saveUserPreferences();
    }

    // 切換收藏狀態
    toggleFavorite(docId) {
        if (this.favoriteDocuments.has(docId)) {
            this.favoriteDocuments.delete(docId);
            this.showNotification('已從收藏中移除', 'info');
        } else {
            this.favoriteDocuments.add(docId);
            this.showNotification('已添加到收藏', 'success');
        }
        
        this.saveUserPreferences();
        this.updateUI(); // 重新渲染以更新收藏狀態
    }

    // 更新UI
    updateUI() {
        const docGrid = document.getElementById('docGrid');
        const loadingIndicator = document.getElementById('loadingIndicator');
        
        if (!docGrid) return;

        // 顯示載入中
        if (loadingIndicator) {
            loadingIndicator.style.display = 'block';
        }

        // 清空現有內容
        docGrid.innerHTML = '';

        setTimeout(() => {
            // 生成文件卡片
            this.filteredDocuments.forEach(doc => {
                const docElement = this.createDocumentElement(doc);
                docGrid.appendChild(docElement);
            });

            // 如果沒有文件，顯示空狀態
            if (this.filteredDocuments.length === 0) {
                this.showEmptyState();
            }

            // 隱藏載入指示器
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none';
            }
        }, 100);
    }

    // 創建文件元素
    createDocumentElement(doc) {
        const docElement = document.createElement('div');
        docElement.className = 'doc-item';
        docElement.dataset.docId = doc.id;
        
        const typeConfig = this.config.documentTypes[doc.type] || this.config.documentTypes.url;
        const categoryConfig = this.config.categories[doc.category] || {};
        const isFavorite = this.favoriteDocuments.has(doc.id);
        
        docElement.innerHTML = `
            <div class="doc-header">
                <div class="doc-icon" style="background: ${categoryConfig.color || '#667eea'}">
                    ${typeConfig.icon || '📄'}
                </div>
                <div class="doc-info">
                    <h3>${this.escapeHtml(doc.title)}</h3>
                    <span class="doc-type">${typeConfig.name || '文件'}</span>
                </div>
                <div class="doc-actions">
                    <button class="btn-favorite ${isFavorite ? 'active' : ''}" 
                            onclick="event.stopPropagation(); window.docApp.documentManager.toggleFavorite('${doc.id}')"
                            title="${isFavorite ? '取消收藏' : '加入收藏'}">
                        ${isFavorite ? '⭐' : '☆'}
                    </button>
                </div>
            </div>
            <p class="doc-description">${this.escapeHtml(doc.description || '無描述')}</p>
            <div class="doc-meta">
                <span>📅 ${this.formatDate(doc.lastModified)}</span>
                <span class="doc-access">${this.getAccessLevelName(doc.permission)}</span>
            </div>
            ${doc.tags ? `<div class="doc-tags">${doc.tags.map(tag => `<span class="tag">${this.escapeHtml(tag)}</span>`).join('')}</div>` : ''}
        `;

        return docElement;
    }

    // 顯示空狀態
    showEmptyState() {
        const docGrid = document.getElementById('docGrid');
        if (!docGrid) return;

        const emptyMessage = this.searchQuery 
            ? `未找到包含 "${this.escapeHtml(this.searchQuery)}" 的文件`
            : '此分類下暫無文件';

        docGrid.innerHTML = `
            <div class="empty-state" style="
                grid-column: 1 / -1;
                text-align: center;
                padding: 60px 20px;
                color: #64748b;
            ">
                <div style="font-size: 4rem; margin-bottom: 20px;">📭</div>
                <h3 style="margin-bottom: 10px; color: #2c3e50;">${emptyMessage}</h3>
                <p>請嘗試其他搜尋條件或選擇不同的分類</p>
                ${this.searchQuery ? `<button class="btn btn-primary" onclick="document.getElementById('searchInput').value=''; window.docApp.documentManager.searchDocuments('')" style="margin-top: 20px;">清除搜尋</button>` : ''}
            </div>
        `;
    }

    // 更新導航
    updateNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.category === this.currentCategory) {
                item.classList.add('active');
            }
        });
    }

    // 更新內容標題
    updateContentTitle(category) {
        const contentIcon = document.getElementById('contentIcon');
        const contentTitle = document.getElementById('contentTitle');
        
        if (category === 'all') {
            if (contentIcon) contentIcon.textContent = '🏠';
            if (contentTitle) contentTitle.textContent = '所有文件';
        } else {
            const categoryConfig = this.config.categories[category];
            if (categoryConfig) {
                if (contentIcon) contentIcon.textContent = categoryConfig.icon;
                if (contentTitle) contentTitle.textContent = categoryConfig.name;
            }
        }
    }

    // 工具方法
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('zh-TW');
        } catch {
            return dateString;
        }
    }

    getAccessLevelName(permission) {
        const levels = {
            'public': '公開',
            'internal': '內部',
            'management': '主管',
            'admin': '管理員'
        };
        return levels[permission] || '公開';
    }

    // 活動記錄
    logActivity(action, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            user: this.authManager?.getCurrentUser()?.username || 'anonymous',
            data
        };

        console.log('📊 活動記錄:', logEntry);

        // 發送到分析端點
        if (this.config.api.endpoints.analytics) {
            this.sendAnalytics(logEntry);
        }
    }

    // 發送分析數據
    async sendAnalytics(data) {
        try {
            await fetch(this.config.api.endpoints.analytics, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'logActivity',
                    data
                })
            });
        } catch (error) {
            console.error('發送分析數據失敗:', error);
        }
    }

    // 通知
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(message);
        }
    }

    // 獲取統計信息
    getStats() {
        return {
            totalDocuments: this.documents.size,
            filteredDocuments: this.filteredDocuments.length,
            recentDocuments: this.recentDocuments.length,
            favoriteDocuments: this.favoriteDocuments.size,
            currentCategory: this.currentCategory,
            searchQuery: this.searchQuery
        };
    }

    // 匯出文件清單
    exportDocuments(format = 'json') {
        const docs = this.filteredDocuments.map(doc => ({
            id: doc.id,
            title: doc.title,
            description: doc.description,
            type: doc.type,
            category: doc.category,
            url: doc.url,
            tags: doc.tags,
            lastModified: doc.lastModified
        }));

        if (format === 'csv') {
            return this.convertToCSV(docs);
        }

        return JSON.stringify(docs, null, 2);
    }

    // 轉換為CSV
    convertToCSV(docs) {
        if (docs.length === 0) return '';

        const headers = Object.keys(docs[0]);
        const csvRows = [headers.join(',')];

        docs.forEach(doc => {
            const values = headers.map(header => {
                const value = doc[header];
                if (Array.isArray(value)) {
                    return `"${value.join('; ')}"`;
                }
                return `"${String(value).replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        });

        return csvRows.join('\n');
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
        document.dispatchEvent(new CustomEvent(`doc-${eventName}`, {
            detail: data
        }));

        // 觸發內部監聽器
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`文件管理事件監聽器錯誤 (${eventName}):`, error);
                }
            });
        }
    }

    // 銷毀
    destroy() {
        console.log('🔄 文件管理器銷毀中...');
        
        this.eventListeners.clear();
        this.documents.clear();
        this.filteredDocuments = [];
        
        console.log('✅ 文件管理器已銷毀');
    }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DocumentManager;
} else if (typeof window !== 'undefined') {
    window.DocumentManager = DocumentManager;
}
