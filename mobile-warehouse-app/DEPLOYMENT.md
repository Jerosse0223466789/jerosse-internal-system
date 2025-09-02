# 🚀 智能倉儲管理系統 - 部署指南

## 📋 **部署前檢查清單**

在開始部署之前，請確認以下項目：

### **✅ 文件完整性檢查**
- [ ] `index.html` - 主頁面文件
- [ ] `manifest.json` - PWA配置文件
- [ ] `config.js` - 應用程式配置
- [ ] `app.js` - 主應用程式
- [ ] `modules/inventory.js` - 庫存管理模組
- [ ] `modules/scanner.js` - 條碼掃描模組
- [ ] `modules/data-sync.js` - 數據同步模組

### **✅ 技術需求**
- [ ] 支援ES6+的現代瀏覽器
- [ ] HTTPS連線（條碼掃描需要）
- [ ] 本地儲存空間（至少50MB）
- [ ] 網頁伺服器（Apache/Nginx/GitHub Pages等）

---

## 🌐 **部署選項**

### **選項1：GitHub Pages（推薦）**

**優點：**
- 免費託管
- 自動HTTPS
- 簡單易用
- 版本控制

**步驟：**

1. **上傳文件到GitHub倉庫**
   ```bash
   # 將所有文件上傳到倉庫根目錄或子目錄
   git add .
   git commit -m "部署智能倉儲管理系統"
   git push origin main
   ```

2. **啟用GitHub Pages**
   - 進入倉庫設定
   - 找到「Pages」選項
   - 選擇「Deploy from a branch」
   - 選擇「main」分支
   - 儲存設定

3. **存取應用程式**
   ```
   https://your-username.github.io/your-repo-name/mobile-warehouse-app/
   ```

### **選項2：本地伺服器**

**使用Python內建伺服器：**
```bash
# 進入專案目錄
cd mobile-warehouse-app

# 啟動HTTP伺服器（Python 3）
python -m http.server 8080

# 啟動HTTP伺服器（Python 2）
python -m SimpleHTTPServer 8080

# 訪問應用程式
open http://localhost:8080
```

**使用Node.js http-server：**
```bash
# 安裝http-server
npm install -g http-server

# 啟動伺服器
http-server mobile-warehouse-app -p 8080

# 訪問應用程式
open http://localhost:8080
```

### **選項3：雲端託管平台**

**Netlify：**
1. 登入 Netlify
2. 拖拽 `mobile-warehouse-app` 資料夾到部署區域
3. 等待部署完成
4. 獲得專屬網址

**Vercel：**
1. 登入 Vercel
2. 選擇「Import Git Repository」
3. 選擇包含應用程式的倉庫
4. 設定根目錄為 `mobile-warehouse-app`
5. 部署完成

**Firebase Hosting：**
```bash
# 安裝Firebase CLI
npm install -g firebase-tools

# 登入Firebase
firebase login

# 初始化專案
firebase init hosting

# 設定public目錄為 mobile-warehouse-app
# 部署
firebase deploy
```

---

## ⚙️ **配置設定**

### **1. API端點配置**

編輯 `config.js` 文件，設定您的API端點：

```javascript
const AppConfig = {
    api: {
        endpoints: {
            inventory: 'https://your-api.com/inventory',
            batch: 'https://your-api.com/batch',
            warehouse: 'https://your-api.com/warehouse'
        }
    }
};
```

### **2. 環境配置**

**生產環境：**
```javascript
const config = getConfig('production'); // 預設
```

**開發環境：**
```javascript
const config = getConfig('development'); // 啟用除錯功能
```

**測試環境：**
```javascript
const config = getConfig('test'); // 使用模擬資料
```

### **3. 自定義主題**

修改 `config.js` 中的主題配色：

```javascript
ui: {
    theme: {
        primary: '#2196F3',      // 主色調
        primaryDark: '#1976D2',  // 深色主色調
        secondary: '#FFC107',    // 次要色調
        success: '#4CAF50',      // 成功色
        warning: '#FF9800',      // 警告色
        error: '#F44336'         // 錯誤色
    }
}
```

---

## 🔧 **後端整合**

### **Google Apps Script整合**

如果您使用Google Apps Script作為後端，請添加以下函數：

```javascript
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const data = requestData.data;
    
    let response;
    switch(action) {
      case 'submitInventory':
        response = handleInventorySubmission(data);
        break;
      case 'getCategories':
        response = getInventoryCategories(data.area);
        break;
      case 'getItems':
        response = getInventoryItems(data.category);
        break;
      default:
        response = { error: '未知的操作: ' + action };
    }
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        error: '處理請求時發生錯誤: ' + error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
```

### **設定API URL**

在應用程式中設定您的Google Apps Script URL：

```javascript
// 在應用程式載入後設定
const app = await initializeApp();

app.setApiEndpoints({
    inventory: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    batch: 'https://script.google.com/macros/s/YOUR_BATCH_SCRIPT_ID/exec',
    warehouse: 'https://script.google.com/macros/s/YOUR_WAREHOUSE_SCRIPT_ID/exec'
});
```

---

## 📱 **PWA設定**

### **Service Worker（可選）**

如果需要完整的PWA功能，可以添加Service Worker：

```javascript
// service-worker.js
const CACHE_NAME = 'warehouse-app-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/config.js',
    '/app.js',
    '/modules/inventory.js',
    '/modules/scanner.js',
    '/modules/data-sync.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                return response || fetch(event.request);
            })
    );
});
```

**註冊Service Worker：**

在 `index.html` 中添加：

```javascript
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
        .then(registration => {
            console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
            console.log('SW registration failed: ', registrationError);
        });
}
```

---

## 🔒 **安全性設定**

### **HTTPS強制**

確保應用程式通過HTTPS提供服務，特別是使用相機功能時。

### **內容安全政策（CSP）**

在 `index.html` 中添加CSP標頭：

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               connect-src 'self' https://script.google.com;">
```

### **資料加密**

敏感資料在本地儲存前可以進行加密：

```javascript
// 在config.js中啟用加密
storage: {
    encryption: true,
    encryptionKey: 'your-encryption-key'
}
```

---

## 📊 **監控和分析**

### **錯誤監控**

添加錯誤追蹤服務：

```javascript
// 在app.js中添加錯誤報告
window.addEventListener('error', (event) => {
    // 發送錯誤到監控服務
    console.error('全域錯誤:', event.error);
});
```

### **使用分析**

如果需要分析使用情況：

```javascript
// 在config.js中啟用分析
features: {
    analytics: true
}
```

---

## 🧪 **測試和驗證**

### **功能測試檢查清單**

部署後請測試以下功能：

- [ ] 應用程式正常載入
- [ ] 統計數據顯示
- [ ] 快速掃描功能
- [ ] 快速盤點功能
- [ ] 網路狀態指示
- [ ] 離線模式運作
- [ ] 資料同步功能
- [ ] 通知系統
- [ ] 響應式設計

### **瀏覽器兼容性測試**

測試以下瀏覽器：

- [ ] Chrome（Android/iOS/Desktop）
- [ ] Safari（iOS/macOS）
- [ ] Firefox（Android/Desktop）
- [ ] Edge（Desktop）

### **效能測試**

- [ ] 初始載入時間 < 3秒
- [ ] 操作響應時間 < 500ms
- [ ] 記憶體使用穩定
- [ ] 無明顯記憶體洩漏

---

## 🔧 **故障排除**

### **常見問題**

**問題：應用程式無法載入**
```
解決方案：
1. 檢查所有文件是否正確上傳
2. 確認文件路徑正確
3. 檢查瀏覽器控制台錯誤
```

**問題：條碼掃描不工作**
```
解決方案：
1. 確認使用HTTPS連線
2. 檢查相機權限
3. 嘗試手動輸入模式
```

**問題：資料無法同步**
```
解決方案：
1. 檢查API端點配置
2. 確認網路連線
3. 查看同步佇列狀態
```

**問題：PWA無法安裝**
```
解決方案：
1. 檢查manifest.json格式
2. 確認HTTPS連線
3. 添加Service Worker
```

### **除錯模式**

啟用除錯模式以獲得更多資訊：

```javascript
const debugConfig = {
    debug: {
        enabled: true,
        logLevel: 'debug'
    }
};

const app = await initializeApp(debugConfig);
```

---

## 📈 **效能優化**

### **載入優化**

1. **啟用Gzip壓縮**
2. **設定快取標頭**
3. **使用CDN（如需要）**
4. **優化圖片大小**

### **運行時優化**

1. **啟用懶載入**
2. **定期清理快取**
3. **限制本地儲存大小**
4. **優化事件處理**

---

## 🔄 **更新和維護**

### **版本更新**

1. **備份現有資料**
2. **更新應用程式文件**
3. **測試新功能**
4. **通知使用者**

### **資料備份**

定期備份本地儲存資料：

```javascript
// 匯出所有資料
const backupData = await app.exportData('json');

// 儲存備份
localStorage.setItem('backup-' + Date.now(), backupData);
```

---

## 📞 **技術支援**

如果在部署過程中遇到問題：

1. **檢查此部署指南**
2. **查看瀏覽器控制台錯誤**
3. **參考README.md文件**
4. **聯絡技術支援團隊**

---

**祝您部署順利！享受智能倉儲管理帶來的便利！** 🎉
