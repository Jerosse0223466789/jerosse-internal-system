# 📱 倉庫助手 - 行動端 PWA

一個功能完整的行動端倉庫管理應用程式，專為提升倉庫作業效率而設計。

## ✨ 主要功能

### 🔍 條碼掃描
- 支援各種條碼格式（EAN、UPC、QR Code等）
- 自動識別產品、批號、位置碼
- 前後鏡頭切換
- 手動輸入備用方案

### 🎤 語音輸入
- 繁體中文語音識別
- 智能數字轉換
- 語音命令操作
- 即時語音回饋

### 📊 快速盤點
- 響應式表單設計
- 即時資料驗證
- 進度追蹤
- 離線作業支援

### 🔄 庫存轉移
- 視覺化轉移路徑
- 批量品項處理
- 轉移記錄追蹤
- 路徑優化建議

### 📦 批號管理
- 效期警示
- 批號搜尋
- 庫存狀態監控
- 到期提醒

### 🌐 離線功能
- IndexedDB 本地儲存
- 自動同步機制
- 離線佇列管理
- 資料匯出功能

### 📱 PWA 特性
- 可安裝到桌面
- 離線快取
- 推播通知
- 響應式設計

## 🚀 快速開始

### 前置要求

1. **現有的 Google Apps Script 倉庫系統**
   - 盤點系統
   - 批號登記系統
   - 轉移管理系統

2. **網頁伺服器**
   - 支援 HTTPS（PWA 必需）
   - 可以是 Apache、Nginx 或任何靜態檔案伺服器

### 安裝步驟

#### 1. 下載檔案
```bash
# 將所有檔案放到您的網頁伺服器目錄
/your-website/
├── index.html
├── manifest.json
├── service-worker.js
├── css/
│   └── app.css
├── js/
│   ├── app.js
│   ├── scanner.js
│   ├── voice.js
│   ├── offline.js
│   └── api.js
└── icons/
    └── (圖示檔案)
```

#### 2. 設定 Google Apps Script URL

編輯 `js/api.js` 檔案，將以下 URL 替換為您實際的 Google Apps Script 部署 URL：

```javascript
this.endpoints = {
    inventory: 'https://script.google.com/macros/s/YOUR_INVENTORY_SCRIPT_ID/exec',
    batch: 'https://script.google.com/macros/s/YOUR_BATCH_SCRIPT_ID/exec',
    transfer: 'https://script.google.com/macros/s/YOUR_TRANSFER_SCRIPT_ID/exec',
    warehouse: 'https://script.google.com/macros/s/YOUR_WAREHOUSE_SCRIPT_ID/exec'
};
```

#### 3. 設定 HTTPS

PWA 需要 HTTPS 才能正常運作。如果您使用自己的伺服器：

```bash
# 使用 Let's Encrypt 取得免費 SSL 憑證
sudo certbot --nginx -d yourdomain.com
```

#### 4. 準備圖示檔案

在 `icons/` 目錄中放入以下尺寸的圖示：
- icon-72.png (72x72)
- icon-96.png (96x96)
- icon-128.png (128x128)
- icon-144.png (144x144)
- icon-152.png (152x152)
- icon-192.png (192x192)
- icon-384.png (384x384)
- icon-512.png (512x512)

### 3. Google Apps Script 後端設定

您需要在現有的 Google Apps Script 中添加以下 API 端點：

#### 盤點系統 API
```javascript
function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const action = data.action;
  
  switch(action) {
    case 'submitInventory':
      return submitInventory(data.data);
    case 'getTodayStats':
      return getTodayStats();
    case 'getCategories':
      return getCategories(data.data.area);
    case 'getItems':
      return getItems(data.data.category);
    case 'getPeople':
      return getPeople();
    default:
      return ContentService
        .createTextOutput(JSON.stringify({error: '未知的操作'}))
        .setMimeType(ContentService.MimeType.JSON);
  }
}
```

#### CORS 設定
```javascript
function doGet(e) {
  return HtmlService.createHtmlOutput()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

## 📱 使用說明

### 安裝到手機

1. **Android 裝置**
   - 使用 Chrome 瀏覽器開啟應用程式
   - 點擊右上角選單 → "安裝應用程式"
   - 或點擊網址列的安裝圖示

2. **iOS 裝置**
   - 使用 Safari 瀏覽器開啟應用程式
   - 點擊分享按鈕 → "加入主畫面"

### 基本操作流程

#### 快速盤點
1. 點擊底部導航的"盤點"
2. 選擇區域、分類、品項
3. 使用條碼掃描或語音輸入數量
4. 選擇盤點人員
5. 提交資料

#### 條碼掃描
1. 點擊"掃描"頁面
2. 允許鏡頭權限
3. 將條碼對準掃描框
4. 自動識別並處理結果

#### 語音輸入
1. 點擊任何輸入框旁的麥克風圖示
2. 允許麥克風權限
3. 清楚說出要輸入的內容
4. 系統自動填入識別結果

### 離線使用

1. **離線盤點**
   - 在無網路環境下繼續使用
   - 資料自動儲存到本地
   - 網路恢復後自動同步

2. **資料同步**
   - 點擊頂部的同步按鈕
   - 或等待自動同步
   - 查看同步狀態

## ⚙️ 進階設定

### 自訂 API 端點

編輯 `js/api.js` 中的端點設定：

```javascript
// 自訂超時時間
this.requestTimeout = 15000; // 15秒

// 自訂重試次數
this.retryAttempts = 5;

// 自訂快取時間
const ttl = 600000; // 10分鐘
```

### 語音識別設定

編輯 `js/voice.js`：

```javascript
// 更改語言設定
this.recognition.lang = 'zh-CN'; // 簡體中文
this.recognition.lang = 'en-US'; // 英文

// 調整識別精度
this.recognition.maxAlternatives = 5;
```

### 快取策略

編輯 `service-worker.js`：

```javascript
// 調整快取時間
const maxAge = 48 * 60 * 60 * 1000; // 48小時

// 自訂快取資源
const STATIC_RESOURCES = [
    // 添加您的自訂資源
];
```

## 🔧 故障排除

### 常見問題

#### 1. 條碼掃描無法使用
**解決方案：**
- 確認瀏覽器支援鏡頭功能
- 檢查鏡頭權限設定
- 嘗試重新整理頁面

#### 2. 語音輸入無效
**解決方案：**
- 確認麥克風權限
- 檢查網路連線（語音識別需要網路）
- 確認瀏覽器支援 Web Speech API

#### 3. PWA 無法安裝
**解決方案：**
- 確認網站使用 HTTPS
- 檢查 manifest.json 檔案
- 確認 Service Worker 正常運作

#### 4. API 調用失敗
**解決方案：**
- 檢查 Google Apps Script URL 設定
- 確認 CORS 設定正確
- 檢查網路連線

### 開發者工具

開啟瀏覽器開發者工具查看：

1. **Console** - 錯誤訊息和除錯資訊
2. **Network** - API 請求狀態
3. **Application** - Service Worker 和快取狀態
4. **Storage** - IndexedDB 資料

## 📊 效能優化

### 建議設定

1. **伺服器設定**
```nginx
# Nginx 設定範例
gzip on;
gzip_types text/css application/javascript application/json;

# 設定快取標頭
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

2. **圖片優化**
- 使用 WebP 格式
- 壓縮圖示檔案
- 設定適當的尺寸

3. **程式碼優化**
- 啟用 JavaScript 壓縮
- 移除未使用的功能
- 使用 CDN 加速

## 🔐 安全性

### 資料保護

1. **本地資料加密**
```javascript
// 在 offline.js 中添加加密
const encryptData = (data) => {
    // 實作加密邏輯
    return encryptedData;
};
```

2. **API 安全**
- 使用 HTTPS
- 實作 API 金鑰驗證
- 限制 CORS 來源

3. **權限管理**
- 最小權限原則
- 定期審核存取權限
- 記錄操作日誌

## 📞 技術支援

### 聯絡資訊

- **開發者：** [您的姓名]
- **Email：** [您的信箱]
- **GitHub：** [專案連結]

### 更新日誌

#### v1.0.0 (2024-12-26)
- ✅ 初始版本發布
- ✅ 條碼掃描功能
- ✅ 語音輸入支援
- ✅ 離線作業功能
- ✅ PWA 支援

### 即將推出

- 📋 批量操作功能
- 🎨 主題自訂
- 📊 進階報表
- 🔔 推播通知
- 📱 原生應用程式

## 📄 授權條款

此專案採用 MIT 授權條款，詳見 LICENSE 檔案。

---

**🎉 感謝使用倉庫助手！** 

如有任何問題或建議，歡迎聯絡我們。
