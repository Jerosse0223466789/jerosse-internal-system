/**
 * 公司文件管理系統配置文件
 * 包含所有設定選項和常數定義
 */

const DocAppConfig = {
    // 應用程式基本資訊
    app: {
        name: '公司文件管理系統',
        version: '1.0.0',
        build: Date.now(),
        author: 'IT Team',
        description: '企業內部文件和網頁連結管理平台'
    },

    // API設定
    api: {
        timeout: 5000, // 縮短超時時間，快速檢測連線問題
        retryAttempts: 1, // 減少重試次數
        retryDelay: 1000, // 1秒
        endpoints: {
            auth: 'https://script.google.com/macros/s/AKfycbxbZTdvgXDTUVrtjIEY0D_lCScN9ODJnyUHyxJZ9NrhvbC1RYdt3F8gkQ8SAyPgxXU7/exec',
            documents: 'https://script.google.com/macros/s/AKfycbxbZTdvgXDTUVrtjIEY0D_lCScN9ODJnyUHyxJZ9NrhvbC1RYdt3F8gkQ8SAyPgxXU7/exec',
            users: 'https://script.google.com/macros/s/AKfycbxbZTdvgXDTUVrtjIEY0D_lCScN9ODJnyUHyxJZ9NrhvbC1RYdt3F8gkQ8SAyPgxXU7/exec',
            categories: 'https://script.google.com/macros/s/AKfycbxbZTdvgXDTUVrtjIEY0D_lCScN9ODJnyUHyxJZ9NrhvbC1RYdt3F8gkQ8SAyPgxXU7/exec',
            analytics: 'https://script.google.com/macros/s/AKfycbxbZTdvgXDTUVrtjIEY0D_lCScN9ODJnyUHyxJZ9NrhvbC1RYdt3F8gkQ8SAyPgxXU7/exec'
        }
    },

    // 權限等級定義
    permissions: {
        guest: {
            level: 0,
            name: '訪客',
            canView: ['public'],
            canEdit: [],
            canManage: []
        },
        employee: {
            level: 1,
            name: '一般員工',
            canView: ['public', 'internal'],
            canEdit: [],
            canManage: []
        },
        manager: {
            level: 2,
            name: '主管',
            canView: ['public', 'internal', 'management'],
            canEdit: ['internal'],
            canManage: []
        },
        admin: {
            level: 3,
            name: '系統管理員',
            canView: ['public', 'internal', 'management', 'admin'],
            canEdit: ['public', 'internal', 'management'],
            canManage: ['users', 'categories', 'system']
        }
    },

    // 文件分類設定
    categories: {
        sop: {
            id: 'sop',
            name: '作業程序',
            icon: '📋',
            color: '#22c55e',
            description: '標準作業流程文件',
            permission: 'internal'
        },
        forms: {
            id: 'forms',
            name: '表單文件',
            icon: '📝',
            color: '#3b82f6',
            description: '各類申請表單',
            permission: 'internal'
        },
        systems: {
            id: 'systems',
            name: '系統工具',
            icon: '💻',
            color: '#8b5cf6',
            description: '內部系統連結',
            permission: 'internal'
        },
        reports: {
            id: 'reports',
            name: '報表分析',
            icon: '📊',
            color: '#f59e0b',
            description: '各種報表和分析工具',
            permission: 'management'
        },
        policies: {
            id: 'policies',
            name: '政策規範',
            icon: '⚖️',
            color: '#ef4444',
            description: '公司政策和規章制度',
            permission: 'internal'
        },
        external: {
            id: 'external',
            name: '外部連結',
            icon: '🔗',
            color: '#06b6d4',
            description: '外部網站和資源',
            permission: 'public'
        }
    },

    // 文件類型設定
    documentTypes: {
        url: {
            name: '網頁連結',
            icon: '🔗',
            handler: 'openUrl'
        },
        pdf: {
            name: 'PDF文件',
            icon: '📄',
            handler: 'openPdf'
        },
        doc: {
            name: 'Word文件',
            icon: '📝',
            handler: 'openDoc'
        },
        excel: {
            name: 'Excel試算表',
            icon: '📊',
            handler: 'openExcel'
        },
        html: {
            name: 'HTML頁面',
            icon: '🌐',
            handler: 'openHtml'
        },
        system: {
            name: '內部系統',
            icon: '💻',
            handler: 'openSystem'
        }
    },

    // 預設文件數據
    defaultDocuments: {
        sop: [
            {
                id: 'sop-001',
                title: '入箱SOP標準作業程序',
                description: '貨物入箱的標準操作流程',
                type: 'html',
                url: './SOP/入箱SOP標準作業程序_新版.html',
                permission: 'internal',
                category: 'sop',
                tags: ['入箱', 'SOP', '倉儲'],
                lastModified: '2024-01-15',
                addedBy: 'admin'
            },
            {
                id: 'sop-002',
                title: '撿貨SOP標準作業程序',
                description: '貨物撿取的標準操作流程',
                type: 'html',
                url: './SOP/撿貨SOP標準作業程序_新版.html',
                permission: 'internal',
                category: 'sop',
                tags: ['撿貨', 'SOP', '倉儲'],
                lastModified: '2024-01-15',
                addedBy: 'admin'
            },
            {
                id: 'sop-003',
                title: '補貨SOP標準作業程序',
                description: '倉庫補貨的標準操作流程',
                type: 'html',
                url: './SOP/補貨SOP標準作業程序_新版.html',
                permission: 'internal',
                category: 'sop',
                tags: ['補貨', 'SOP', '倉儲'],
                lastModified: '2024-01-15',
                addedBy: 'admin'
            },
            {
                id: 'sop-004',
                title: '進貨SOP標準作業程序',
                description: '貨物進倉的標準操作流程',
                type: 'html',
                url: './SOP/進貨SOP標準作業程序_新版.html',
                permission: 'internal',
                category: 'sop',
                tags: ['進貨', 'SOP', '倉儲'],
                lastModified: '2024-01-15',
                addedBy: 'admin'
            },
            {
                id: 'sop-005',
                title: '工讀生SOP標準作業程序',
                description: '工讀生的標準作業指南',
                type: 'html',
                url: './SOP/工讀生SOP標準作業程序_新版.html',
                permission: 'internal',
                category: 'sop',
                tags: ['工讀生', 'SOP', '訓練'],
                lastModified: '2024-01-15',
                addedBy: 'admin'
            }
        ],
        systems: [
            {
                id: 'sys-001',
                title: '行動倉儲管理系統',
                description: '智能倉儲盤點和管理工具',
                type: 'html',
                url: './mobile-warehouse-app/app.html',
                permission: 'internal',
                category: 'systems',
                tags: ['倉儲', '盤點', '管理'],
                lastModified: '2024-01-10',
                addedBy: 'admin'
            },
            {
                id: 'sys-002',
                title: '圖片差異偵測系統',
                description: '用於檢測圖片差異的工具',
                type: 'html',
                url: './圖片差異偵測系統_簡化版.html',
                permission: 'internal',
                category: 'systems',
                tags: ['圖片', '比對', '工具'],
                lastModified: '2024-01-10',
                addedBy: 'admin'
            },
            {
                id: 'sys-003',
                title: '倉庫平面圖',
                description: '互動式倉庫佈局圖',
                type: 'html',
                url: './平面圖/warehouse.html',
                permission: 'internal',
                category: 'systems',
                tags: ['平面圖', '倉庫', '佈局'],
                lastModified: '2024-01-10',
                addedBy: 'admin'
            },
            {
                id: 'sys-004',
                title: '空調設備異常記錄系統',
                description: '空調設備故障和維護記錄',
                type: 'html',
                url: './空調設備異常記錄表單/單頁應用系統.html',
                permission: 'internal',
                category: 'systems',
                tags: ['空調', '維護', '記錄'],
                lastModified: '2024-01-10',
                addedBy: 'admin'
            }
        ],
        forms: [
            {
                id: 'form-001',
                title: '轉出入紀錄系統',
                description: '貨物轉移記錄表單',
                type: 'system',
                url: 'gas://轉出入紀錄系統',
                permission: 'internal',
                category: 'forms',
                tags: ['轉移', '記錄', '表單'],
                lastModified: '2024-01-12',
                addedBy: 'admin'
            },
            {
                id: 'form-002',
                title: '盤點系統',
                description: '庫存盤點記錄系統',
                type: 'system',
                url: 'gas://盤點系統',
                permission: 'internal',
                category: 'forms',
                tags: ['盤點', '庫存', '系統'],
                lastModified: '2024-01-12',
                addedBy: 'admin'
            },
            {
                id: 'form-003',
                title: '批號登記系統',
                description: '產品批號管理和登記',
                type: 'system',
                url: 'gas://批號登記系統',
                permission: 'internal',
                category: 'forms',
                tags: ['批號', '登記', '管理'],
                lastModified: '2024-01-12',
                addedBy: 'admin'
            },
            {
                id: 'form-004',
                title: '每日進貨&閒置紀錄系統',
                description: '每日進貨和閒置率統計',
                type: 'system',
                url: 'gas://每日進貨閒置系統',
                permission: 'management',
                category: 'forms',
                tags: ['進貨', '閒置', '統計'],
                lastModified: '2024-01-12',
                addedBy: 'admin'
            }
        ],
        external: [
            {
                id: 'ext-001',
                title: 'Google Drive',
                description: '公司雲端硬碟',
                type: 'url',
                url: 'https://drive.google.com',
                permission: 'public',
                category: 'external',
                tags: ['雲端', '檔案', '共享'],
                lastModified: '2024-01-01',
                addedBy: 'admin'
            },
            {
                id: 'ext-002',
                title: 'Gmail',
                description: '公司電子郵件系統',
                type: 'url',
                url: 'https://mail.google.com',
                permission: 'public',
                category: 'external',
                tags: ['郵件', '通訊'],
                lastModified: '2024-01-01',
                addedBy: 'admin'
            }
        ]
    },

    // 使用者介面設定
    ui: {
        theme: {
            primary: '#667eea',
            primaryDark: '#5a67d8',
            secondary: '#764ba2',
            success: '#22c55e',
            warning: '#f59e0b',
            error: '#ef4444',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            surface: 'rgba(255, 255, 255, 0.95)',
            textPrimary: '#2c3e50',
            textSecondary: '#64748b'
        },
        animations: {
            enabled: true,
            duration: 300,
            easing: 'ease-in-out'
        },
        notifications: {
            autoHide: true,
            duration: 3000,
            position: 'top-right'
        },
        search: {
            minLength: 2,
            debounceDelay: 300,
            maxResults: 50
        }
    },

    // 本地儲存設定
    storage: {
        keys: {
            userProfile: 'doc-user-profile',
            userSession: 'doc-user-session',
            preferences: 'doc-user-preferences',
            recentDocuments: 'doc-recent-documents',
            cacheData: 'doc-cache-data'
        },
        sessionTimeout: 8 * 60 * 60 * 1000, // 8小時
        cacheExpiry: 24 * 60 * 60 * 1000 // 24小時
    },

    // 安全設定
    security: {
        sessionTimeout: 8 * 60 * 60 * 1000, // 8小時
        autoLock: false,
        requireAuth: true,
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000, // 15分鐘
        passwordPolicy: {
            minLength: 6,
            requireNumbers: false,
            requireSymbols: false,
            requireUppercase: false
        }
    },

    // 搜尋設定
    search: {
        fields: ['title', 'description', 'tags'],
        fuzzyMatch: true,
        highlightMatches: true,
        caseSensitive: false,
        includeContent: false
    },

    // 分析設定
    analytics: {
        enabled: true,
        trackViews: true,
        trackSearches: true,
        trackDownloads: true,
        retentionDays: 90
    },

    // 預設使用者帳號
    defaultUsers: [
        {
            username: 'admin',
            password: 'admin123',
            name: '系統管理員',
            email: 'admin@company.com',
            role: 'admin',
            department: 'IT部門',
            status: 'active'
        },
        {
            username: 'manager',
            password: 'manager123',
            name: '部門主管',
            email: 'manager@company.com',
            role: 'manager',
            department: '營運部門',
            status: 'active'
        },
        {
            username: 'employee',
            password: 'emp123',
            name: '一般員工',
            email: 'employee@company.com',
            role: 'employee',
            department: '倉儲部門',
            status: 'active'
        }
    ],

    // 開發設定
    debug: {
        enabled: true, // 啟用除錯模式以便故障排除
        logLevel: 'info', // debug, info, warn, error
        showPerformance: false,
        mockData: true, // 使用本地數據，不依賴後端
        skipAuth: false
    },

    // 功能開關
    features: {
        search: true,
        categories: true,
        userManagement: true,
        analytics: true,
        export: true,
        favorites: true,
        recentDocuments: true,
        notifications: true
    }
};

// 環境特定配置
const EnvironmentConfig = {
    development: {
        debug: {
            enabled: true,
            logLevel: 'debug',
            showPerformance: true,
            mockData: true,
            skipAuth: false
        },
        api: {
            timeout: 3000 // 開發時更快超時
        }
    },
    
    production: {
        debug: {
            enabled: true, // 暫時啟用以便故障排除
            logLevel: 'info',
            showPerformance: false,
            mockData: true, // 暫時使用本地數據
            skipAuth: false
        },
        api: {
            timeout: 5000
        },
        security: {
            requireAuth: true
        }
    },
    
    test: {
        debug: {
            enabled: true,
            logLevel: 'warn',
            mockData: true
        },
        features: {
            analytics: false
        }
    }
};

// 合併環境配置
function getDocConfig(environment = 'production') {
    const envConfig = EnvironmentConfig[environment] || {};
    return deepMerge(DocAppConfig, envConfig);
}

// 深度合併物件
function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(result[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}

// 配置驗證
function validateDocConfig(config) {
    const required = [
        'app.name',
        'app.version',
        'permissions',
        'categories',
        'storage.keys'
    ];
    
    const missing = required.filter(path => {
        const value = getNestedValue(config, path);
        return value === undefined || value === null;
    });
    
    if (missing.length > 0) {
        throw new Error(`缺少必要配置: ${missing.join(', ')}`);
    }
    
    return true;
}

// 獲取嵌套值
function getNestedValue(obj, path) {
    return path.split('.').reduce((current, key) => current && current[key], obj);
}

// 設定配置值
function setDocConfigValue(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        current[key] = current[key] || {};
        return current[key];
    }, DocAppConfig);
    
    target[lastKey] = value;
}

// 獲取配置值
function getDocConfigValue(path, defaultValue = null) {
    return getNestedValue(DocAppConfig, path) || defaultValue;
}

// 載入使用者偏好設定
function loadDocUserPreferences() {
    try {
        const saved = localStorage.getItem(DocAppConfig.storage.keys.preferences);
        if (saved) {
            const preferences = JSON.parse(saved);
            return deepMerge(DocAppConfig, preferences);
        }
    } catch (error) {
        console.error('載入使用者偏好設定失敗:', error);
    }
    return DocAppConfig;
}

// 儲存使用者偏好設定
function saveDocUserPreferences(preferences) {
    try {
        localStorage.setItem(
            DocAppConfig.storage.keys.preferences, 
            JSON.stringify(preferences)
        );
        return true;
    } catch (error) {
        console.error('儲存使用者偏好設定失敗:', error);
        return false;
    }
}

// 重置為預設設定
function resetDocToDefaults() {
    try {
        Object.values(DocAppConfig.storage.keys).forEach(key => {
            localStorage.removeItem(key);
        });
        return true;
    } catch (error) {
        console.error('重置設定失敗:', error);
        return false;
    }
}

// 匯出配置管理功能
const DocConfigManager = {
    get: getDocConfig,
    validate: validateDocConfig,
    getValue: getDocConfigValue,
    setValue: setDocConfigValue,
    loadUserPreferences: loadDocUserPreferences,
    saveUserPreferences: saveDocUserPreferences,
    resetToDefaults: resetDocToDefaults,
    merge: deepMerge
};

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DocAppConfig, DocConfigManager, getDocConfig };
} else if (typeof window !== 'undefined') {
    window.DocAppConfig = DocAppConfig;
    window.DocConfigManager = DocConfigManager;
    window.getDocConfig = getDocConfig;
}
