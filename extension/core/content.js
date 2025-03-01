import {CharDetector, } from "scanner/detector/char";

export class CaptchaScanner{
    constructor(){
        this.detectors = [
            new CharDetector(),
        ]
        // 按顺序设置责任链的下一个节点
        this.detectors.forEach((detector, index) => {
            if (index < this.detectors.length - 1) {
                detector.setNextDetector(this.detectors[index + 1]);
            }
        })
    }

    scan(){
        let locator = null
        let scan_area = ['form img','img']
        scan_area.some(area=>{
            Array.from(document.querySelectorAll(area)).some(candidate=>{
                locator = this.detectors[0].detect(candidate)
                return locator
            })
            return locator
        })
        return locator
    }
}

const scanner = new CaptchaScanner();
let captchaLocator = null;

// 监听扫描请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SCAN_CAPTCHA') {
        captchaLocator = scanner.scan();
        if (captchaLocator) {
            captureCaptchaImage(captchaLocator);
        }
    }
});

// 捕获验证码图像
function captureCaptchaImage(locator) {
    const imgEl = document.querySelector(locator.selector);
    if (!imgEl || !imgEl.complete) return;

    // 添加跨域处理
    imgEl.crossOrigin = "Anonymous"; 
    
    // 添加重试机制
    const retry = () => {
        setTimeout(() => {
            const newImg = document.querySelector(locator.selector);
            if(newImg) captureCaptchaImage(locator);
        }, 500);
    };

    // 处理图像加载失败
    imgEl.onerror = retry;
    
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
                blob,
                locator
            }
        });
    });
}

// 自动扫描触发
chrome.storage.local.get(['autoScanEnabled'], ({autoScanEnabled}) => {
    if (autoScanEnabled) {
        const scanner = new CaptchaScanner();
        scanner.scan();
    }
});
