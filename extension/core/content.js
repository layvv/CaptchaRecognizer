// 扫描结果缓存
let lastCaptchaResult = null;

// 监听扫描请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SCAN_CAPTCHA') {
        const scanner = new CaptchaScanner();
        lastCaptchaResult = scanner.scan();
        if (lastCaptchaResult) {
            captureCaptchaImage(lastCaptchaResult);
        }
    }
});

// 捕获验证码图像
async function captureCaptchaImage(locator) {
    const imgEl = document.querySelector(locator.selector);
    if (!imgEl) return;

    // 使用canvas提取图像数据
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = imgEl.naturalWidth;
    canvas.height = imgEl.naturalHeight;
    ctx.drawImage(imgEl, 0, 0);

    canvas.toBlob(blob => {
        const imageUrl = URL.createObjectURL(blob);
        chrome.runtime.sendMessage({
            type: 'CAPTCHA_FOUND',
            data: {
                ...locator,
                imageUrl,
                timestamp: Date.now()
            }
        });
    }, 'image/jpeg');
}

// 自动扫描触发
chrome.storage.local.get(['autoScanEnabled'], ({autoScanEnabled}) => {
    if (autoScanEnabled) {
        const scanner = new CaptchaScanner();
        scanner.scan();
    }
});
