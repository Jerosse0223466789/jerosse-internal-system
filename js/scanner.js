/**
 * 條碼掃描功能
 * 使用 HTML5 QR Code 庫實現條碼掃描
 */

class BarcodeScanner {
    constructor(app) {
        this.app = app;
        this.html5QrCode = null;
        this.isScanning = false;
        this.currentCamera = 0;
        this.cameras = [];
        this.scanTarget = null; // 掃描結果要填入的目標輸入框
        
        this.config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            disableFlip: false,
            videoConstraints: {
                facingMode: "environment" // 後置鏡頭
            }
        };

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.getCameras();
    }

    setupEventListeners() {
        // 開始掃描按鈕
        const startScanBtn = document.getElementById('startScanBtn');
        if (startScanBtn) {
            startScanBtn.addEventListener('click', () => {
                this.startScanning();
            });
        }

        // 停止掃描按鈕
        const stopScanBtn = document.getElementById('stopScanBtn');
        if (stopScanBtn) {
            stopScanBtn.addEventListener('click', () => {
                this.stopScanning();
            });
        }

        // 切換鏡頭按鈕
        const cameraSwitchBtn = document.getElementById('cameraSwitchBtn');
        if (cameraSwitchBtn) {
            cameraSwitchBtn.addEventListener('click', () => {
                this.switchCamera();
            });
        }

        // 手動輸入按鈕
        const manualInputBtn = document.getElementById('manualInputBtn');
        if (manualInputBtn) {
            manualInputBtn.addEventListener('click', () => {
                this.showManualInput();
            });
        }

        // 處理掃描結果按鈕
        const processResultBtn = document.getElementById('processResultBtn');
        if (processResultBtn) {
            processResultBtn.addEventListener('click', () => {
                this.processResult();
            });
        }

        // 重新掃描按鈕
        const scanAgainBtn = document.getElementById('scanAgainBtn');
        if (scanAgainBtn) {
            scanAgainBtn.addEventListener('click', () => {
                this.scanAgain();
            });
        }
    }

    async getCameras() {
        try {
            this.cameras = await Html5Qrcode.getCameras();
            console.log('可用鏡頭:', this.cameras);
            
            if (this.cameras.length === 0) {
                this.app.showMessage('未偵測到鏡頭', 'error');
                return;
            }

            // 隱藏切換鏡頭按鈕如果只有一個鏡頭
            const cameraSwitchBtn = document.getElementById('cameraSwitchBtn');
            if (this.cameras.length <= 1 && cameraSwitchBtn) {
                cameraSwitchBtn.style.display = 'none';
            }

        } catch (error) {
            console.error('獲取鏡頭列表失敗:', error);
            this.app.showMessage('無法存取鏡頭', 'error');
        }
    }

    async startScanning() {
        if (this.isScanning) return;

        try {
            // 請求鏡頭權限
            await navigator.mediaDevices.getUserMedia({ video: true });

            // 初始化掃描器
            if (!this.html5QrCode) {
                this.html5QrCode = new Html5Qrcode("qr-reader");
            }

            // 選擇要使用的鏡頭
            const cameraId = this.cameras.length > 0 ? 
                this.cameras[this.currentCamera].id : 
                { facingMode: "environment" };

            // 開始掃描
            await this.html5QrCode.start(
                cameraId,
                this.config,
                (decodedText, decodedResult) => {
                    this.onScanSuccess(decodedText, decodedResult);
                },
                (errorMessage) => {
                    // 掃描錯誤（通常是沒有偵測到條碼）
                    // console.log('掃描中...', errorMessage);
                }
            );

            this.isScanning = true;
            this.updateScannerUI();
            this.app.showMessage('開始掃描', 'success');

        } catch (error) {
            console.error('啟動掃描器失敗:', error);
            this.app.showMessage('無法啟動鏡頭', 'error');
        }
    }

    async stopScanning() {
        if (!this.isScanning || !this.html5QrCode) return;

        try {
            await this.html5QrCode.stop();
            this.isScanning = false;
            this.updateScannerUI();
            this.app.showMessage('已停止掃描', 'info');
        } catch (error) {
            console.error('停止掃描器失敗:', error);
        }
    }

    async switchCamera() {
        if (this.cameras.length <= 1) return;

        await this.stopScanning();
        
        this.currentCamera = (this.currentCamera + 1) % this.cameras.length;
        
        setTimeout(() => {
            this.startScanning();
        }, 500);
    }

    onScanSuccess(decodedText, decodedResult) {
        // 停止掃描
        this.stopScanning();
        
        // 振動回饋
        this.app.vibrate([200]);
        
        // 顯示掃描結果
        this.showScanResult(decodedText);
        
        // 如果是為特定輸入框掃描，直接填入
        if (this.scanTarget) {
            this.fillTargetInput(decodedText);
            this.scanTarget = null;
        }
    }

    showScanResult(result) {
        const scanResult = document.getElementById('scanResult');
        const resultContent = document.getElementById('resultContent');
        
        if (scanResult && resultContent) {
            resultContent.textContent = result;
            scanResult.classList.remove('hidden');
            
            // 嘗試解析掃描結果
            this.parseScanResult(result);
        }
    }

    parseScanResult(result) {
        // 嘗試識別條碼類型和內容
        let parsedInfo = '';
        
        // 檢查是否為產品條碼
        if (this.isProductBarcode(result)) {
            parsedInfo += '<div class="result-type">產品條碼</div>';
            // 可以在這裡查詢產品資訊
        }
        
        // 檢查是否為批號
        if (this.isBatchNumber(result)) {
            parsedInfo += '<div class="result-type">批號</div>';
        }
        
        // 檢查是否為位置碼
        if (this.isLocationCode(result)) {
            parsedInfo += '<div class="result-type">位置碼</div>';
        }
        
        if (parsedInfo) {
            const resultContent = document.getElementById('resultContent');
            resultContent.innerHTML = `<div class="scan-text">${result}</div>${parsedInfo}`;
        }
    }

    isProductBarcode(code) {
        // 檢查是否符合常見的產品條碼格式
        return /^\d{8,14}$/.test(code); // EAN-8, EAN-13, UPC等
    }

    isBatchNumber(code) {
        // 檢查是否符合批號格式（根據您的批號規則調整）
        return /^[A-Z]\d{3,6}$/.test(code);
    }

    isLocationCode(code) {
        // 檢查是否符合位置碼格式（如 X1Y1 格式）
        return /^X\d+Y\d+$/.test(code);
    }

    processResult() {
        const resultContent = document.getElementById('resultContent');
        const result = resultContent.textContent.trim();
        
        if (!result) return;

        // 根據掃描結果類型執行不同動作
        if (this.isProductBarcode(result)) {
            this.searchProduct(result);
        } else if (this.isBatchNumber(result)) {
            this.searchBatch(result);
        } else if (this.isLocationCode(result)) {
            this.navigateToLocation(result);
        } else {
            // 通用處理
            this.showProductOptions(result);
        }
    }

    async searchProduct(barcode) {
        try {
            const product = await this.app.apiCall('getProductByBarcode', { barcode });
            
            if (product) {
                this.fillProductInfo(product);
                this.app.showMessage('找到產品資訊', 'success');
            } else {
                this.app.showMessage('未找到對應產品', 'warning');
            }
        } catch (error) {
            console.error('查詢產品失敗:', error);
            this.app.showMessage('查詢失敗', 'error');
        }
    }

    async searchBatch(batchNumber) {
        try {
            const batch = await this.app.apiCall('getBatchInfo', { batchNumber });
            
            if (batch) {
                this.showBatchInfo(batch);
                this.app.showMessage('找到批號資訊', 'success');
            } else {
                this.app.showMessage('未找到對應批號', 'warning');
            }
        } catch (error) {
            console.error('查詢批號失敗:', error);
            this.app.showMessage('查詢失敗', 'error');
        }
    }

    navigateToLocation(locationCode) {
        // 跳轉到平面圖並高亮顯示位置
        this.app.navigateTo('floorplan');
        
        // 發送位置高亮事件
        setTimeout(() => {
            const event = new CustomEvent('highlightLocation', { 
                detail: { location: locationCode } 
            });
            document.dispatchEvent(event);
        }, 500);
        
        this.app.showMessage(`導航到 ${locationCode}`, 'info');
    }

    fillProductInfo(product) {
        // 自動填入產品資訊到盤點表單
        const categorySelect = document.getElementById('categorySelect');
        const itemSelect = document.getElementById('itemSelect');
        
        if (categorySelect && product.category) {
            categorySelect.value = product.category;
            categorySelect.dispatchEvent(new Event('change'));
        }
        
        setTimeout(() => {
            if (itemSelect && product.name) {
                itemSelect.value = product.name;
            }
        }, 500);
        
        // 跳轉到盤點頁面
        this.app.navigateTo('inventory');
    }

    showBatchInfo(batch) {
        this.app.showModal('批號資訊', `
            <div class="batch-info">
                <p><strong>批號:</strong> ${batch.number}</p>
                <p><strong>產品:</strong> ${batch.product}</p>
                <p><strong>效期:</strong> ${batch.expiry}</p>
                <p><strong>庫存:</strong> ${batch.quantity}</p>
                <p><strong>位置:</strong> ${batch.location}</p>
            </div>
        `, [
            {
                text: '關閉',
                class: 'btn-secondary',
                onClick: () => this.app.hideModal()
            },
            {
                text: '編輯',
                class: 'btn-primary',
                onClick: () => {
                    this.app.hideModal();
                    this.app.navigateTo('batch');
                }
            }
        ]);
    }

    showProductOptions(result) {
        this.app.showModal('掃描結果', `
            <div class="scan-options">
                <p>掃描到: <strong>${result}</strong></p>
                <p>請選擇要執行的動作:</p>
            </div>
        `, [
            {
                text: '搜尋產品',
                class: 'btn-primary',
                onClick: () => {
                    this.app.hideModal();
                    this.searchProduct(result);
                }
            },
            {
                text: '填入盤點',
                class: 'btn-secondary',
                onClick: () => {
                    this.app.hideModal();
                    this.fillInventoryForm(result);
                }
            },
            {
                text: '取消',
                class: 'btn-secondary',
                onClick: () => this.app.hideModal()
            }
        ]);
    }

    fillInventoryForm(value) {
        // 嘗試填入盤點表單的品項欄位
        const itemSelect = document.getElementById('itemSelect');
        if (itemSelect) {
            // 如果是下拉選單，嘗試找到匹配的選項
            const options = itemSelect.querySelectorAll('option');
            for (let option of options) {
                if (option.value === value || option.textContent.includes(value)) {
                    itemSelect.value = option.value;
                    break;
                }
            }
        }
        
        this.app.navigateTo('inventory');
    }

    scanAgain() {
        this.hideScanResult();
        this.startScanning();
    }

    hideScanResult() {
        const scanResult = document.getElementById('scanResult');
        if (scanResult) {
            scanResult.classList.add('hidden');
        }
    }

    updateScannerUI() {
        const startBtn = document.getElementById('startScanBtn');
        const stopBtn = document.getElementById('stopScanBtn');
        
        if (this.isScanning) {
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
        } else {
            startBtn.classList.remove('hidden');
            stopBtn.classList.add('hidden');
        }
    }

    showManualInput() {
        this.app.showModal('手動輸入', `
            <div class="manual-input">
                <div class="form-group">
                    <label>條碼/批號</label>
                    <input type="text" id="manualCode" class="form-control" placeholder="請輸入條碼或批號">
                </div>
            </div>
        `, [
            {
                text: '確定',
                class: 'btn-primary',
                onClick: () => {
                    const code = document.getElementById('manualCode').value.trim();
                    if (code) {
                        this.onScanSuccess(code, null);
                        this.app.hideModal();
                    }
                }
            },
            {
                text: '取消',
                class: 'btn-secondary',
                onClick: () => this.app.hideModal()
            }
        ]);
        
        // 聚焦到輸入框
        setTimeout(() => {
            const input = document.getElementById('manualCode');
            if (input) input.focus();
        }, 100);
    }

    // 為特定輸入框掃描
    startScanForInput(targetInputId) {
        this.scanTarget = targetInputId;
        this.app.navigateTo('barcode');
        
        setTimeout(() => {
            this.startScanning();
        }, 500);
    }

    fillTargetInput(value) {
        const targetElement = document.getElementById(this.scanTarget);
        
        if (targetElement) {
            if (targetElement.tagName === 'SELECT') {
                // 下拉選單：嘗試找到匹配的選項
                const options = targetElement.querySelectorAll('option');
                for (let option of options) {
                    if (option.value === value || option.textContent.includes(value)) {
                        targetElement.value = option.value;
                        targetElement.dispatchEvent(new Event('change'));
                        break;
                    }
                }
            } else {
                // 一般輸入框
                targetElement.value = value;
                targetElement.dispatchEvent(new Event('input'));
            }
            
            this.app.showMessage('已填入掃描結果', 'success');
            
            // 返回原頁面
            setTimeout(() => {
                this.app.navigateTo(this.app.currentPage);
            }, 1000);
        }
    }

    // 清理方法
    async cleanup() {
        if (this.isScanning && this.html5QrCode) {
            await this.stopScanning();
        }
    }
}

// 當應用程式初始化時創建掃描器實例
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.warehouseApp) {
            window.warehouseApp.scanner = new BarcodeScanner(window.warehouseApp);
            
            // 添加快速掃描方法到主應用程式
            window.warehouseApp.startScanner = () => {
                window.warehouseApp.scanner.startScanning();
            };
            
            window.warehouseApp.startScanForInput = (targetId) => {
                window.warehouseApp.scanner.startScanForInput(targetId);
            };

            window.warehouseApp.initializeScanner = () => {
                // 頁面初始化時隱藏掃描結果
                window.warehouseApp.scanner.hideScanResult();
            };
        }
    }, 1000);
});

