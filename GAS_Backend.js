/**
 * 公司文件管理系統 - Google Apps Script 後端
 * 支援用戶認證、文件管理、權限控制、活動記錄
 */

// ==================== 配置設定 ====================
const CONFIG = {
  // Google Sheets 設定
  SPREADSHEET_ID: '', // 請填入您的 Google Sheets ID
  
  // 工作表名稱
  SHEETS: {
    USERS: '用戶管理',
    DOCUMENTS: '文件管理',
    CATEGORIES: '分類設定',
    ACCESS_LOGS: '訪問記錄',
    ERROR_LOGS: '錯誤記錄',
    USER_SESSIONS: '用戶會話',
    SYSTEM_CONFIG: '系統配置'
  },
  
  // 權限等級
  PERMISSIONS: {
    GUEST: 'guest',
    EMPLOYEE: 'employee',
    MANAGER: 'manager',
    ADMIN: 'admin'
  },
  
  // 會話設定
  SESSION: {
    TIMEOUT: 8 * 60 * 60 * 1000, // 8小時
    CLEANUP_INTERVAL: 24 * 60 * 60 * 1000 // 24小時清理一次過期會話
  },
  
  // 允許的來源域名 (CORS)
  ALLOWED_ORIGINS: [
    'https://your-domain.com',
    'http://localhost:3000',
    'https://127.0.0.1:3000'
  ]
};

// ==================== 主要 Web App 處理函數 ====================
function doPost(e) {
  try {
    // 設定 CORS 標頭
    const response = {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Content-Type': 'application/json'
      }
    };
    
    // 解析請求資料
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const data = requestData.data || {};
    const timestamp = new Date().toISOString();
    
    // 記錄 API 呼叫
    logAPICall(action, data, timestamp);
    
    let result;
    
    // 根據動作類型處理請求
    switch(action) {
      // 認證相關
      case 'authenticate':
        result = authenticateUser(data);
        break;
        
      case 'validateSession':
        result = validateSession(data);
        break;
        
      case 'logout':
        result = logoutUser(data);
        break;
        
      // 文件管理
      case 'getDocuments':
        result = getDocuments(data);
        break;
        
      case 'addDocument':
        result = addDocument(data);
        break;
        
      case 'updateDocument':
        result = updateDocument(data);
        break;
        
      case 'deleteDocument':
        result = deleteDocument(data);
        break;
        
      // 用戶管理
      case 'getUserData':
        result = getUserData(data);
        break;
        
      case 'updateUserData':
        result = updateUserData(data);
        break;
        
      case 'getAllUsers':
        result = getAllUsers(data);
        break;
        
      // 分析記錄
      case 'logActivity':
        result = logUserActivity(data);
        break;
        
      case 'logError':
        result = logError(data);
        break;
        
      // 系統管理
      case 'getSystemStats':
        result = getSystemStats();
        break;
        
      case 'cleanupOldData':
        result = cleanupOldData();
        break;
        
      default:
        throw new Error(`未知的動作類型: ${action}`);
    }
    
    // 返回成功結果
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        data: result,
        timestamp: timestamp,
        message: '操作成功完成'
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // 錯誤處理
    console.error('API 錯誤:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== 用戶認證功能 ====================

// 用戶認證
function authenticateUser(data) {
  const { username, password } = data;
  
  if (!username || !password) {
    throw new Error('缺少用戶名或密碼');
  }
  
  const userSheet = getOrCreateSheet(CONFIG.SHEETS.USERS);
  
  // 初始化用戶表（如果為空）
  if (userSheet.getLastRow() === 0) {
    initializeUserSheet(userSheet);
  }
  
  // 查找用戶
  const users = getUsersFromSheet(userSheet);
  const user = users.find(u => u.username === username && u.password === password && u.status === 'active');
  
  if (!user) {
    logUserActivity({
      action: 'login_failed',
      username: username,
      timestamp: new Date().toISOString(),
      ip: 'N/A'
    });
    throw new Error('用戶名或密碼錯誤');
  }
  
  // 創建會話
  const sessionId = createUserSession(user);
  
  // 更新最後登入時間
  updateUserLastLogin(user.username);
  
  // 記錄登入
  logUserActivity({
    action: 'login_success',
    username: username,
    sessionId: sessionId,
    timestamp: new Date().toISOString(),
    ip: 'N/A'
  });
  
  return {
    user: {
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      permissions: getPermissionsByRole(user.role)
    },
    sessionId: sessionId,
    expiresAt: Date.now() + CONFIG.SESSION.TIMEOUT
  };
}

// 驗證會話
function validateSession(data) {
  const { sessionId, username } = data;
  
  if (!sessionId || !username) {
    return { valid: false, reason: '缺少會話信息' };
  }
  
  const sessionSheet = getOrCreateSheet(CONFIG.SHEETS.USER_SESSIONS);
  
  // 查找會話
  const sessions = getSessionsFromSheet(sessionSheet);
  const session = sessions.find(s => s.sessionId === sessionId && s.username === username);
  
  if (!session) {
    return { valid: false, reason: '會話不存在' };
  }
  
  // 檢查會話是否過期
  const now = Date.now();
  if (session.expiresAt < now) {
    // 刪除過期會話
    deleteSession(sessionId);
    return { valid: false, reason: '會話已過期' };
  }
  
  // 延長會話
  extendSession(sessionId);
  
  return {
    valid: true,
    user: session.user,
    expiresAt: now + CONFIG.SESSION.TIMEOUT
  };
}

// 用戶登出
function logoutUser(data) {
  const { sessionId, username } = data;
  
  if (sessionId) {
    deleteSession(sessionId);
  }
  
  // 記錄登出
  logUserActivity({
    action: 'logout',
    username: username,
    sessionId: sessionId,
    timestamp: new Date().toISOString()
  });
  
  return { success: true };
}

// ==================== 文件管理功能 ====================

// 獲取文件列表
function getDocuments(data) {
  const { category, permission, lastSync } = data;
  
  const docSheet = getOrCreateSheet(CONFIG.SHEETS.DOCUMENTS);
  
  // 初始化文件表（如果為空）
  if (docSheet.getLastRow() === 0) {
    initializeDocumentSheet(docSheet);
    return { documents: [], total: 0 };
  }
  
  // 獲取所有文件
  let documents = getDocumentsFromSheet(docSheet);
  
  // 過濾條件
  if (category && category !== 'all') {
    documents = documents.filter(doc => doc.category === category);
  }
  
  if (permission) {
    documents = documents.filter(doc => hasDocumentPermission(doc, permission));
  }
  
  if (lastSync) {
    const syncDate = new Date(lastSync);
    documents = documents.filter(doc => new Date(doc.lastModified) > syncDate);
  }
  
  return {
    documents: documents,
    total: documents.length,
    timestamp: new Date().toISOString()
  };
}

// 添加文件
function addDocument(data) {
  const docSheet = getOrCreateSheet(CONFIG.SHEETS.DOCUMENTS);
  
  // 驗證必要欄位
  if (!data.title || !data.url || !data.category) {
    throw new Error('缺少必要的文件信息');
  }
  
  // 生成文件ID
  const docId = 'doc-' + Utilities.getUuid().substring(0, 8);
  
  const newDoc = {
    id: docId,
    title: data.title,
    description: data.description || '',
    type: data.type || 'url',
    url: data.url,
    category: data.category,
    permission: data.permission || 'internal',
    tags: data.tags || [],
    addedBy: data.addedBy || 'system',
    lastModified: new Date().toISOString(),
    status: 'active'
  };
  
  // 添加到工作表
  const rowData = [
    newDoc.id,
    newDoc.title,
    newDoc.description,
    newDoc.type,
    newDoc.url,
    newDoc.category,
    newDoc.permission,
    Array.isArray(newDoc.tags) ? newDoc.tags.join(', ') : newDoc.tags,
    newDoc.addedBy,
    newDoc.lastModified,
    newDoc.status
  ];
  
  docSheet.appendRow(rowData);
  
  // 記錄活動
  logUserActivity({
    action: 'document_added',
    docId: docId,
    title: newDoc.title,
    addedBy: newDoc.addedBy,
    timestamp: newDoc.lastModified
  });
  
  return newDoc;
}

// 更新文件
function updateDocument(data) {
  const { docId, updates, updatedBy } = data;
  
  if (!docId) {
    throw new Error('缺少文件ID');
  }
  
  const docSheet = getOrCreateSheet(CONFIG.SHEETS.DOCUMENTS);
  const rows = docSheet.getDataRange().getValues();
  
  // 找到文件行
  let targetRow = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === docId) {
      targetRow = i + 1;
      break;
    }
  }
  
  if (targetRow === -1) {
    throw new Error('文件不存在');
  }
  
  // 更新文件信息
  const headers = rows[0];
  const currentData = rows[targetRow - 1];
  
  headers.forEach((header, index) => {
    if (updates.hasOwnProperty(header) && header !== 'id') {
      currentData[index] = updates[header];
    }
  });
  
  // 更新最後修改時間
  const lastModifiedIndex = headers.indexOf('lastModified');
  if (lastModifiedIndex !== -1) {
    currentData[lastModifiedIndex] = new Date().toISOString();
  }
  
  // 寫回工作表
  docSheet.getRange(targetRow, 1, 1, currentData.length).setValues([currentData]);
  
  // 記錄活動
  logUserActivity({
    action: 'document_updated',
    docId: docId,
    updates: updates,
    updatedBy: updatedBy,
    timestamp: new Date().toISOString()
  });
  
  return { success: true, docId: docId };
}

// 刪除文件
function deleteDocument(data) {
  const { docId, deletedBy } = data;
  
  if (!docId) {
    throw new Error('缺少文件ID');
  }
  
  // 軟刪除：將狀態設為 'deleted'
  const result = updateDocument({
    docId: docId,
    updates: { status: 'deleted' },
    updatedBy: deletedBy
  });
  
  // 記錄活動
  logUserActivity({
    action: 'document_deleted',
    docId: docId,
    deletedBy: deletedBy,
    timestamp: new Date().toISOString()
  });
  
  return result;
}

// ==================== 會話管理 ====================

// 創建用戶會話
function createUserSession(user) {
  const sessionId = 'sess_' + Utilities.getUuid();
  const sessionSheet = getOrCreateSheet(CONFIG.SHEETS.USER_SESSIONS);
  
  // 初始化會話表
  if (sessionSheet.getLastRow() === 0) {
    const headers = ['sessionId', 'username', 'name', 'role', 'createdAt', 'expiresAt', 'lastActivity'];
    sessionSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  const now = Date.now();
  const expiresAt = now + CONFIG.SESSION.TIMEOUT;
  
  const sessionData = [
    sessionId,
    user.username,
    user.name,
    user.role,
    new Date(now).toISOString(),
    new Date(expiresAt).toISOString(),
    new Date(now).toISOString()
  ];
  
  sessionSheet.appendRow(sessionData);
  
  return sessionId;
}

// 延長會話
function extendSession(sessionId) {
  const sessionSheet = getOrCreateSheet(CONFIG.SHEETS.USER_SESSIONS);
  const rows = sessionSheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === sessionId) {
      const now = Date.now();
      const newExpiresAt = now + CONFIG.SESSION.TIMEOUT;
      
      sessionSheet.getRange(i + 1, 6).setValue(new Date(newExpiresAt).toISOString());
      sessionSheet.getRange(i + 1, 7).setValue(new Date(now).toISOString());
      break;
    }
  }
}

// 刪除會話
function deleteSession(sessionId) {
  const sessionSheet = getOrCreateSheet(CONFIG.SHEETS.USER_SESSIONS);
  const rows = sessionSheet.getDataRange().getValues();
  
  for (let i = rows.length - 1; i >= 1; i--) {
    if (rows[i][0] === sessionId) {
      sessionSheet.deleteRow(i + 1);
      break;
    }
  }
}

// ==================== 活動記錄 ====================

// 記錄用戶活動
function logUserActivity(data) {
  const logSheet = getOrCreateSheet(CONFIG.SHEETS.ACCESS_LOGS);
  
  // 初始化記錄表
  if (logSheet.getLastRow() === 0) {
    const headers = ['timestamp', 'action', 'username', 'sessionId', 'details', 'ip', 'userAgent'];
    logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  const logData = [
    data.timestamp || new Date().toISOString(),
    data.action || '',
    data.username || '',
    data.sessionId || '',
    JSON.stringify(data),
    data.ip || 'N/A',
    data.userAgent || 'N/A'
  ];
  
  logSheet.appendRow(logData);
  
  // 保持最近1000筆記錄
  if (logSheet.getLastRow() > 1001) {
    logSheet.deleteRows(2, logSheet.getLastRow() - 1001);
  }
  
  return { success: true };
}

// 記錄錯誤
function logError(data) {
  const errorSheet = getOrCreateSheet(CONFIG.SHEETS.ERROR_LOGS);
  
  // 初始化錯誤記錄表
  if (errorSheet.getLastRow() === 0) {
    const headers = ['timestamp', 'type', 'message', 'stack', 'user', 'url', 'userAgent'];
    errorSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  
  const errorData = [
    data.timestamp || new Date().toISOString(),
    data.type || 'unknown',
    data.message || '',
    data.stack || '',
    data.user || 'anonymous',
    data.url || '',
    data.userAgent || ''
  ];
  
  errorSheet.appendRow(errorData);
  
  return { success: true };
}

// ==================== 輔助函數 ====================

// 獲取或創建工作表
function getOrCreateSheet(sheetName) {
  let spreadsheet;
  
  if (CONFIG.SPREADSHEET_ID) {
    spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  } else {
    // 如果沒有指定 ID，創建新的試算表
    spreadsheet = SpreadsheetApp.create('公司文件管理系統_資料庫');
    console.log('新建試算表 ID:', spreadsheet.getId());
  }
  
  let sheet = spreadsheet.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }
  
  return sheet;
}

// 初始化用戶表
function initializeUserSheet(sheet) {
  const headers = ['username', 'password', 'name', 'email', 'role', 'department', 'status', 'createdAt', 'lastLogin'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // 添加預設管理員帳號
  const defaultUsers = [
    ['admin', 'admin123', '系統管理員', 'admin@company.com', 'admin', 'IT部門', 'active', new Date().toISOString(), ''],
    ['manager', 'manager123', '部門主管', 'manager@company.com', 'manager', '營運部門', 'active', new Date().toISOString(), ''],
    ['employee', 'emp123', '一般員工', 'employee@company.com', 'employee', '倉儲部門', 'active', new Date().toISOString(), '']
  ];
  
  sheet.getRange(2, 1, defaultUsers.length, headers.length).setValues(defaultUsers);
}

// 初始化文件表
function initializeDocumentSheet(sheet) {
  const headers = ['id', 'title', 'description', 'type', 'url', 'category', 'permission', 'tags', 'addedBy', 'lastModified', 'status'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

// 從工作表獲取用戶
function getUsersFromSheet(sheet) {
  if (sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const user = {};
    headers.forEach((header, index) => {
      user[header] = row[index];
    });
    return user;
  });
}

// 從工作表獲取文件
function getDocumentsFromSheet(sheet) {
  if (sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.filter(row => row[10] === 'active').map(row => {
    const doc = {};
    headers.forEach((header, index) => {
      if (header === 'tags' && typeof row[index] === 'string') {
        doc[header] = row[index].split(', ').filter(tag => tag.trim());
      } else {
        doc[header] = row[index];
      }
    });
    return doc;
  });
}

// 從工作表獲取會話
function getSessionsFromSheet(sheet) {
  if (sheet.getLastRow() <= 1) return [];
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const session = {};
    headers.forEach((header, index) => {
      if (header === 'expiresAt' || header === 'createdAt' || header === 'lastActivity') {
        session[header] = new Date(row[index]).getTime();
      } else {
        session[header] = row[index];
      }
    });
    return session;
  });
}

// 根據角色獲取權限
function getPermissionsByRole(role) {
  const permissions = {
    guest: { level: 0, name: '訪客', canView: ['public'], canEdit: [], canManage: [] },
    employee: { level: 1, name: '一般員工', canView: ['public', 'internal'], canEdit: [], canManage: [] },
    manager: { level: 2, name: '主管', canView: ['public', 'internal', 'management'], canEdit: ['internal'], canManage: [] },
    admin: { level: 3, name: '系統管理員', canView: ['public', 'internal', 'management', 'admin'], canEdit: ['public', 'internal', 'management'], canManage: ['users', 'categories', 'system'] }
  };
  
  return permissions[role] || permissions.guest;
}

// 檢查文件權限
function hasDocumentPermission(document, userRole) {
  const userPermissions = getPermissionsByRole(userRole);
  return userPermissions.canView.includes(document.permission || 'public');
}

// 更新用戶最後登入時間
function updateUserLastLogin(username) {
  const userSheet = getOrCreateSheet(CONFIG.SHEETS.USERS);
  const rows = userSheet.getDataRange().getValues();
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === username) {
      userSheet.getRange(i + 1, 9).setValue(new Date().toISOString());
      break;
    }
  }
}

// 記錄API呼叫
function logAPICall(action, data, timestamp) {
  try {
    const logSheet = getOrCreateSheet('API_LOGS');
    
    if (logSheet.getLastRow() === 0) {
      const headers = ['timestamp', 'action', 'dataSize', 'status'];
      logSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    
    const logData = [
      timestamp,
      action,
      JSON.stringify(data).length,
      'success'
    ];
    
    logSheet.appendRow(logData);
    
    // 保持最近500筆記錄
    if (logSheet.getLastRow() > 501) {
      logSheet.deleteRows(2, logSheet.getLastRow() - 501);
    }
    
  } catch (error) {
    console.error('記錄API呼叫失敗:', error);
  }
}

// 獲取系統統計
function getSystemStats() {
  const stats = {
    timestamp: new Date().toISOString(),
    users: {
      total: 0,
      active: 0,
      admins: 0
    },
    documents: {
      total: 0,
      byCategory: {},
      byPermission: {}
    },
    sessions: {
      active: 0,
      total: 0
    },
    system: {
      version: '1.0.0',
      uptime: 'N/A'
    }
  };
  
  try {
    // 用戶統計
    const userSheet = getOrCreateSheet(CONFIG.SHEETS.USERS);
    if (userSheet.getLastRow() > 1) {
      const users = getUsersFromSheet(userSheet);
      stats.users.total = users.length;
      stats.users.active = users.filter(u => u.status === 'active').length;
      stats.users.admins = users.filter(u => u.role === 'admin').length;
    }
    
    // 文件統計
    const docSheet = getOrCreateSheet(CONFIG.SHEETS.DOCUMENTS);
    if (docSheet.getLastRow() > 1) {
      const documents = getDocumentsFromSheet(docSheet);
      stats.documents.total = documents.length;
      
      // 按分類統計
      documents.forEach(doc => {
        stats.documents.byCategory[doc.category] = (stats.documents.byCategory[doc.category] || 0) + 1;
        stats.documents.byPermission[doc.permission] = (stats.documents.byPermission[doc.permission] || 0) + 1;
      });
    }
    
    // 會話統計
    const sessionSheet = getOrCreateSheet(CONFIG.SHEETS.USER_SESSIONS);
    if (sessionSheet.getLastRow() > 1) {
      const sessions = getSessionsFromSheet(sessionSheet);
      const now = Date.now();
      stats.sessions.total = sessions.length;
      stats.sessions.active = sessions.filter(s => s.expiresAt > now).length;
    }
    
  } catch (error) {
    console.error('獲取統計失敗:', error);
  }
  
  return stats;
}

// 清理舊數據
function cleanupOldData() {
  const results = {
    expiredSessions: 0,
    oldLogs: 0,
    errors: []
  };
  
  try {
    // 清理過期會話
    const sessionSheet = getOrCreateSheet(CONFIG.SHEETS.USER_SESSIONS);
    if (sessionSheet.getLastRow() > 1) {
      const rows = sessionSheet.getDataRange().getValues();
      const now = Date.now();
      
      for (let i = rows.length - 1; i >= 1; i--) {
        const expiresAt = new Date(rows[i][5]).getTime();
        if (expiresAt < now) {
          sessionSheet.deleteRow(i + 1);
          results.expiredSessions++;
        }
      }
    }
    
    // 清理舊的活動記錄（保留最近30天）
    const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const logSheet = getOrCreateSheet(CONFIG.SHEETS.ACCESS_LOGS);
    
    if (logSheet.getLastRow() > 1000) {
      const deleteCount = logSheet.getLastRow() - 1000;
      logSheet.deleteRows(2, deleteCount);
      results.oldLogs = deleteCount;
    }
    
  } catch (error) {
    results.errors.push(error.message);
  }
  
  return results;
}

// ==================== 定時任務 ====================

// 自動清理定時任務（需手動觸發或設定觸發器）
function autoCleanup() {
  console.log('開始自動清理...');
  const results = cleanupOldData();
  console.log('清理結果:', results);
  return results;
}

// ==================== 測試函數 ====================
function testAPI() {
  const testData = {
    action: 'authenticate',
    data: {
      username: 'admin',
      password: 'admin123'
    }
  };
  
  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(e);
  console.log('測試結果:', result.getContent());
  
  return result;
}
