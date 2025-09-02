/**
 * 語音輸入功能
 * 使用 Web Speech API 實現語音識別
 */

class VoiceInput {
    constructor(app) {
        this.app = app;
        this.recognition = null;
        this.isListening = false;
        this.targetInput = null;
        this.isSupported = this.checkSupport();
        
        this.init();
    }

    checkSupport() {
        return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    }

    init() {
        if (!this.isSupported) {
            console.warn('瀏覽器不支援語音識別功能');
            this.hideVoiceButtons();
            return;
        }

        this.setupSpeechRecognition();
        this.setupEventListeners();
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            this.isSupported = false;
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'zh-TW'; // 設定為繁體中文
        this.recognition.maxAlternatives = 3;

        // 語音識別事件
        this.recognition.onstart = () => {
            this.onListeningStart();
        };

        this.recognition.onresult = (event) => {
            this.onSpeechResult(event);
        };

        this.recognition.onerror = (event) => {
            this.onSpeechError(event);
        };

        this.recognition.onend = () => {
            this.onListeningEnd();
        };
    }

    setupEventListeners() {
        // 停止語音按鈕
        const stopVoiceBtn = document.getElementById('stopVoiceBtn');
        if (stopVoiceBtn) {
            stopVoiceBtn.addEventListener('click', () => {
                this.stopListening();
            });
        }
    }

    hideVoiceButtons() {
        // 隱藏所有語音按鈕
        document.querySelectorAll('.voice-btn').forEach(btn => {
            btn.style.display = 'none';
        });
    }

    startVoiceInput(targetInputId) {
        if (!this.isSupported) {
            this.app.showMessage('此瀏覽器不支援語音輸入', 'error');
            return;
        }

        if (this.isListening) {
            this.stopListening();
            return;
        }

        this.targetInput = targetInputId;
        
        try {
            this.recognition.start();
        } catch (error) {
            console.error('啟動語音識別失敗:', error);
            this.app.showMessage('無法啟動語音識別', 'error');
        }
    }

    stopListening() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }

    onListeningStart() {
        this.isListening = true;
        this.showVoiceIndicator();
        this.app.vibrate([50]);
        
        if (this.app.settings.voiceNotification) {
            this.speak('請說話');
        }
    }

    onSpeechResult(event) {
        const results = event.results;
        let finalTranscript = '';
        
        for (let i = 0; i < results.length; i++) {
            if (results[i].isFinal) {
                finalTranscript += results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            this.processSpeechResult(finalTranscript.trim());
        }
    }

    onSpeechError(event) {
        console.error('語音識別錯誤:', event.error);
        
        const errorMessages = {
            'no-speech': '沒有偵測到語音，請重試',
            'audio-capture': '無法存取麥克風',
            'not-allowed': '麥克風權限被拒絕',
            'network': '網路連線問題',
            'service-not-allowed': '語音服務不可用'
        };

        const message = errorMessages[event.error] || '語音識別失敗，請重試';
        this.app.showMessage(message, 'error');
    }

    onListeningEnd() {
        this.isListening = false;
        this.hideVoiceIndicator();
    }

    processSpeechResult(transcript) {
        console.log('語音識別結果:', transcript);
        
        // 預處理語音結果
        const processedText = this.preprocessVoiceText(transcript);
        
        if (this.targetInput) {
            this.fillTargetInput(processedText);
        } else {
            // 沒有指定目標，嘗試智能處理
            this.handleIntelligentVoiceInput(processedText);
        }

        this.app.vibrate([100, 50, 100]);
        this.app.showMessage(`識別到: "${processedText}"`, 'success');
    }

    preprocessVoiceText(text) {
        // 將中文數字轉換為阿拉伯數字
        let processed = text;
        
        const chineseNumbers = {
            '零': '0', '一': '1', '二': '2', '三': '3', '四': '4',
            '五': '5', '六': '6', '七': '7', '八': '8', '九': '9',
            '十': '10', '百': '00', '千': '000'
        };

        // 簡單的中文數字替換
        for (const [chinese, arabic] of Object.entries(chineseNumbers)) {
            processed = processed.replace(new RegExp(chinese, 'g'), arabic);
        }

        // 處理特殊詞彙
        const replacements = {
            '個': '',
            '件': '',
            '盒': '',
            '包': '',
            '瓶': '',
            '袋': ''
        };

        for (const [from, to] of Object.entries(replacements)) {
            processed = processed.replace(new RegExp(from, 'g'), to);
        }

        return processed.trim();
    }

    fillTargetInput(value) {
        const targetElement = document.getElementById(this.targetInput);
        
        if (!targetElement) return;

        if (targetElement.type === 'number') {
            // 數字輸入框：提取數字
            const numbers = value.match(/\d+/);
            if (numbers) {
                targetElement.value = numbers[0];
                targetElement.dispatchEvent(new Event('input'));
            }
        } else if (targetElement.tagName === 'SELECT') {
            // 下拉選單：模糊匹配
            this.matchSelectOption(targetElement, value);
        } else {
            // 一般文字輸入框
            targetElement.value = value;
            targetElement.dispatchEvent(new Event('input'));
        }

        this.targetInput = null;
    }

    matchSelectOption(selectElement, voiceText) {
        const options = Array.from(selectElement.options);
        
        // 完全匹配
        let matchedOption = options.find(option => 
            option.textContent.toLowerCase() === voiceText.toLowerCase()
        );

        // 包含匹配
        if (!matchedOption) {
            matchedOption = options.find(option => 
                option.textContent.toLowerCase().includes(voiceText.toLowerCase()) ||
                voiceText.toLowerCase().includes(option.textContent.toLowerCase())
            );
        }

        // 拼音或同音字匹配（簡化版）
        if (!matchedOption) {
            matchedOption = this.findSimilarOption(options, voiceText);
        }

        if (matchedOption) {
            selectElement.value = matchedOption.value;
            selectElement.dispatchEvent(new Event('change'));
        } else {
            this.app.showMessage('找不到匹配的選項', 'warning');
        }
    }

    findSimilarOption(options, voiceText) {
        // 簡單的同音字和常見錯誤匹配
        const similarMappings = {
            '一樓': '1F',
            '二樓': '2F',
            '三樓': '3F',
            '一': '1',
            '二': '2',
            '三': '3',
            '四': '4',
            '五': '5',
            '六': '6',
            '七': '7',
            '八': '8',
            '九': '9',
            '十': '10'
        };

        let processedText = voiceText;
        for (const [from, to] of Object.entries(similarMappings)) {
            processedText = processedText.replace(from, to);
        }

        return options.find(option => 
            option.textContent.includes(processedText) ||
            option.value.includes(processedText)
        );
    }

    handleIntelligentVoiceInput(text) {
        // 智能判斷語音輸入的意圖
        const lowerText = text.toLowerCase();

        // 數字模式：直接是數字
        if (/^\d+$/.test(text)) {
            this.fillCurrentQuantityInput(text);
            return;
        }

        // 盤點模式：包含數量詞
        const quantityMatch = text.match(/(\d+)\s*(個|件|盒|包|瓶|袋)/);
        if (quantityMatch) {
            this.fillCurrentQuantityInput(quantityMatch[1]);
            return;
        }

        // 樓層模式
        if (lowerText.includes('樓') || /[123]f/i.test(lowerText)) {
            this.fillFloorInput(text);
            return;
        }

        // 預設處理：嘗試填入當前焦點的輸入框
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT')) {
            activeElement.value = text;
            activeElement.dispatchEvent(new Event('input'));
        }
    }

    fillCurrentQuantityInput(quantity) {
        const quantityInput = document.getElementById('quantityInput');
        if (quantityInput) {
            quantityInput.value = quantity;
            quantityInput.dispatchEvent(new Event('input'));
        }
    }

    fillFloorInput(text) {
        const areaSelect = document.getElementById('areaSelect');
        if (areaSelect) {
            let floor = '';
            if (text.includes('一樓') || text.includes('1F')) floor = '1F';
            else if (text.includes('二樓') || text.includes('2F')) floor = '2F';
            else if (text.includes('三樓') || text.includes('3F')) floor = '3F';
            
            if (floor) {
                areaSelect.value = floor;
                areaSelect.dispatchEvent(new Event('change'));
            }
        }
    }

    showVoiceIndicator() {
        const indicator = document.getElementById('voiceIndicator');
        if (indicator) {
            indicator.classList.remove('hidden');
        }
    }

    hideVoiceIndicator() {
        const indicator = document.getElementById('voiceIndicator');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }

    speak(text) {
        if (!this.app.settings.voiceNotification) return;
        
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-TW';
            utterance.volume = 0.7;
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            
            speechSynthesis.speak(utterance);
        }
    }

    // 快捷語音命令
    setupVoiceCommands() {
        const commands = {
            '開始盤點': () => this.app.navigateTo('inventory'),
            '掃描條碼': () => this.app.navigateTo('barcode'),
            '查看批號': () => this.app.navigateTo('batch'),
            '庫存轉移': () => this.app.navigateTo('transfer'),
            '回到首頁': () => this.app.navigateTo('dashboard'),
            '同步資料': () => this.app.syncData()
        };

        return commands;
    }

    processVoiceCommand(text) {
        const commands = this.setupVoiceCommands();
        
        for (const [command, action] of Object.entries(commands)) {
            if (text.includes(command)) {
                action();
                this.app.showMessage(`執行命令: ${command}`, 'success');
                return true;
            }
        }
        
        return false;
    }

    // 連續語音模式
    startContinuousListening() {
        if (!this.isSupported) return;

        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        
        this.recognition.onresult = (event) => {
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                
                if (event.results[i].isFinal) {
                    // 檢查是否為命令
                    if (!this.processVoiceCommand(transcript)) {
                        this.processSpeechResult(transcript);
                    }
                }
            }
        };

        try {
            this.recognition.start();
        } catch (error) {
            console.error('連續語音識別啟動失敗:', error);
        }
    }

    stopContinuousListening() {
        if (this.recognition) {
            this.recognition.continuous = false;
            this.recognition.stop();
        }
    }
}

// 當應用程式初始化時創建語音輸入實例
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.warehouseApp) {
            window.warehouseApp.voice = new VoiceInput(window.warehouseApp);
            
            // 添加語音輸入方法到主應用程式
            window.warehouseApp.startVoiceInput = (targetId) => {
                window.warehouseApp.voice.startVoiceInput(targetId);
            };
        }
    }, 1000);
});

