/**
 * 應用程式配置文件
 * 包含所有設定選項和常數定義
 */

const AppConfig = {
    // 應用程式基本資訊
    app: {
        name: '智能倉儲管理系統',
        version: '1.0.0',
        build: Date.now(),
        author: 'Warehouse Team',
        description: '現代化行動端倉儲管理工具'
    },

    // API設定
    api: {
        timeout: 30000, // 30秒
        retryAttempts: 3,
        retryDelay: 1000, // 1秒
        endpoints: {
            inventory: '',
            batch: '',
            warehouse: '',
            users: '',
            reports: ''
        }
    },

    // 離線設定
    offline: {
        maxStorageSize: 50 * 1024 * 1024, // 50MB
        syncInterval: 30000, // 30秒
        maxQueueSize: 1000,
        dataExpiry: 7 * 24 * 60 * 60 * 1000 // 7天
    },

    // 條碼掃描設定
    scanner: {
        supportedFormats: [
            'CODE_128', 'CODE_39', 'EAN_13', 'EAN_8', 
            'UPC_A', 'UPC_E', 'QR_CODE', 'DATA_MATRIX'
        ],
        scanTimeout: 10000, // 10秒
        autoFocus: true,
        flashSupport: true,
        historyLimit: 50
    },

    // 庫存管理設定
    inventory: {
        defaultCategories: [
            { id: 'food', name: '食品類', icon: '🍎', color: '#4CAF50' },
            { id: 'medicine', name: '藥品類', icon: '💊', color: '#2196F3' },
            { id: 'cosmetic', name: '美妝類', icon: '💄', color: '#E91E63' },
            { id: 'supplement', name: '保健品', icon: '💚', color: '#FF9800' },
            { id: 'others', name: '其他類', icon: '📦', color: '#9E9E9E' }
        ],
        defaultLocations: [
            { id: '1F-A', name: '一樓A區', zone: '1F' },
            { id: '1F-B', name: '一樓B區', zone: '1F' },
            { id: '2F-A', name: '二樓A區', zone: '2F' },
            { id: '2F-B', name: '二樓B區', zone: '2F' },
            { id: 'COLD', name: '冷藏區', zone: 'SPECIAL' },
            { id: 'TEMP', name: '暫存區', zone: 'SPECIAL' }
        ],
        defaultUnits: [
            { id: 'pcs', name: '個', symbol: '個' },
            { id: 'box', name: '盒', symbol: '盒' },
            { id: 'case', name: '箱', symbol: '箱' },
            { id: 'bottle', name: '瓶', symbol: '瓶' },
            { id: 'pack', name: '包', symbol: '包' },
            { id: 'kg', name: '公斤', symbol: 'kg' },
            { id: 'gram', name: '公克', symbol: 'g' },
            { id: 'liter', name: '公升', symbol: 'L' },
            { id: 'ml', name: '毫升', symbol: 'ml' }
        ],
        lowStockThreshold: 10,
        expiryWarningDays: 30,
        sessionTimeout: 30 * 60 * 1000 // 30分鐘
    },

    // 使用者介面設定
    ui: {
        theme: {
            primary: '#2196F3',
            primaryDark: '#1976D2',
            secondary: '#FFC107',
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#F44336',
            background: '#F5F5F5',
            surface: '#FFFFFF',
            textPrimary: '#212121',
            textSecondary: '#757575'
        },
        animations: {
            enabled: true,
            duration: 300,
            easing: 'ease-in-out'
        },
        notifications: {
            autoHide: true,
            duration: 3000,
            position: 'top'
        },
        pagination: {
            pageSize: 20,
            maxPages: 100
        }
    },

    // 本地儲存設定
    storage: {
        keys: {
            userPreferences: 'user-preferences',
            inventoryData: 'inventory-data',
            scanHistory: 'scan-history',
            syncQueue: 'sync-queue',
            appSettings: 'app-settings',
            cacheData: 'cache-data'
        },
        compression: false,
        encryption: false
    },

    // 安全設定
    security: {
        sessionTimeout: 8 * 60 * 60 * 1000, // 8小時
        autoLock: false,
        requireAuth: false,
        maxLoginAttempts: 5,
        lockoutDuration: 15 * 60 * 1000 // 15分鐘
    },

    // 報表設定
    reports: {
        defaultDateRange: 30, // 30天
        maxExportRecords: 10000,
        supportedFormats: ['json', 'csv', 'excel'],
        chartTypes: ['line', 'bar', 'pie', 'doughnut'],
        autoRefresh: true,
        refreshInterval: 5 * 60 * 1000 // 5分鐘
    },

    // 批號管理設定
    batch: {
        expiryWarningDays: [30, 7, 1], // 30天、7天、1天前警告
        batchCodeFormat: 'auto', // auto, manual, custom
        trackingEnabled: true,
        fifoEnabled: true, // 先進先出
        autoCleanup: true
    },

    // 效能設定
    performance: {
        lazyLoading: true,
        imageCompression: true,
        cacheEnabled: true,
        preloadData: true,
        debounceDelay: 300,
        throttleDelay: 100
    },

    // 開發設定
    debug: {
        enabled: false,
        logLevel: 'info', // debug, info, warn, error
        showPerformance: false,
        mockData: false,
        skipAuth: false
    },

    // 功能開關
    features: {
        barcode: true,
        voice: true,
        camera: true,
        offline: true,
        sync: true,
        reports: true,
        export: true,
        import: true,
        notifications: true,
        analytics: false
    },

    // 語言設定
    localization: {
        defaultLanguage: 'zh-TW',
        supportedLanguages: ['zh-TW', 'zh-CN', 'en-US'],
        dateFormat: 'YYYY-MM-DD',
        timeFormat: 'HH:mm:ss',
        numberFormat: 'zh-TW'
    },

    // 通知設定
    notifications: {
        enabled: true,
        sound: true,
        vibration: true,
        badge: true,
        types: {
            sync: true,
            inventory: true,
            expiry: true,
            lowStock: true,
            system: true
        }
    }
};

// 環境特定配置
const EnvironmentConfig = {
    development: {
        debug: {
            enabled: true,
            logLevel: 'debug',
            showPerformance: true,
            mockData: true
        },
        api: {
            timeout: 10000
        }
    },
    
    production: {
        debug: {
            enabled: false,
            logLevel: 'error',
            showPerformance: false,
            mockData: false
        },
        api: {
            timeout: 30000
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
function getConfig(environment = 'production') {
    const envConfig = EnvironmentConfig[environment] || {};
    return deepMerge(AppConfig, envConfig);
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
function validateConfig(config) {
    const required = [
        'app.name',
        'app.version',
        'ui.theme.primary',
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
function setConfigValue(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, key) => {
        current[key] = current[key] || {};
        return current[key];
    }, AppConfig);
    
    target[lastKey] = value;
}

// 獲取配置值
function getConfigValue(path, defaultValue = null) {
    return getNestedValue(AppConfig, path) || defaultValue;
}

// 載入使用者偏好設定
function loadUserPreferences() {
    try {
        const saved = localStorage.getItem(AppConfig.storage.keys.userPreferences);
        if (saved) {
            const preferences = JSON.parse(saved);
            return deepMerge(AppConfig, preferences);
        }
    } catch (error) {
        console.error('載入使用者偏好設定失敗:', error);
    }
    return AppConfig;
}

// 儲存使用者偏好設定
function saveUserPreferences(preferences) {
    try {
        localStorage.setItem(
            AppConfig.storage.keys.userPreferences, 
            JSON.stringify(preferences)
        );
        return true;
    } catch (error) {
        console.error('儲存使用者偏好設定失敗:', error);
        return false;
    }
}

// 重置為預設設定
function resetToDefaults() {
    try {
        localStorage.removeItem(AppConfig.storage.keys.userPreferences);
        return true;
    } catch (error) {
        console.error('重置設定失敗:', error);
        return false;
    }
}

// 匯出配置管理功能
const ConfigManager = {
    get: getConfig,
    validate: validateConfig,
    getValue: getConfigValue,
    setValue: setConfigValue,
    loadUserPreferences,
    saveUserPreferences,
    resetToDefaults,
    merge: deepMerge
};

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AppConfig, ConfigManager, getConfig };
} else if (typeof window !== 'undefined') {
    window.AppConfig = AppConfig;
    window.ConfigManager = ConfigManager;
    window.getConfig = getConfig;
}
