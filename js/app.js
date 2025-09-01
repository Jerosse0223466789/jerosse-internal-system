/**
 * 倉庫助手 - 主要應用程式邏輯
 * 整合您現有的 Google Apps Script 倉庫管理系統
 */

class WarehouseApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.isOnline = navigator.onLine;
        this.offlineData = [];
        this.settings = this.loadSettings();
        
        // Google Apps Script URL - 請替換為您的實際URL
        this.apiBaseUrl = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkOnlineStatus();
        this.loadInitialData();
        this.startApp();
    }

    setupEventListeners() {
        // 導航事件
        document.addEventListener('DOMContentLoaded', () => {
            // 側邊選單
            document.getElementById('menuBtn').addEventListener('click', () => {
                this.toggleSidebar();
            });

            // 同步按鈕
            document.getElementById('syncBtn').addEventListener('click', () => {
                this.syncData();
            });

            // 底部導航
            document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    const page = e.currentTarget.dataset.page;
                    this.navigateTo(page);
                });
            });

            // 側邊選單導航
            document.querySelectorAll('.sidebar-menu a').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = e.currentTarget.dataset.page;
                    this.navigateTo(page);
                    this.closeSidebar();
                });
            });

            // 快捷操作
            document.querySelectorAll('.action-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.currentTarget.dataset.action;
                    this.handleQuickAction(action);
                });
            });

            // 表單事件
            this.setupFormEvents();

            // 模態對話框
            this.setupModalEvents();
        });

        // 網路狀態監聽
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.updateOnlineStatus();
            this.syncOfflineData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateOnlineStatus();
        });

        // 點擊背景關閉側邊選單
        document.addEventListener('click', (e) => {
            const sidebar = document.getElementById('sidebar');
            const menuBtn = document.getElementById('menuBtn');
            
            if (sidebar.classList.contains('open') && 
                !sidebar.contains(e.target) && 
                !menuBtn.contains(e.target)) {
                this.closeSidebar();
            }
        });
    }

    setupFormEvents() {
        // 盤點表單
        const inventoryForm = document.getElementById('inventoryPage');
        if (inventoryForm) {
            // 區域選擇事件
            document.getElementById('areaSelect').addEventListener('change', (e) => {
                this.loadCategories(e.target.value);
            });

            // 分類選擇事件
            document.getElementById('categorySelect').addEventListener('change', (e) => {
                this.loadItems(e.target.value);
            });

            // 數量調整按鈕
            document.querySelectorAll('.qty-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.currentTarget.dataset.action;
                    const input = document.getElementById('quantityInput');
                    let value = parseInt(input.value) || 0;
                    
                    if (action === 'increase') {
                        value++;
                    } else if (action === 'decrease' && value > 0) {
                        value--;
                    }
                    
                    input.value = value;
                    this.vibrate();
                });
            });

            // 提交盤點
            document.getElementById('submitInventoryBtn').addEventListener('click', () => {
                this.submitInventory();
            });

            // 離線儲存
            document.getElementById('saveOfflineBtn').addEventListener('click', () => {
                this.saveOfflineInventory();
            });
        }

        // 轉移表單
        const transferForm = document.getElementById('transferPage');
        if (transferForm) {
            document.getElementById('submitTransferBtn').addEventListener('click', () => {
                this.submitTransfer();
            });
        }

        // 語音輸入按鈕
        document.querySelectorAll('.voice-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;
                this.startVoiceInput(target);
            });
        });

        // 掃描按鈕
        document.querySelectorAll('.scan-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;
                this.startScanForInput(target);
            });
        });
    }

    setupModalEvents() {
        const modal = document.getElementById('modal');
        const modalClose = document.getElementById('modalClose');

        modalClose.addEventListener('click', () => {
            this.hideModal();
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal();
            }
        });
    }

    startApp() {
        // 隱藏載入畫面
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('app').classList.remove('hidden');
            
            // 檢查URL參數是否有快捷啟動
            const urlParams = new URLSearchParams(window.location.search);
            const shortcut = urlParams.get('shortcut');
            
            if (shortcut) {
                this.navigateTo(shortcut);
            }
        }, 2000);
    }

    navigateTo(page) {
        // 隱藏所有頁面
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });

        // 顯示目標頁面
        const targetPage = document.getElementById(page + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = page;
            
            // 更新標題
            this.updatePageTitle(page);
            
            // 更新底部導航狀態
            this.updateBottomNav(page);
            
            // 頁面特定初始化
            this.initializePage(page);
        }
    }

    updatePageTitle(page) {
        const titles = {
            dashboard: '倉庫助手',
            inventory: '快速盤點',
            barcode: '條碼掃描',
            batch: '批號管理',
            transfer: '庫存轉移',
            floorplan: '平面圖',
            offline: '離線作業',
            settings: '設定'
        };
        
        document.getElementById('headerTitle').textContent = titles[page] || '倉庫助手';
    }

    updateBottomNav(page) {
        document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === page) {
                item.classList.add('active');
            }
        });
    }

    initializePage(page) {
        switch (page) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'inventory':
                this.loadInventoryData();
                break;
            case 'barcode':
                this.initializeScanner();
                break;
            case 'batch':
                this.loadBatchData();
                break;
            case 'transfer':
                this.loadTransferData();
                break;
            default:
                break;
        }
    }

    async loadDashboardData() {
        try {
            // 載入今日統計
            const stats = await this.apiCall('getTodayStats');
            
            document.getElementById('todayCount').textContent = stats.inventoryCount || 0;
            document.getElementById('todayTransfer').textContent = stats.transferCount || 0;
            document.getElementById('todayBatch').textContent = stats.batchCount || 0;
            
            // 載入警示
            this.loadAlerts();
            
        } catch (error) {
            console.error('載入儀表板資料失敗:', error);
            this.showOfflineMessage();
        }
    }

    async loadInventoryData() {
        try {
            // 載入區域、分類、品項資料
            const areas = ['1F', '2F', '3F'];
            const areaSelect = document.getElementById('areaSelect');
            
            areaSelect.innerHTML = '<option value="">選擇區域</option>';
            areas.forEach(area => {
                const option = document.createElement('option');
                option.value = area;
                option.textContent = area;
                areaSelect.appendChild(option);
            });

            // 載入人員清單
            const people = await this.apiCall('getPeople');
            const personSelect = document.getElementById('personSelect');
            
            personSelect.innerHTML = '<option value="">選擇人員</option>';
            people.forEach(person => {
                const option = document.createElement('option');
                option.value = person;
                option.textContent = person;
                personSelect.appendChild(option);
            });

            // 載入今日盤點記錄
            this.loadTodayInventoryRecords();
            
        } catch (error) {
            console.error('載入盤點資料失敗:', error);
            this.loadOfflineInventoryData();
        }
    }

    async loadCategories(area) {
        if (!area) return;
        
        try {
            const categories = await this.apiCall('getCategories', { area });
            const categorySelect = document.getElementById('categorySelect');
            
            categorySelect.innerHTML = '<option value="">選擇分類</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
            
            // 清空品項選單
            document.getElementById('itemSelect').innerHTML = '<option value="">選擇品項</option>';
            
        } catch (error) {
            console.error('載入分類失敗:', error);
        }
    }

    async loadItems(category) {
        if (!category) return;
        
        try {
            const items = await this.apiCall('getItems', { category });
            const itemSelect = document.getElementById('itemSelect');
            
            itemSelect.innerHTML = '<option value="">選擇品項</option>';
            items.forEach(item => {
                const option = document.createElement('option');
                option.value = item.name;
                option.textContent = item.name;
                itemSelect.appendChild(option);
            });
            
        } catch (error) {
            console.error('載入品項失敗:', error);
        }
    }

    async submitInventory() {
        const area = document.getElementById('areaSelect').value;
        const category = document.getElementById('categorySelect').value;
        const item = document.getElementById('itemSelect').value;
        const quantity = document.getElementById('quantityInput').value;
        const person = document.getElementById('personSelect').value;

        // 驗證必填欄位
        if (!area || !category || !item || !person) {
            this.showMessage('請填寫所有必填欄位', 'error');
            return;
        }

        const inventoryData = {
            area,
            category,
            item,
            quantity: parseInt(quantity) || 0,
            person,
            timestamp: new Date().toISOString()
        };

        try {
            if (this.isOnline) {
                await this.apiCall('submitInventory', inventoryData);
                this.showMessage('盤點資料已提交', 'success');
                this.clearInventoryForm();
                this.loadTodayInventoryRecords();
            } else {
                this.saveOfflineInventory(inventoryData);
            }
        } catch (error) {
            console.error('提交盤點失敗:', error);
            this.showMessage('提交失敗，已儲存到離線資料', 'warning');
            this.saveOfflineInventory(inventoryData);
        }
    }

    saveOfflineInventory(data = null) {
        if (!data) {
            const area = document.getElementById('areaSelect').value;
            const category = document.getElementById('categorySelect').value;
            const item = document.getElementById('itemSelect').value;
            const quantity = document.getElementById('quantityInput').value;
            const person = document.getElementById('personSelect').value;

            if (!area || !category || !item || !person) {
                this.showMessage('請填寫所有必填欄位', 'error');
                return;
            }

            data = {
                area,
                category,
                item,
                quantity: parseInt(quantity) || 0,
                person,
                timestamp: new Date().toISOString()
            };
        }

        // 儲存到本地儲存
        const offlineInventory = JSON.parse(localStorage.getItem('offlineInventory') || '[]');
        offlineInventory.push({ ...data, type: 'inventory', id: Date.now() });
        localStorage.setItem('offlineInventory', JSON.stringify(offlineInventory));

        this.showMessage('已儲存到離線資料', 'success');
        this.clearInventoryForm();
        this.updateOfflineCount();
    }

    clearInventoryForm() {
        document.getElementById('areaSelect').value = '';
        document.getElementById('categorySelect').innerHTML = '<option value="">選擇分類</option>';
        document.getElementById('itemSelect').innerHTML = '<option value="">選擇品項</option>';
        document.getElementById('quantityInput').value = '0';
        document.getElementById('personSelect').value = '';
    }

    async loadTodayInventoryRecords() {
        try {
            const records = await this.apiCall('getTodayInventoryRecords');
            const recordsList = document.getElementById('inventoryRecords');
            
            recordsList.innerHTML = '';
            
            if (records.length === 0) {
                recordsList.innerHTML = '<p class="no-records">今日尚無盤點記錄</p>';
                return;
            }

            records.forEach(record => {
                const recordElement = document.createElement('div');
                recordElement.className = 'record-item';
                recordElement.innerHTML = `
                    <div class="record-info">
                        <strong>${record.item}</strong> - ${record.quantity} 個
                        <div class="record-details">
                            ${record.area} > ${record.category} | ${record.person}
                        </div>
                        <div class="record-time">${this.formatTime(record.timestamp)}</div>
                    </div>
                `;
                recordsList.appendChild(recordElement);
            });
            
        } catch (error) {
            console.error('載入盤點記錄失敗:', error);
        }
    }

    async syncOfflineData() {
        const offlineData = JSON.parse(localStorage.getItem('offlineInventory') || '[]');
        
        if (offlineData.length === 0) return;

        let successCount = 0;
        const failedData = [];

        for (const item of offlineData) {
            try {
                await this.apiCall('submitInventory', item);
                successCount++;
            } catch (error) {
                console.error('同步失敗:', error);
                failedData.push(item);
            }
        }

        // 更新本地儲存，只保留同步失敗的資料
        localStorage.setItem('offlineInventory', JSON.stringify(failedData));

        if (successCount > 0) {
            this.showMessage(`已同步 ${successCount} 筆離線資料`, 'success');
        }

        this.updateOfflineCount();
    }

    handleQuickAction(action) {
        switch (action) {
            case 'quick-scan':
                this.navigateTo('barcode');
                setTimeout(() => this.startScanner(), 500);
                break;
            case 'voice-input':
                this.navigateTo('inventory');
                setTimeout(() => this.startVoiceInput('quantityInput'), 500);
                break;
            case 'quick-count':
                this.navigateTo('inventory');
                break;
            case 'location-find':
                this.navigateTo('floorplan');
                break;
        }
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('open');
    }

    closeSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('open');
    }

    checkOnlineStatus() {
        this.updateOnlineStatus();
    }

    updateOnlineStatus() {
        const syncBtn = document.getElementById('syncBtn');
        
        if (this.isOnline) {
            syncBtn.style.color = 'white';
            syncBtn.title = '線上模式';
        } else {
            syncBtn.style.color = '#FF9800';
            syncBtn.title = '離線模式';
        }
    }

    async syncData() {
        if (!this.isOnline) {
            this.showMessage('目前離線，無法同步', 'warning');
            return;
        }

        this.showMessage('正在同步...', 'info');
        
        try {
            await this.syncOfflineData();
            await this.loadDashboardData();
            this.showMessage('同步完成', 'success');
        } catch (error) {
            console.error('同步失敗:', error);
            this.showMessage('同步失敗', 'error');
        }
    }

    // API 調用
    async apiCall(endpoint, data = null) {
        const url = this.apiBaseUrl;
        const payload = {
            action: endpoint,
            data: data
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API 調用失敗: ${response.status}`);
        }

        return await response.json();
    }

    // 工具方法
    showMessage(message, type = 'info') {
        // 創建訊息元素
        const messageEl = document.createElement('div');
        messageEl.className = `message message-${type}`;
        messageEl.textContent = message;
        
        // 添加樣式
        Object.assign(messageEl.style, {
            position: 'fixed',
            top: '70px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: this.getMessageColor(type),
            color: 'white',
            padding: '12px 24px',
            borderRadius: '24px',
            zIndex: '2000',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'all 0.3s ease'
        });

        document.body.appendChild(messageEl);

        // 動畫進入
        setTimeout(() => {
            messageEl.style.opacity = '1';
            messageEl.style.transform = 'translateX(-50%) translateY(0)';
        }, 100);

        // 自動移除
        setTimeout(() => {
            messageEl.style.opacity = '0';
            messageEl.style.transform = 'translateX(-50%) translateY(-20px)';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.parentNode.removeChild(messageEl);
                }
            }, 300);
        }, 3000);

        // 振動回饋
        this.vibrate();
    }

    getMessageColor(type) {
        const colors = {
            success: '#4CAF50',
            error: '#F44336',
            warning: '#FF9800',
            info: '#2196F3'
        };
        return colors[type] || colors.info;
    }

    vibrate(pattern = [100]) {
        if (navigator.vibrate && this.settings.vibration) {
            navigator.vibrate(pattern);
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    updateOfflineCount() {
        const offlineData = JSON.parse(localStorage.getItem('offlineInventory') || '[]');
        const countEl = document.getElementById('offlineCount');
        if (countEl) {
            countEl.textContent = offlineData.length;
        }
    }

    loadSettings() {
        const defaultSettings = {
            autoSync: true,
            voiceNotification: true,
            vibration: true
        };
        
        const savedSettings = localStorage.getItem('warehouseAppSettings');
        return savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
    }

    saveSettings() {
        localStorage.setItem('warehouseAppSettings', JSON.stringify(this.settings));
    }

    showModal(title, content, buttons = []) {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');

        modalTitle.textContent = title;
        modalBody.innerHTML = content;
        
        modalFooter.innerHTML = '';
        buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.className = `btn ${button.class || 'btn-secondary'}`;
            btn.textContent = button.text;
            btn.addEventListener('click', button.onClick);
            modalFooter.appendChild(btn);
        });

        modal.classList.add('show');
    }

    hideModal() {
        const modal = document.getElementById('modal');
        modal.classList.remove('show');
    }

    showOfflineMessage() {
        this.showMessage('目前離線，顯示本地資料', 'warning');
    }

    loadOfflineInventoryData() {
        // 載入離線時的預設資料
        const defaultAreas = ['1F', '2F', '3F'];
        const areaSelect = document.getElementById('areaSelect');
        
        areaSelect.innerHTML = '<option value="">選擇區域</option>';
        defaultAreas.forEach(area => {
            const option = document.createElement('option');
            option.value = area;
            option.textContent = area;
            areaSelect.appendChild(option);
        });

        this.showOfflineMessage();
    }

    async loadInitialData() {
        // 初始化時載入必要資料
        this.updateOfflineCount();
    }

    async loadAlerts() {
        try {
            const alerts = await this.apiCall('getAlerts');
            const alertList = document.getElementById('alertList');
            
            alertList.innerHTML = '';
            
            if (alerts.length === 0) {
                alertList.innerHTML = '<p class="no-alerts">目前沒有警示</p>';
                return;
            }

            alerts.forEach(alert => {
                const alertElement = document.createElement('div');
                alertElement.className = `alert alert-${alert.type}`;
                alertElement.innerHTML = `
                    <div class="alert-content">
                        <span class="material-icons">${this.getAlertIcon(alert.type)}</span>
                        <div class="alert-text">
                            <div class="alert-title">${alert.title}</div>
                            <div class="alert-message">${alert.message}</div>
                        </div>
                    </div>
                `;
                alertList.appendChild(alertElement);
            });
            
        } catch (error) {
            console.error('載入警示失敗:', error);
        }
    }

    getAlertIcon(type) {
        const icons = {
            warning: 'warning',
            error: 'error',
            info: 'info',
            success: 'check_circle'
        };
        return icons[type] || 'info';
    }
}

// 初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
    window.warehouseApp = new WarehouseApp();
});
