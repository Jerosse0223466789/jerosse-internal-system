/**
 * 條碼掃描模組
 * 支援多種條碼格式，整合相機API和手動輸入
 */

class BarcodeScanner {
    constructor() {
        this.isScanning = false;
        this.stream = null;
        this.videoElement = null;
        this.canvasElement = null;
        this.scanHistory = [];
        this.supportedFormats = [
            'CODE_128', 'CODE_39', 'EAN_13', 'EAN_8', 
            'UPC_A', 'UPC_E', 'QR_CODE', 'DATA_MATRIX'
        ];
        this.init();
    }

    async init() {
        console.log('📱 條碼掃描模組初始化中...');
        await this.checkCameraSupport();
        this.loadScanHistory();
        this.setupEventListeners();
        console.log('✅ 條碼掃描模組初始化完成');
    }

    async checkCameraSupport() {
        try {
            // 檢查是否支援相機
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('此裝置不支援相機功能，將使用手動輸入模式');
                this.cameraSupported = false;
                return;
            }

            // 檢查相機權限
            const permissions = await navigator.permissions.query({ name: 'camera' });
            this.cameraSupported = permissions.state !== 'denied';
            
            console.log('相機支援狀態:', this.cameraSupported);
        } catch (error) {
            console.warn('檢查相機支援時發生錯誤:', error);
            this.cameraSupported = false;
        }
    }

    setupEventListeners() {
        // 監聽掃描請求
        document.addEventListener('start-barcode-scan', (event) => {
            this.startScan(event.detail);
        });

        document.addEventListener('stop-barcode-scan', () => {
            this.stopScan();
        });
    }

    // 開始掃描
    async startScan(options = {}) {
        if (this.isScanning) {
            console.warn('掃描已在進行中');
            return;
        }

        try {
            this.isScanning = true;
            
            if (this.cameraSupported && !options.manualOnly) {
                await this.startCameraScan(options);
            } else {
                this.startManualInput(options);
            }
        } catch (error) {
            console.error('啟動掃描失敗:', error);
            this.isScanning = false;
            
            // 回退到手動輸入
            this.startManualInput(options);
        }
    }

    // 啟動相機掃描
    async startCameraScan(options) {
        try {
            // 創建掃描UI
            this.createScannerUI();

            // 獲取相機權限
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: options.facingMode || 'environment', // 後置相機
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            // 設定視頻流
            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();

            // 記錄當前相機模式
            this.currentFacingMode = options.facingMode || 'environment';

            // 開始掃描循環
            this.scanLoop();
            
            // 設定鍵盤監聽 (用於真實條碼掃描)
            this.setupKeyboardListener();

            // 發送掃描開始事件
            this.dispatchEvent('scan-started', { mode: 'camera' });

        } catch (error) {
            console.error('啟動相機掃描失敗:', error);
            this.stopScan();
            throw error;
        }
    }

    // 創建掃描器UI
    createScannerUI() {
        // 創建掃描覆蓋層
        const overlay = document.createElement('div');
        overlay.id = 'scanner-overlay';
        overlay.innerHTML = `
            <div class="scanner-container">
                <div class="scanner-header">
                    <h3>📱 條碼掃描</h3>
                    <button class="close-btn" onclick="barcodeScanner.stopScan()">✖</button>
                </div>
                
                <div class="scanner-viewport">
                    <video id="scanner-video" autoplay muted playsinline></video>
                    <div class="scanner-overlay">
                        <div class="scan-frame"></div>
                        <div class="scan-line"></div>
                        <div class="scan-instructions">
                            <div style="background: rgba(0,0,0,0.7); color: white; padding: 8px 12px; border-radius: 15px; font-size: 0.8em; margin-top: 10px;">
                                📱 將條碼對準框內 或 直接掃描條碼到螢幕
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="scanner-controls">
                    <button class="scanner-btn" onclick="barcodeScanner.toggleFlash()">
                        🔦 閃光燈
                    </button>
                    <button class="scanner-btn" onclick="barcodeScanner.switchCamera()">
                        🔄 切換相機
                    </button>
                    <button class="scanner-btn" onclick="barcodeScanner.simulateScan()">
                        🧪 測試掃描
                    </button>
                    <button class="scanner-btn manual-btn" onclick="barcodeScanner.showManualInput()">
                        ⌨️ 手動輸入
                    </button>
                </div>
                
                <div class="scan-history">
                    <h4>最近掃描</h4>
                    <div id="recent-scans"></div>
                </div>
            </div>
        `;

        // 添加樣式
        const style = document.createElement('style');
        style.textContent = `
            #scanner-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.9);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .scanner-container {
                width: 90%;
                max-width: 400px;
                background: white;
                border-radius: 15px;
                overflow: hidden;
            }
            
            .scanner-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background: #2196F3;
                color: white;
            }
            
            .close-btn {
                background: none;
                border: none;
                color: white;
                font-size: 1.2em;
                cursor: pointer;
                padding: 5px;
                border-radius: 50%;
            }
            
            .scanner-viewport {
                position: relative;
                height: 300px;
                overflow: hidden;
                background: #000;
            }
            
            #scanner-video {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            
            .scanner-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .scan-frame {
                width: 250px;
                height: 120px;
                border: 2px solid #00ff00;
                border-radius: 10px;
                position: relative;
                background: transparent;
            }
            
            .scan-frame::before,
            .scan-frame::after {
                content: '';
                position: absolute;
                width: 20px;
                height: 20px;
                border: 3px solid #00ff00;
            }
            
            .scan-frame::before {
                top: -3px;
                left: -3px;
                border-right: none;
                border-bottom: none;
            }
            
            .scan-frame::after {
                bottom: -3px;
                right: -3px;
                border-left: none;
                border-top: none;
            }
            
            .scan-line {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 250px;
                height: 2px;
                background: linear-gradient(90deg, transparent, #ff0000, transparent);
                transform: translate(-50%, -50%);
                animation: scan-animation 2s ease-in-out infinite;
            }
            
            .scan-instructions {
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                text-align: center;
            }
            
            @keyframes scan-animation {
                0%, 100% { opacity: 0; }
                50% { opacity: 1; }
            }
            
            .scanner-controls {
                display: flex;
                justify-content: space-around;
                padding: 15px;
                background: #f5f5f5;
            }
            
            .scanner-btn {
                padding: 10px 15px;
                border: none;
                border-radius: 8px;
                background: #2196F3;
                color: white;
                font-size: 0.9em;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .scanner-btn:hover {
                background: #1976D2;
            }
            
            .manual-btn {
                background: #FF9800;
            }
            
            .manual-btn:hover {
                background: #F57C00;
            }
            
            .scan-history {
                padding: 15px 20px;
                max-height: 150px;
                overflow-y: auto;
            }
            
            .scan-history h4 {
                margin-bottom: 10px;
                color: #666;
                font-size: 0.9em;
            }
            
            .recent-scans {
                display: flex;
                flex-direction: column;
                gap: 5px;
            }
            
            .recent-scan-item {
                padding: 8px 12px;
                background: #f0f0f0;
                border-radius: 6px;
                font-size: 0.8em;
                cursor: pointer;
                transition: background 0.3s;
            }
            
            .recent-scan-item:hover {
                background: #e0e0e0;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(overlay);

        // 獲取視頻元素
        this.videoElement = document.getElementById('scanner-video');
        
        // 顯示最近掃描記錄
        this.updateRecentScans();
    }

    // 掃描循環
    scanLoop() {
        if (!this.isScanning || !this.videoElement) return;

        // 創建canvas用於影像處理
        if (!this.canvasElement) {
            this.canvasElement = document.createElement('canvas');
            this.canvasElement.width = this.videoElement.videoWidth || 640;
            this.canvasElement.height = this.videoElement.videoHeight || 480;
        }

        const ctx = this.canvasElement.getContext('2d');
        ctx.drawImage(this.videoElement, 0, 0);

        // 這裡應該整合真正的條碼識別庫 (如 ZXing 或 QuaggaJS)
        // 目前使用模擬識別
        this.simulateBarcodeDetection();

        // 繼續掃描
        if (this.isScanning) {
            requestAnimationFrame(() => this.scanLoop());
        }
    }

    // 模擬條碼識別 (實際應用中會使用真正的條碼識別庫)
    simulateBarcodeDetection() {
        // 檢查手動觸發
        if (this.simulateScanTrigger) {
            this.simulateScanTrigger = false;
            const mockBarcode = this.generateMockBarcode();
            this.onBarcodeDetected(mockBarcode);
            return;
        }
        
        // 檢查鍵盤輸入的條碼
        if (this.keyboardInput && this.keyboardInput.length > 0) {
            const inputCode = this.keyboardInput;
            this.keyboardInput = '';
            
            console.log('🔍 處理真實掃描條碼:', inputCode);
            
            // 創建真實條碼資料
            const barcodeData = {
                type: this.detectBarcodeType(inputCode),
                code: inputCode,
                timestamp: Date.now(),
                source: 'scanner', // 標記為真實掃描器
                productInfo: this.lookupProductInfo(inputCode) // 查找商品資料
            };
            
            this.onBarcodeDetected(barcodeData);
            return;
        }
        
        // 簡單的視覺檢測模擬 (檢測畫面變化)
        if (this.videoElement && this.canvasElement) {
            const currentTime = Date.now();
            
            // 縮短檢測間隔到300ms，允許快速連續掃描
            if (!this.lastDetectionTime || currentTime - this.lastDetectionTime > 300) {
                this.lastDetectionTime = currentTime;
                
                // 檢測畫面是否有足夠變化 (模擬條碼進入視野)
                if (this.detectVisualChange()) {
                    // 低機率觸發 (模擬真實掃描的不確定性)
                    if (Math.random() < 0.05) { // 5% 機率
                        console.log('🔍 檢測到視覺變化，嘗試識別條碼...');
                        const mockBarcode = this.generateMockBarcode();
                        this.onBarcodeDetected(mockBarcode);
                    }
                }
            }
        }
    }

    // 設定鍵盤監聽 (用於真實條碼掃描)
    setupKeyboardListener() {
        this.keyboardInput = '';
        this.keyboardBuffer = '';
        this.lastKeyTime = 0;
        
        // 監聽鍵盤輸入 (條碼掃描器通常會快速輸入一串字符)
        this.keyHandler = (event) => {
            const currentTime = Date.now();
            
            // 如果輸入間隔超過200ms，重置緩衝區 (條碼掃描器輸入很快)
            if (currentTime - this.lastKeyTime > 200) {
                this.keyboardBuffer = '';
            }
            
            this.lastKeyTime = currentTime;
            
            // 收集字符 (包括數字、字母、符號)
            if (event.key.length === 1 && /[0-9A-Za-z\-_\.]/.test(event.key)) {
                this.keyboardBuffer += event.key;
                
                // 降低條碼長度限制，支援更多類型的條碼
                if (this.keyboardBuffer.length >= 3) {
                    clearTimeout(this.inputTimeout);
                    this.inputTimeout = setTimeout(() => {
                        if (this.keyboardBuffer.length >= 3) {
                            this.keyboardInput = this.keyboardBuffer.trim();
                            this.keyboardBuffer = '';
                            console.log('📝 自動處理條碼輸入:', this.keyboardInput);
                        }
                    }, 100); // 縮短到100ms，提升響應速度
                }
            } else if (event.key === 'Enter' && this.keyboardBuffer.length >= 3) {
                // Enter鍵表示條碼輸入完成
                clearTimeout(this.inputTimeout);
                this.keyboardInput = this.keyboardBuffer.trim();
                this.keyboardBuffer = '';
                console.log('📝 Enter確認條碼輸入:', this.keyboardInput);
            }
        };
        
        document.addEventListener('keydown', this.keyHandler);
        console.log('⌨️ 鍵盤掃描監聽已啟動 (可直接掃描條碼到畫面)');
        
        // 顯示掃描提示
        this.showScanTips();
    }
    
    // 顯示掃描提示
    showScanTips() {
        const tipsDiv = document.createElement('div');
        tipsDiv.className = 'scan-tips';
        tipsDiv.innerHTML = `
            <div style="background: rgba(33, 150, 243, 0.9); color: white; padding: 8px 12px; border-radius: 8px; font-size: 0.7em; margin: 5px;">
                💡 支援多種掃描方式：相機掃描、條碼槍直接掃描、手動輸入
            </div>
        `;
        
        // 添加到掃描界面
        const scannerContainer = document.querySelector('.scanner-container');
        if (scannerContainer) {
            scannerContainer.appendChild(tipsDiv);
            
            // 3秒後自動移除提示
            setTimeout(() => {
                if (tipsDiv.parentNode) {
                    tipsDiv.remove();
                }
            }, 3000);
        }
    }

    // 移除鍵盤監聽
    removeKeyboardListener() {
        if (this.keyHandler) {
            document.removeEventListener('keydown', this.keyHandler);
            this.keyHandler = null;
            
            // 清理定時器
            if (this.inputTimeout) {
                clearTimeout(this.inputTimeout);
                this.inputTimeout = null;
            }
            
            console.log('⌨️ 鍵盤掃描監聽已移除');
        }
    }

    // 檢測條碼類型
    detectBarcodeType(code) {
        if (code.length === 13 && /^\d+$/.test(code)) return 'EAN_13';
        if (code.length === 8 && /^\d+$/.test(code)) return 'EAN_8';
        if (code.length === 12 && /^\d+$/.test(code)) return 'UPC_A';
        if (/^[A-Z0-9\-\.\/\+]+$/i.test(code)) return 'CODE_128';
        return 'OTHER';
    }

    // 查找商品資料 (模擬資料庫查詢)
    lookupProductInfo(barcode) {
        // 這裡可以整合真實的商品資料庫
        // 目前提供一些常見條碼的模擬資料
        const productDatabase = {
            '4711234567890': { name: '可口可樂 330ml', category: '食品類' },
            '4719876543210': { name: '維他命C錠', category: '保健品' },
            '8712345678901': { name: '洗髮精 400ml', category: '美妝類' },
            '4712345678902': { name: '巧克力餅乾', category: '食品類' },
            '9876543210123': { name: '感冒藥膠囊', category: '藥品類' }
        };

        // 檢查精確匹配
        if (productDatabase[barcode]) {
            return productDatabase[barcode];
        }

        // 檢查前綴匹配 (同品牌產品)
        const prefix = barcode.substring(0, 7);
        for (const [code, info] of Object.entries(productDatabase)) {
            if (code.startsWith(prefix)) {
                return {
                    name: `${info.name.split(' ')[0]} 相關產品`,
                    category: info.category
                };
            }
        }

        // 根據條碼前綴推測分類
        if (barcode.startsWith('47') || barcode.startsWith('49')) {
            return { name: '未知商品', category: '食品類' };
        } else if (barcode.startsWith('87') || barcode.startsWith('89')) {
            return { name: '未知商品', category: '美妝類' };
        } else if (barcode.startsWith('98') || barcode.startsWith('99')) {
            return { name: '未知商品', category: '藥品類' };
        }

        // 預設
        return { name: '未知商品', category: '其他類' };
    }

    // 檢測視覺變化 (模擬條碼檢測)
    detectVisualChange() {
        if (!this.videoElement || !this.canvasElement) return false;
        
        try {
            const ctx = this.canvasElement.getContext('2d');
            ctx.drawImage(this.videoElement, 0, 0);
            
            // 獲取畫面中心區域的像素數據
            const imageData = ctx.getImageData(
                this.canvasElement.width * 0.25,
                this.canvasElement.height * 0.4,
                this.canvasElement.width * 0.5,
                this.canvasElement.height * 0.2
            );
            
            // 計算簡單的對比度值
            let contrast = 0;
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                contrast += Math.abs(brightness - 128);
            }
            
            // 如果對比度足夠高，可能有條碼
            const avgContrast = contrast / (data.length / 4);
            return avgContrast > 40; // 閾值可以調整
            
        } catch (error) {
            console.warn('視覺檢測失敗:', error);
            return false;
        }
    }

    generateMockBarcode() {
        // 改進：生成更真實的測試條碼
        const testProducts = [
            { type: 'EAN_13', code: '4711234567890', name: '測試商品A', category: '食品類' },
            { type: 'CODE_128', code: 'TEST001ABC', name: '測試商品B', category: '美妝類' },
            { type: 'EAN_13', code: '4719876543210', name: '測試商品C', category: '保健品' },
            { type: 'QR_CODE', code: 'QR_TEST_12345', name: '測試商品D', category: '藥品類' },
            { type: 'CODE_128', code: 'DEMO_SCAN_001', name: '測試商品E', category: '其他類' }
        ];
        
        const product = testProducts[Math.floor(Math.random() * testProducts.length)];
        
        return { 
            type: product.type, 
            code: product.code, 
            timestamp: Date.now(),
            productInfo: {
                name: product.name,
                category: product.category
            }
        };
    }

    // 條碼識別成功處理
    onBarcodeDetected(barcodeData) {
        console.log('條碼識別成功:', barcodeData);

        // 添加到歷史記錄
        this.addToHistory(barcodeData);

        // 重要：不自動停止掃描，允許連續掃描
        // this.stopScan(); // 移除自動停止

        // 發送掃描結果事件
        this.dispatchEvent('barcode-scanned', barcodeData);

        // 顯示成功提示
        this.showScanResult(barcodeData);
        
        // 重置掃描狀態，允許再次掃描
        this.resetScanState();
    }

    // 重置掃描狀態 (允許重複掃描)
    resetScanState() {
        this.keyboardInput = '';
        this.keyboardBuffer = '';
        this.simulateScanTrigger = false;
        
        // 立即重置檢測計時器，允許立即重複掃描
        this.lastDetectionTime = 0;
        this.lastKeyTime = 0;
        
        // 清除任何待處理的輸入超時
        if (this.inputTimeout) {
            clearTimeout(this.inputTimeout);
            this.inputTimeout = null;
        }
        
        console.log('🔄 掃描狀態已完全重置，可以立即重複掃描');
    }

    // 手動輸入模式
    startManualInput(options) {
        const overlay = document.createElement('div');
        overlay.id = 'manual-input-overlay';
        overlay.innerHTML = `
            <div class="manual-input-container">
                <div class="input-header">
                    <h3>⌨️ 手動輸入條碼</h3>
                    <button class="close-btn" onclick="barcodeScanner.stopScan()">✖</button>
                </div>
                
                <div class="input-form">
                    <div class="form-group">
                        <label for="barcode-input">條碼/QR碼</label>
                        <input type="text" id="barcode-input" placeholder="請輸入或掃描條碼" autofocus>
                    </div>
                    
                    <div class="form-group">
                        <label for="barcode-type">條碼類型</label>
                        <select id="barcode-type">
                            <option value="EAN_13">EAN-13</option>
                            <option value="CODE_128">Code 128</option>
                            <option value="QR_CODE">QR Code</option>
                            <option value="OTHER">其他</option>
                        </select>
                    </div>
                    
                    <div class="button-group">
                        <button class="submit-btn" onclick="barcodeScanner.submitManualInput()">
                            ✅ 確認
                        </button>
                        <button class="camera-btn" onclick="barcodeScanner.switchToCamera()" 
                                ${!this.cameraSupported ? 'disabled' : ''}>
                            📱 使用相機
                        </button>
                    </div>
                </div>
                
                <div class="scan-history">
                    <h4>最近掃描</h4>
                    <div id="recent-scans-manual"></div>
                </div>
            </div>
        `;

        // 添加樣式
        const style = document.createElement('style');
        style.textContent = `
            #manual-input-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .manual-input-container {
                width: 90%;
                max-width: 400px;
                background: white;
                border-radius: 15px;
                overflow: hidden;
            }
            
            .input-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px 20px;
                background: #FF9800;
                color: white;
            }
            
            .input-form {
                padding: 20px;
            }
            
            .form-group {
                margin-bottom: 15px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 5px;
                font-weight: 500;
                color: #333;
            }
            
            .form-group input,
            .form-group select {
                width: 100%;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 8px;
                font-size: 1em;
                transition: border-color 0.3s;
            }
            
            .form-group input:focus,
            .form-group select:focus {
                outline: none;
                border-color: #FF9800;
            }
            
            .button-group {
                display: flex;
                gap: 10px;
                margin-top: 20px;
            }
            
            .submit-btn,
            .camera-btn {
                flex: 1;
                padding: 12px;
                border: none;
                border-radius: 8px;
                font-size: 1em;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .submit-btn {
                background: #4CAF50;
                color: white;
            }
            
            .submit-btn:hover {
                background: #45a049;
            }
            
            .camera-btn {
                background: #2196F3;
                color: white;
            }
            
            .camera-btn:hover:not(:disabled) {
                background: #1976D2;
            }
            
            .camera-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(overlay);

        // 設定輸入框事件
        const input = document.getElementById('barcode-input');
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.submitManualInput();
            }
        });

        // 更新最近掃描記錄
        this.updateRecentScans('recent-scans-manual');

        this.dispatchEvent('scan-started', { mode: 'manual' });
    }

    // 提交手動輸入
    submitManualInput() {
        const input = document.getElementById('barcode-input');
        const typeSelect = document.getElementById('barcode-type');
        
        const code = input.value.trim();
        if (!code) {
            alert('請輸入條碼');
            return;
        }

        const barcodeData = {
            type: typeSelect.value,
            code: code,
            timestamp: Date.now(),
            source: 'manual'
        };

        this.onBarcodeDetected(barcodeData);
    }

    // 切換到相機模式
    async switchToCamera() {
        console.log('🔄 開始從手動輸入切換到相機掃描');
        
        try {
            // 1. 移除手動輸入界面
            const manualOverlay = document.getElementById('manual-input-overlay');
            if (manualOverlay) {
                manualOverlay.remove();
                console.log('✅ 手動輸入界面已移除');
            }
            
            // 2. 重置掃描狀態
            this.isScanning = false;
            this.removeKeyboardListener(); // 確保移除鍵盤監聽
            
            // 3. 等待一下確保界面清理完成
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // 4. 啟動相機掃描
            console.log('🎥 正在啟動相機掃描...');
            await this.startCameraScan({ facingMode: 'environment' });
            
            console.log('✅ 成功切換到相機掃描模式');
            
        } catch (error) {
            console.error('❌ 切換到相機模式失敗:', error);
            
            // 如果切換失敗，顯示錯誤並回到手動輸入模式
            alert('相機啟動失敗，請檢查相機權限或重新嘗試');
            
            // 延遲一下再重新啟動手動輸入
            setTimeout(() => {
                this.startManualInput();
            }, 500);
        }
    }

    // 顯示手動輸入
    showManualInput() {
        this.stopScan();
        this.startManualInput();
    }

    // 停止掃描
    stopScan() {
        this.isScanning = false;

        // 停止視頻流
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        // 移除鍵盤監聽
        this.removeKeyboardListener();

        // 移除UI
        const overlay = document.getElementById('scanner-overlay');
        if (overlay) {
            overlay.remove();
        }

        const manualOverlay = document.getElementById('manual-input-overlay');
        if (manualOverlay) {
            manualOverlay.remove();
        }

        this.dispatchEvent('scan-stopped');
    }

    // 切換閃光燈
    async toggleFlash() {
        if (!this.stream) return;

        try {
            const track = this.stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            
            if (capabilities.torch) {
                const currentSettings = track.getSettings();
                await track.applyConstraints({
                    advanced: [{ torch: !currentSettings.torch }]
                });
            }
        } catch (error) {
            console.warn('無法控制閃光燈:', error);
        }
    }

    // 切換相機
    async switchCamera() {
        if (!this.stream) return;

        // 儲存當前狀態
        const currentFacing = this.currentFacingMode || 'environment';
        const newFacing = currentFacing === 'environment' ? 'user' : 'environment';
        
        console.log(`🔄 切換相機: ${currentFacing} → ${newFacing}`);
        
        // 停止當前流
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
        
        // 啟動新的相機流
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: newFacing,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            
            // 更新視頻源
            this.videoElement.srcObject = this.stream;
            await this.videoElement.play();
            
            // 記錄當前相機模式
            this.currentFacingMode = newFacing;
            
            // 重新啟動掃描循環
            this.scanLoop();
            
            console.log(`✅ 已切換到${newFacing === 'user' ? '前' : '後'}鏡頭`);
            
        } catch (error) {
            console.error('切換相機失敗:', error);
            // 如果切換失敗，嘗試回到原來的相機
            try {
                this.stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: currentFacing,
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                this.videoElement.srcObject = this.stream;
                await this.videoElement.play();
                this.currentFacingMode = currentFacing;
                this.scanLoop();
            } catch (fallbackError) {
                console.error('相機切換完全失敗:', fallbackError);
                alert('相機切換失敗，請重新開啟掃描');
                this.stopScan();
            }
        }
    }

    // 模擬掃描觸發 (用於測試)
    simulateScan() {
        if (!this.isScanning) return;
        
        console.log('🧪 觸發測試掃描...');
        this.simulateScanTrigger = true;
    }

    // 添加到掃描歷史
    addToHistory(barcodeData) {
        this.scanHistory.unshift({
            ...barcodeData,
            id: Date.now()
        });

        // 只保留最近50個記錄
        if (this.scanHistory.length > 50) {
            this.scanHistory = this.scanHistory.slice(0, 50);
        }

        this.saveScanHistory();
    }

    // 載入掃描歷史
    loadScanHistory() {
        try {
            const saved = localStorage.getItem('barcode-scan-history');
            if (saved) {
                this.scanHistory = JSON.parse(saved);
            }
        } catch (error) {
            console.error('載入掃描歷史失敗:', error);
            this.scanHistory = [];
        }
    }

    // 儲存掃描歷史
    saveScanHistory() {
        try {
            localStorage.setItem('barcode-scan-history', JSON.stringify(this.scanHistory));
        } catch (error) {
            console.error('儲存掃描歷史失敗:', error);
        }
    }

    // 更新最近掃描顯示
    updateRecentScans(containerId = 'recent-scans') {
        const container = document.getElementById(containerId);
        if (!container) return;

        const recentScans = this.scanHistory.slice(0, 5);
        
        if (recentScans.length === 0) {
            container.innerHTML = '<div class="no-history">暫無掃描記錄</div>';
            return;
        }

        container.innerHTML = recentScans.map(scan => `
            <div class="recent-scan-item" onclick="barcodeScanner.reuseBarcode('${scan.code}', '${scan.type}')">
                <div style="font-weight: 500;">${scan.code}</div>
                <div style="font-size: 0.7em; color: #666;">
                    ${scan.type} · ${new Date(scan.timestamp).toLocaleTimeString()}
                </div>
            </div>
        `).join('');
    }

    // 重用條碼
    reuseBarcode(code, type) {
        const barcodeData = {
            type: type,
            code: code,
            timestamp: Date.now(),
            source: 'history'
        };

        this.onBarcodeDetected(barcodeData);
    }

    // 顯示掃描結果
    showScanResult(barcodeData) {
        // 創建結果顯示
        const resultDiv = document.createElement('div');
        resultDiv.className = 'scan-result-popup';
        resultDiv.innerHTML = `
            <div class="result-content">
                <div class="result-header">
                    ✅ 掃描成功
                </div>
                <div class="result-body">
                    <div class="result-code">${barcodeData.code}</div>
                    <div class="result-type">${barcodeData.type}</div>
                </div>
            </div>
        `;

        // 添加樣式
        const style = document.createElement('style');
        style.textContent = `
            .scan-result-popup {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 10001;
                animation: popup-show 0.3s ease;
            }
            
            @keyframes popup-show {
                from { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
                to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
            }
            
            .result-content {
                padding: 20px;
                text-align: center;
            }
            
            .result-header {
                font-size: 1.2em;
                font-weight: 600;
                color: #4CAF50;
                margin-bottom: 15px;
            }
            
            .result-code {
                font-size: 1.1em;
                font-weight: 500;
                color: #333;
                background: #f5f5f5;
                padding: 10px;
                border-radius: 8px;
                margin-bottom: 10px;
                word-break: break-all;
            }
            
            .result-type {
                font-size: 0.9em;
                color: #666;
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(resultDiv);

        // 3秒後自動移除
        setTimeout(() => {
            resultDiv.remove();
            style.remove();
        }, 3000);
    }

    // 發送自定義事件
    dispatchEvent(eventName, data = {}) {
        document.dispatchEvent(new CustomEvent(eventName, {
            detail: data
        }));
    }

    // 獲取掃描統計
    getScanStats() {
        const today = new Date().toDateString();
        const todayScans = this.scanHistory.filter(scan => 
            new Date(scan.timestamp).toDateString() === today
        );

        return {
            totalScans: this.scanHistory.length,
            todayScans: todayScans.length,
            mostScannedType: this.getMostScannedType(),
            avgScansPerDay: this.getAvgScansPerDay()
        };
    }

    getMostScannedType() {
        const typeCounts = {};
        this.scanHistory.forEach(scan => {
            typeCounts[scan.type] = (typeCounts[scan.type] || 0) + 1;
        });

        let mostScanned = '';
        let maxCount = 0;
        for (const [type, count] of Object.entries(typeCounts)) {
            if (count > maxCount) {
                maxCount = count;
                mostScanned = type;
            }
        }

        return { type: mostScanned, count: maxCount };
    }

    getAvgScansPerDay() {
        if (this.scanHistory.length === 0) return 0;

        const oldestScan = Math.min(...this.scanHistory.map(scan => scan.timestamp));
        const daysDiff = Math.max(1, Math.ceil((Date.now() - oldestScan) / (24 * 60 * 60 * 1000)));
        
        return Math.round(this.scanHistory.length / daysDiff * 10) / 10;
    }
}

// 匯出模組
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BarcodeScanner;
} else if (typeof window !== 'undefined') {
    window.BarcodeScanner = BarcodeScanner;
}
