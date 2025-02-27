// 域名变更监听
let currentDomain = null;

chrome.webNavigation.onCommitted.addListener((details) => {
    const newDomain = new URL(details.url).hostname;
    if (newDomain !== currentDomain) {
        currentDomain = newDomain;
        checkAutoScanStatus();
    }
});

// 自动扫描状态检查
async function checkAutoScanStatus() {
    const {autoScanEnabled} = await chrome.storage.local.get(['autoScanEnabled']);
    if (autoScanEnabled) {
        triggerScan();
    }
}

// 触发扫描
function triggerScan() {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {type: 'SCAN_CAPTCHA'});
    });
}

// 消息监听
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.type) {
        case 'TRIGGER_SCAN':
            triggerScan();
            break;
        case 'CAPTCHA_FOUND':
            handleCaptchaFound(request.data);
            break;
    }
});

// 处理找到的验证码
async function handleCaptchaFound(captchaData) {
    // 获取验证码图片文件
    const imageFile = await fetch(captchaData.imageUrl)
        .then(r => r.blob())
        .then(blob => new File([blob], "captcha.jpg"));
    
    // 发送到后端API（需要替换实际API地址）
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('domain', captchaData.domain);
    
    try {
        const response = await fetch('https://api.your-service.com/captcha', {
            method: 'POST',
            body: formData
        });
        const result = await response.json();
        chrome.notifications.create({
            type: 'basic',
            title: '验证码识别结果',
            message: result.solution || '识别失败',
            iconUrl: 'icons/icon48.png'
        });
    } catch (error) {
        console.error('API请求失败:', error);
    }
}
