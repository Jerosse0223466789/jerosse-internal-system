# 🔧 倉庫助手 APP - 快速設定指南

## 📋 設定檢查清單

### ✅ 步驟 1：Google Apps Script 設定

#### 1.1 取得您現有系統的 Script ID
在 Google Apps Script 中：
1. 開啟您的盤點系統專案
2. 點擊「部署」→「管理部署」
3. 複製 Web 應用程式 URL
4. URL 格式：`https://script.google.com/macros/s/{SCRIPT_ID}/exec`

#### 1.2 更新 API 端點
編輯 `js/api.js` 檔案，替換以下 URL：

```javascript
// 範例：將 YOUR_INVENTORY_SCRIPT_ID 替換為實際的 Script ID
this.endpoints = {
    inventory: 'https://script.google.com/macros/s/AKfycbxxx...xxx/exec',
    batch: 'https://script.google.com/macros/s/AKfycbyyy...yyy/exec',
    transfer: 'https://script.google.com/macros/s/AKfycbzzz...zzz/exec',
    warehouse: 'https://script.google.com/macros/s/AKfycbwww...www/exec'
};
```

### ✅ 步驟 2：後端 API 調整

在您現有的 Google Apps Script 中添加以下處理函數：

#### 2.1 修改 doPost 函數
```javascript
function doPost(e) {
  try {
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const data = requestData.data;
    
    // 設定 CORS 標頭
    const response = handleAction(action, data);
    
    return ContentService
      .createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
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

function handleAction(action, data) {
  switch(action) {
    case 'submitInventory':
      return submitInventoryFromApp(data);
    case 'getTodayStats':
      return getTodayStatsForApp();
    case 'getCategories':
      return getCategoriesForApp(data.area);
    case 'getItems':
      return getItemsForApp(data.category);
    case 'getPeople':
      return getPeopleForApp();
    default:
      return { error: '未知的操作: ' + action };
  }
}
```

#### 2.2 新增支援函數
```javascript
// 盤點提交（適配行動端格式）
function submitInventoryFromApp(data) {
  try {
    // 使用您現有的盤點邏輯，調整資料格式
    const result = submitData({
      area: data.area,
      category: data.category, 
      item: data.item,
      quantity: data.quantity,
      person: data.person,
      timestamp: data.timestamp
    });
    
    return { success: true, result: result };
  } catch (error) {
    return { error: error.toString() };
  }
}

// 今日統計
function getTodayStatsForApp() {
  try {
    const today = new Date();
    const todayStr = Utilities.formatDate(today, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    
    // 根據您的資料結構調整
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('FormResponses');
    const data = sheet.getDataRange().getValues();
    
    let inventoryCount = 0;
    for (let i = 1; i < data.length; i++) {
      const rowDate = Utilities.formatDate(new Date(data[i][0]), Session.getScriptTimeZone(), 'yyyy-MM-dd');
      if (rowDate === todayStr) {
        inventoryCount++;
      }
    }
    
    return {
      inventoryCount: inventoryCount,
      transferCount: 0, // 從您的轉移系統取得
      batchCount: 0     // 從您的批號系統取得
    };
  } catch (error) {
    return { error: error.toString() };
  }
}

// 取得分類列表
function getCategoriesForApp(area) {
  try {
    // 根據您的 itemlist 工作表結構調整
    const categories = getItemList().order; // 使用您現有的函數
    return categories;
  } catch (error) {
    return { error: error.toString() };
  }
}

// 取得品項列表
function getItemsForApp(category) {
  try {
    const itemData = getItemList(); // 使用您現有的函數
    const items = itemData.map[category] || [];
    return items.map(item => ({ name: item }));
  } catch (error) {
    return { error: error.toString() };
  }
}

// 取得人員列表
function getPeopleForApp() {
  try {
    // 從您的 People 工作表取得
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('People');
    const data = sheet.getRange('A:A').getValues();
    const people = data.slice(1).map(row => row[0]).filter(name => name);
    return people;
  } catch (error) {
    return { error: error.toString() };
  }
}
```

### ✅ 步驟 3：網頁伺服器設定

#### 3.1 上傳檔案
將所有檔案上傳到您的網頁伺服器：
```
/public_html/warehouse-app/
├── index.html
├── manifest.json
├── service-worker.js
├── css/app.css
├── js/ (所有 JS 檔案)
└── icons/ (所有圖示檔案)
```

#### 3.2 設定 HTTPS
PWA 必須使用 HTTPS。如果您使用 cPanel：
1. 進入 SSL/TLS 設定
2. 啟用 Let's Encrypt 或上傳 SSL 憑證

#### 3.3 測試連線
開啟 `https://yourdomain.com/warehouse-app/`
檢查是否正常載入

### ✅ 步驟 4：圖示檔案準備

#### 4.1 建立圖示
使用任何圖片編輯軟體建立以下尺寸的 PNG 圖示：
- 72x72, 96x96, 128x128, 144x144
- 152x152, 192x192, 384x384, 512x512

#### 4.2 圖示建議
- 使用簡潔的倉庫或箱子圖案
- 背景建議使用您公司的品牌色彩
- 確保在小尺寸下仍清晰可見

### ✅ 步驟 5：功能測試

#### 5.1 基本功能測試
- [ ] 開啟應用程式正常載入
- [ ] 底部導航可以切換頁面
- [ ] 側邊選單正常開啟關閉

#### 5.2 盤點功能測試
- [ ] 區域下拉選單有選項
- [ ] 選擇區域後分類選單有選項  
- [ ] 選擇分類後品項選單有選項
- [ ] 人員選單有選項
- [ ] 提交盤點資料成功

#### 5.3 條碼掃描測試
- [ ] 鏡頭權限要求正常
- [ ] 掃描介面正常顯示
- [ ] 能夠成功掃描條碼
- [ ] 掃描結果正確顯示

#### 5.4 語音輸入測試
- [ ] 麥克風權限要求正常
- [ ] 語音識別功能正常
- [ ] 中文數字轉換正確
- [ ] 識別結果正確填入

#### 5.5 離線功能測試
- [ ] 關閉網路後仍可操作
- [ ] 離線資料正確儲存
- [ ] 網路恢復後自動同步
- [ ] 同步狀態正確顯示

### ✅ 步驟 6：手機安裝測試

#### 6.1 Android 測試
1. 使用 Chrome 開啟應用程式
2. 查看是否出現安裝提示
3. 點擊安裝並確認功能正常

#### 6.2 iOS 測試  
1. 使用 Safari 開啟應用程式
2. 點擊分享 → "加入主畫面"
3. 確認圖示和功能正常

## 🚨 常見設定問題

### 問題 1：API 調用失敗
**症狀：** 選擇區域後分類選單無選項
**解決：**
1. 檢查 Google Apps Script URL 設定
2. 確認後端 doPost 函數正確
3. 檢查瀏覽器 Console 錯誤訊息

### 問題 2：PWA 無法安裝
**症狀：** 沒有出現安裝提示
**解決：**
1. 確認使用 HTTPS
2. 檢查 manifest.json 檔案格式
3. 確認 Service Worker 正常載入

### 問題 3：條碼掃描無法使用
**症狀：** 鏡頭無法啟動
**解決：**
1. 確認使用 HTTPS
2. 檢查瀏覽器權限設定
3. 嘗試不同瀏覽器

### 問題 4：語音輸入無效
**症狀：** 點擊麥克風無反應
**解決：**
1. 確認瀏覽器支援 Web Speech API
2. 檢查麥克風權限
3. 確認網路連線正常

## 📞 需要協助？

如果遇到設定問題：

1. **檢查瀏覽器 Console**
   - 按 F12 開啟開發者工具
   - 查看 Console 標籤的錯誤訊息

2. **檢查網路請求**
   - 開發者工具 → Network 標籤
   - 查看 API 請求是否成功

3. **聯絡技術支援**
   - 提供錯誤訊息截圖
   - 說明操作步驟和環境資訊

---

完成設定後，您就可以開始使用功能強大的行動端倉庫助手了！🎉
