# 部署說明

## 🚀 快速部署指南

### 1. 設定 Google Apps Script 後端

#### 步驟 1: 創建 Google Apps Script 專案
1. 前往 [Google Apps Script](https://script.google.com/)
2. 點擊「新增專案」
3. 將專案命名為「公司文件管理系統後端」

#### 步驟 2: 部署後端程式碼
1. 刪除預設的 `Code.gs` 文件
2. 點擊「+」新增檔案，命名為 `Backend.gs`
3. 將 `GAS_Backend.js` 的完整內容複製貼上
4. 儲存專案 (Ctrl+S)

#### 步驟 3: 創建資料庫試算表
1. 前往 [Google Sheets](https://sheets.google.com/)
2. 創建新的空白試算表
3. 將試算表命名為「公司文件管理系統_資料庫」
4. 複製試算表的 ID（網址中 `/d/` 和 `/edit` 之間的部分）
5. 在 GAS 程式碼中，將 `CONFIG.SPREADSHEET_ID` 設定為這個 ID

#### 步驟 4: 部署為網頁應用程式
1. 在 Google Apps Script 中，點擊右上角「部署」→「新增部署作業」
2. 選擇類型：「網頁應用程式」
3. 設定說明：「公司文件管理系統API」
4. 執行身分：選擇「我」
5. 存取權：選擇「任何人」
6. 點擊「部署」
7. 複製部署的網頁應用程式網址

### 2. 配置前端應用程式

#### 更新 API 端點
在 `config.js` 文件中找到以下部分：

```javascript
api: {
    endpoints: {
        auth: 'YOUR_GAS_WEB_APP_URL_HERE/auth',
        documents: 'YOUR_GAS_WEB_APP_URL_HERE/documents',
        // ...
    }
}
```

將所有的 `YOUR_GAS_WEB_APP_URL_HERE` 替換為你的 Google Apps Script 部署網址。

#### 自定義配置（可選）
- 修改 `defaultDocuments` 以包含你的文件
- 調整 `permissions` 設定用戶權限
- 更新 `defaultUsers` 修改預設帳號

### 3. 部署前端應用程式

#### 選項 A: GitHub Pages (推薦)
1. 將 `company-doc-app` 資料夾推送到 GitHub repository
2. 在 repository 設定中啟用 GitHub Pages
3. 選擇來源分支 (通常是 `main` 或 `master`)
4. 你的應用程式將在 `https://yourusername.github.io/your-repo-name/app.html` 上線

#### 選項 B: 靜態網站託管服務
支援的服務：
- **Netlify**: 拖放 `company-doc-app` 資料夾
- **Vercel**: 連接 GitHub repository
- **Firebase Hosting**: 使用 Firebase CLI 部署
- **Surge.sh**: 使用命令行工具上傳

#### 選項 C: 自有伺服器
1. 將 `company-doc-app` 資料夾上傳到網頁伺服器
2. 確保伺服器支援 HTTPS（建議）
3. 設定適當的 MIME 類型：
   - `.js` → `application/javascript`
   - `.json` → `application/json`
   - `.html` → `text/html`

### 4. 測試部署

#### 功能測試檢查表
- [ ] 載入主頁面無錯誤
- [ ] 可以使用預設帳號登入
- [ ] 文件分類正常顯示
- [ ] 搜尋功能運作正常
- [ ] 網路狀態指示器正確
- [ ] 手機版介面正常
- [ ] PWA 功能（可安裝到主畫面）

#### 預設測試帳號
```
管理員：admin / admin123
主管：manager / manager123
員工：employee / emp123
```

### 5. 生產環境設定

#### 安全性設定
1. **更改預設密碼**：
   - 在 Google Sheets 中修改用戶密碼
   - 或通過系統管理功能更新

2. **設定 CORS 域名限制**：
   ```javascript
   ALLOWED_ORIGINS: [
       'https://your-domain.com',
       'https://your-company.github.io'
   ]
   ```

3. **啟用 HTTPS**：
   - 確保所有連線都使用 HTTPS
   - 避免混合內容警告

#### 效能優化
1. **啟用生產模式**：
   ```javascript
   // 在 config.js 中
   debug: {
       enabled: false,
       mockData: false
   }
   ```

2. **設定適當的快取**：
   - 靜態檔案：1年
   - HTML檔案：1小時
   - JSON檔案：10分鐘

### 6. 維護和更新

#### 定期維護任務
1. **每週**：檢查系統錯誤記錄
2. **每月**：清理過期的會話和記錄
3. **每季**：備份 Google Sheets 資料
4. **每年**：更新用戶密碼和權限

#### 更新程序
1. 在開發環境測試更新
2. 備份現有的 Google Sheets 資料
3. 更新 Google Apps Script 程式碼
4. 更新前端檔案
5. 驗證所有功能正常運作

### 7. 故障排除

#### 常見問題和解決方案

**問題：無法載入文件**
```
解決方案：
1. 檢查 Google Apps Script 是否正確部署
2. 確認 API 端點設定正確
3. 查看瀏覽器控制台的錯誤訊息
```

**問題：登入失敗**
```
解決方案：
1. 確認 Google Sheets 中有用戶資料
2. 檢查用戶狀態是否為 'active'
3. 驗證密碼是否正確
```

**問題：權限錯誤**
```
解決方案：
1. 檢查用戶角色設定
2. 確認文件權限等級
3. 驗證權限配置是否正確
```

#### 偵錯步驟
1. 開啟瀏覽器開發者工具
2. 查看 Console 標籤的錯誤訊息
3. 檢查 Network 標籤的 API 請求
4. 驗證 Google Apps Script 的執行記錄

### 8. 進階配置

#### 自定義文件類型
```javascript
// 在 config.js 中添加新的文件類型
documentTypes: {
    custom: {
        name: '自定義類型',
        icon: '🔧',
        handler: 'openCustom'
    }
}
```

#### 整合外部系統
```javascript
// 設定外部系統連結
systems: {
    erp: 'https://erp.company.com',
    crm: 'https://crm.company.com'
}
```

#### 客製化主題
```javascript
// 修改主題顏色
ui: {
    theme: {
        primary: '#your-color',
        background: 'your-gradient'
    }
}
```

---

## 📞 技術支援

如果遇到部署問題，請提供：
1. 錯誤訊息截圖
2. 瀏覽器類型和版本
3. 部署環境資訊
4. Google Apps Script 執行記錄

---

*最後更新：2024年1月*
