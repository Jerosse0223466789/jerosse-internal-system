/**
 * 認證管理模組
 * 處理用戶登入、登出、權限驗證等功能
 */

class AuthManager {
    constructor(config = {}) {
        this.config = config;
        this.currentUser = null;
        this.isAuthenticated = false;
        this.sessionTimer = null;
        this.loginAttempts = 0;
        this.lockoutUntil = null;
        
        // 事件監聽器
        this.eventListeners = new Map();
        
        this.init();
    }

    async init() {
        console.log('🔐 認證管理器初始化中...');
        
        // 檢查是否有保存的會話
        await this.checkSavedSession();
        
        // 設定會話監控
        this.setupSessionMonitoring();
        
        // 顯示適當的界面
        this.updateUI();
        
        console.log('✅ 認證管理器初始化完成');
    }

    // 檢查保存的會話
    async checkSavedSession() {
        try {
            const savedSession = localStorage.getItem(this.config.storage.keys.userSession);
            if (savedSession) {
                const sessionData = JSON.parse(savedSession);
                
                // 檢查會話是否過期
                const now = Date.now();
                if (sessionData.expiresAt && sessionData.expiresAt > now) {
                    // 恢復用戶會話
                    this.currentUser = sessionData.user;
                    this.isAuthenticated = true;
                    
                    // 更新過期時間
                    this.updateSessionExpiry();
                    
                    console.log('✅ 用戶會話已恢復:', this.currentUser.name);
                    this.dispatchEvent('session-restored', this.currentUser);
                } else {
                    // 清除過期會話
                    this.clearSession();
                }
            }
        } catch (error) {
            console.error('檢查保存的會話失敗:', error);
            this.clearSession();
        }
    }

    // 登入驗證
    async login(username, password) {
        try {
            // 檢查是否被鎖定
            if (this.isLockedOut()) {
                const remainingTime = Math.ceil((this.lockoutUntil - Date.now()) / 1000 / 60);
                throw new Error(`帳號已被鎖定，請等待 ${remainingTime} 分鐘後再試`);
            }

            console.log('🔑 嘗試登入:', username);

            // 驗證憑據
            const user = await this.validateCredentials(username, password);
            
            if (user) {
                // 登入成功
                this.currentUser = user;
                this.isAuthenticated = true;
                this.loginAttempts = 0;
                this.lockoutUntil = null;

                // 保存會話
                this.saveSession();

                // 設定會話定時器
                this.setupSessionTimer();

                // 記錄登入
                this.logUserActivity('login', { username });

                console.log('✅ 登入成功:', user.name);
                this.dispatchEvent('login-success', user);

                // 更新UI
                this.updateUI();

                return { success: true, user };
            } else {
                // 登入失敗
                this.loginAttempts++;
                
                // 檢查是否需要鎖定
                if (this.loginAttempts >= this.config.security.maxLoginAttempts) {
                    this.lockoutUntil = Date.now() + this.config.security.lockoutDuration;
                    this.logUserActivity('lockout', { username, attempts: this.loginAttempts });
                }

                this.logUserActivity('login-failed', { username, attempts: this.loginAttempts });
                
                const remainingAttempts = this.config.security.maxLoginAttempts - this.loginAttempts;
                throw new Error(`登入失敗，還有 ${remainingAttempts} 次嘗試機會`);
            }

        } catch (error) {
            console.error('登入錯誤:', error);
            this.dispatchEvent('login-failed', { error: error.message });
            throw error;
        }
    }

    // 登出
    logout() {
        console.log('🚪 用戶登出:', this.currentUser?.name);

        // 記錄登出
        if (this.currentUser) {
            this.logUserActivity('logout', { username: this.currentUser.username });
        }

        // 清除會話
        this.clearSession();

        // 清除定時器
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }

        // 重置狀態
        this.currentUser = null;
        this.isAuthenticated = false;

        // 觸發事件
        this.dispatchEvent('logout', {});

        // 更新UI
        this.updateUI();
    }

    // 驗證憑據
    async validateCredentials(username, password) {
        // 如果啟用了外部API驗證
        if (this.config.api.endpoints.auth && !this.config.debug.mockData) {
            return await this.validateWithAPI(username, password);
        }

        // 使用本地驗證（開發或demo模式）
        return this.validateLocal(username, password);
    }

    // API驗證
    async validateWithAPI(username, password) {
        try {
            const response = await fetch(this.config.api.endpoints.auth, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'authenticate',
                    data: { username, password }
                }),
                timeout: this.config.api.timeout
            });

            const result = await response.json();
            
            if (result.success && result.data.user) {
                return this.enrichUserData(result.data.user);
            }

            return null;

        } catch (error) {
            console.error('API驗證失敗:', error);
            // 如果API失敗，嘗試本地驗證
            return this.validateLocal(username, password);
        }
    }

    // 本地驗證
    validateLocal(username, password) {
        const users = this.config.defaultUsers || [];
        const user = users.find(u => u.username === username && u.password === password && u.status === 'active');
        
        if (user) {
            return this.enrichUserData(user);
        }

        return null;
    }

    // 豐富用戶數據
    enrichUserData(user) {
        const permission = this.config.permissions[user.role] || this.config.permissions.employee;
        
        return {
            ...user,
            loginTime: new Date().toISOString(),
            permission: permission,
            sessionId: this.generateSessionId()
        };
    }

    // 權限檢查
    hasPermission(requiredPermission, category = null) {
        if (!this.isAuthenticated || !this.currentUser) {
            return false;
        }

        const userPermission = this.currentUser.permission;
        
        // 檢查基本權限等級
        if (userPermission.level < this.getPermissionLevel(requiredPermission)) {
            return false;
        }

        // 檢查特定類別權限
        if (category) {
            const categoryConfig = this.config.categories[category];
            if (categoryConfig && categoryConfig.permission) {
                return this.hasPermission(categoryConfig.permission);
            }
        }

        return true;
    }

    // 檢查查看權限
    canView(documentOrCategory) {
        if (!this.isAuthenticated) {
            return false;
        }

        const permission = documentOrCategory.permission || 'public';
        return this.hasPermission(permission);
    }

    // 檢查編輯權限
    canEdit(documentOrCategory) {
        if (!this.isAuthenticated) {
            return false;
        }

        const userPermission = this.currentUser.permission;
        const permission = documentOrCategory.permission || 'public';
        
        return userPermission.canEdit.includes(permission) || userPermission.level >= 3;
    }

    // 檢查管理權限
    canManage(resource) {
        if (!this.isAuthenticated) {
            return false;
        }

        const userPermission = this.currentUser.permission;
        return userPermission.canManage.includes(resource) || userPermission.level >= 3;
    }

    // 獲取權限等級
    getPermissionLevel(permission) {
        const levels = {
            'public': 0,
            'internal': 1,
            'management': 2,
            'admin': 3
        };
        return levels[permission] || 0;
    }

    // 會話管理
    saveSession() {
        if (!this.currentUser) return;

        const sessionData = {
            user: this.currentUser,
            createdAt: Date.now(),
            expiresAt: Date.now() + this.config.storage.sessionTimeout
        };

        localStorage.setItem(
            this.config.storage.keys.userSession,
            JSON.stringify(sessionData)
        );
    }

    clearSession() {
        localStorage.removeItem(this.config.storage.keys.userSession);
        sessionStorage.clear();
    }

    updateSessionExpiry() {
        if (!this.isAuthenticated) return;

        const sessionData = JSON.parse(localStorage.getItem(this.config.storage.keys.userSession) || '{}');
        sessionData.expiresAt = Date.now() + this.config.storage.sessionTimeout;
        
        localStorage.setItem(
            this.config.storage.keys.userSession,
            JSON.stringify(sessionData)
        );
    }

    setupSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }

        this.sessionTimer = setTimeout(() => {
            console.log('⏰ 會話過期，自動登出');
            this.logout();
        }, this.config.storage.sessionTimeout);
    }

    setupSessionMonitoring() {
        // 監聽頁面活動，延長會話
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        let activityTimeout;

        const resetActivityTimer = () => {
            clearTimeout(activityTimeout);
            activityTimeout = setTimeout(() => {
                if (this.isAuthenticated) {
                    this.updateSessionExpiry();
                    this.setupSessionTimer();
                }
            }, 60000); // 1分鐘無活動後更新會話
        };

        activityEvents.forEach(eventName => {
            document.addEventListener(eventName, resetActivityTimer, true);
        });
    }

    // 鎖定檢查
    isLockedOut() {
        return this.lockoutUntil && Date.now() < this.lockoutUntil;
    }

    // UI更新
    updateUI() {
        const loginContainer = document.getElementById('loginContainer');
        const mainApp = document.getElementById('mainApp');
        const currentUserElement = document.getElementById('currentUser');
        const userRoleElement = document.getElementById('userRole');

        if (this.isAuthenticated && this.currentUser) {
            // 顯示主應用
            loginContainer.style.display = 'none';
            mainApp.classList.remove('hidden');
            
            // 更新用戶信息
            if (currentUserElement) {
                currentUserElement.textContent = this.currentUser.name;
            }
            if (userRoleElement) {
                userRoleElement.textContent = this.currentUser.permission.name;
            }
        } else {
            // 顯示登入表單
            loginContainer.style.display = 'block';
            mainApp.classList.add('hidden');
        }
    }

    // 活動記錄
    logUserActivity(action, data = {}) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action,
            user: this.currentUser?.username || 'anonymous',
            data,
            userAgent: navigator.userAgent,
            ip: 'N/A' // 在前端無法獲取真實IP
        };

        console.log('📝 用戶活動記錄:', logEntry);

        // 保存到本地（可選）
        try {
            const logs = JSON.parse(localStorage.getItem('user-activity-logs') || '[]');
            logs.push(logEntry);
            
            // 只保留最近100條記錄
            if (logs.length > 100) {
                logs.splice(0, logs.length - 100);
            }
            
            localStorage.setItem('user-activity-logs', JSON.stringify(logs));
        } catch (error) {
            console.error('保存活動記錄失敗:', error);
        }

        // 如果有API端點，也發送到服務器
        if (this.config.api.endpoints.analytics) {
            this.sendActivityLog(logEntry);
        }
    }

    // 發送活動記錄到服務器
    async sendActivityLog(logEntry) {
        try {
            await fetch(this.config.api.endpoints.analytics, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'logActivity',
                    data: logEntry
                })
            });
        } catch (error) {
            console.error('發送活動記錄失敗:', error);
        }
    }

    // 工具方法
    generateSessionId() {
        return 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return this.isAuthenticated;
    }

    getUserRole() {
        return this.currentUser?.role || 'guest';
    }

    getUserPermission() {
        return this.currentUser?.permission || this.config.permissions.guest;
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
        document.dispatchEvent(new CustomEvent(`auth-${eventName}`, {
            detail: data
        }));

        // 觸發內部監聽器
        if (this.eventListeners.has(eventName)) {
            this.eventListeners.get(eventName).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`認證事件監聽器錯誤 (${eventName}):`, error);
                }
            });
        }
    }

    // 銷毀
    destroy() {
        console.log('🔄 認證管理器銷毀中...');
        
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        
        this.eventListeners.clear();
        this.currentUser = null;
        this.isAuthenticated = false;
        
        console.log('✅ 認證管理器已銷毀');
    }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthManager;
} else if (typeof window !== 'undefined') {
    window.AuthManager = AuthManager;
}
