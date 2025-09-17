# 公司文件管理系統

一個現代化的企業內部文件管理平台，支援分類瀏覽、權限控制、用戶認證等功能。

## ✨ 主要功能

### 🔐 用戶認證系統
- 多角色權限管理（訪客、員工、主管、管理員）
- 安全的會話管理
- 自動登出保護

### 📚 文件管理
- 分類瀏覽（SOP、表單、系統工具、報表、政策、外部連結）
- 智能搜尋功能
- 收藏文件功能
- 最近瀏覽記錄

### 🎨 現代化界面
- 響應式設計，支援電腦和手機
- 美觀的漸層背景和毛玻璃效果
- 直觀的分類導航
- 流暢的動畫效果

### 🔄 數據同步
- Google Apps Script 後端支援
- 離線模式支援
- 自動數據同步
- 錯誤重試機制

## 🚀 快速開始

### 1. 設定 Google Apps Script 後端

1. 前往 [Google Apps Script](https://script.google.com/)
2. 創建新專案
3. 將 `GAS_Backend.js` 的內容複製到編輯器中
4. 創建 Google Sheets 並記錄試算表ID
5. 在程式碼中更新 `CONFIG.SPREADSHEET_ID`
6. 部署為網頁應用程式，選擇「所有人」可執行
7. 複製部署的網址

### 2. 配置前端應用

1. 在 `config.js` 中更新 API 端點：
```javascript
api: {
    endpoints: {
        auth: '你的GAS網址/auth',
        documents: '你的GAS網址/documents',
        users: '你的GAS網址/users',
        categories: '你的GAS網址/categories',
        analytics: '你的GAS網址/analytics'
    }
}
```

2. 根據需要調整文件配置和權限設定

### 3. 部署應用

將整個 `company-doc-app` 資料夾上傳到網頁伺服器，或使用 GitHub Pages 等靜態網站託管服務。

## 👥 預設帳號

系統預設提供以下測試帳號：

| 角色 | 帳號 | 密碼 | 權限 |
|------|------|------|------|
| 系統管理員 | admin | admin123 | 完整權限 |
| 部門主管 | manager | manager123 | 管理和內部文件 |
| 一般員工 | employee | emp123 | 內部文件 |

## 📁 文件結構

```
company-doc-app/
├── app.html              # 主界面
├── app.js                # 主應用程式邏輯
├── config.js             # 配置文件
├── GAS_Backend.js        # Google Apps Script 後端
├── modules/              # 功能模組
│   ├── auth.js           # 認證管理
│   ├── document-manager.js # 文件管理
│   └── data-sync.js      # 數據同步
└── README.md             # 說明文件
```

## 🔧 配置選項

### 權限等級
- `public`: 公開文件，所有用戶可查看
- `internal`: 內部文件，員工以上可查看
- `management`: 管理文件，主管以上可查看
- `admin`: 管理員文件，僅管理員可查看

### 文件分類
- **SOP**: 標準作業程序
- **表單文件**: 各類申請表單
- **系統工具**: 內部系統連結
- **報表分析**: 各種報表和分析工具
- **政策規範**: 公司政策和規章制度
- **外部連結**: 外部網站和資源

### 支援的文件類型
- **URL**: 一般網頁連結
- **PDF**: PDF文件
- **Office**: Word/Excel文件
- **HTML**: HTML頁面
- **System**: 內部系統（支援 gas:// 協議）

## 🛠️ 自定義配置

### 添加新文件
在 `config.js` 的 `defaultDocuments` 中添加：

```javascript
{
    id: 'unique-id',
    title: '文件標題',
    description: '文件描述',
    type: 'url', // url, pdf, doc, excel, html, system
    url: '文件網址',
    permission: 'internal', // public, internal, management, admin
    category: 'sop', // sop, forms, systems, reports, policies, external
    tags: ['標籤1', '標籤2'],
    lastModified: '2024-01-01',
    addedBy: 'admin'
}
```

### 修改主題顏色
在 `config.js` 的 `ui.theme` 中修改：

```javascript
theme: {
    primary: '#667eea',      // 主色調
    primaryDark: '#5a67d8',  // 深色主色調
    secondary: '#764ba2',    // 次要色調
    success: '#22c55e',      // 成功顏色
    warning: '#f59e0b',      // 警告顏色
    error: '#ef4444'         // 錯誤顏色
}
```

### 調整權限設定
在 `config.js` 的 `permissions` 中修改角色權限：

```javascript
permissions: {
    employee: {
        level: 1,
        name: '一般員工',
        canView: ['public', 'internal'],
        canEdit: [],
        canManage: []
    }
    // ... 其他角色
}
```

## 🔍 搜尋功能

系統支援以下搜尋方式：
- **標題搜尋**: 在文件標題中搜尋關鍵字
- **描述搜尋**: 在文件描述中搜尋
- **標籤搜尋**: 根據文件標籤搜尋
- **模糊匹配**: 支援部分匹配和容錯

快捷鍵：
- `Enter`: 執行搜尋
- `Esc`: 清除搜尋

## 📱 響應式設計

系統針對不同裝置進行了優化：

### 電腦版 (≥768px)
- 側邊欄 + 主內容區域佈局
- 文件網格顯示（每行3-4個）
- 完整的搜尋和過濾功能

### 手機版 (<768px)
- 垂直堆疊佈局
- 單列文件顯示
- 優化的觸控體驗

## 🔄 數據同步

### 自動同步
- 每5分鐘檢查一次同步需求
- 網路恢復時自動同步
- 用戶活動時延長會話

### 手動同步
用戶可以隨時觸發手動同步：
```javascript
window.docApp.manualSync();
```

### 離線支援
- 本地數據緩存
- 離線時顯示緩存內容
- 同步佇列機制

## 📊 分析功能

系統會記錄以下活動：
- 用戶登入/登出
- 文件查看記錄
- 搜尋記錄
- 錯誤記錄

這些數據存儲在 Google Sheets 中，可用於：
- 使用統計分析
- 熱門文件排名
- 系統效能監控
- 安全審計

## 🛡️ 安全特性

### 會話管理
- 8小時會話超時
- 自動會話延長
- 安全登出

### 權限控制
- 基於角色的訪問控制
- 文件級別權限
- API端點保護

### 錯誤處理
- 全域錯誤捕獲
- 自動錯誤報告
- 優雅降級處理

## 🔧 維護說明

### 定期維護
建議定期執行以下維護任務：

1. **清理過期會話**：
   - 在 Google Apps Script 中執行 `autoCleanup()`
   - 或設定每日觸發器自動執行

2. **備份數據**：
   - 定期匯出 Google Sheets 數據
   - 下載系統配置備份

3. **更新文件**：
   - 檢查文件連結有效性
   - 更新過期文件信息

### 效能優化
- 定期清理舊的記錄數據
- 優化圖片和資源載入
- 監控 API 呼叫頻率

## 🐛 常見問題

### Q: 無法登入系統
A: 檢查以下項目：
- 確認帳號密碼正確
- 檢查網路連線
- 確認 Google Apps Script 端點配置正確

### Q: 文件無法開啟
A: 可能原因：
- 文件連結失效
- 權限不足
- 文件類型不支援

### Q: 搜尋功能異常
A: 嘗試以下解決方案：
- 清除瀏覽器緩存
- 重新整理頁面
- 檢查搜尋關鍵字是否正確

### Q: 同步失敗
A: 檢查項目：
- 網路連線狀態
- Google Apps Script 服務狀態
- API 端點配置

## 🤝 技術支援

如需技術支援，請提供以下信息：
- 瀏覽器類型和版本
- 錯誤訊息截圖
- 操作步驟重現
- 系統配置信息

## 📄 授權

本專案僅供內部使用，請勿未經授權進行商業用途。

---

*最後更新：2024年1月*
