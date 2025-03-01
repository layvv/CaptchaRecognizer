import {CharDetector, } from "./detector/char";

export class CaptchaScanner{
    constructor(){
        this.detectors = [
            new CharDetector(),
        ]
    }

    scan(){
        let locator = null
        Array.from(document.querySelectorAll('form img')).some(el => {
            return this.detectors.some(detector => {
                locator = detector.detect(el)
                if(locator){
                    console.log('验证码定位器: ',locator)
                    return true
                }
            })
        })
        // 扩大搜索范围
        Array.from(document.querySelectorAll('img')).some(el => {
            return this.detectors.some(detector => {
                locator = detector.detect(el)
                if(locator){
                    console.log('验证码定位器: ',locator)
                    return true
                }
            })
        })
    }
}