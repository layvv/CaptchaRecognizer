import {CharCaptcha} from "../captcha/char";

export class CaptchaScanner{

    // 确保scanner是单例的
    static scanner = new CaptchaScanner()

    static captcha = [CharCaptcha]

    static getScanner(){
        return CaptchaScanner.scanner
    }

    scan(){
        // 扫描页面中的验证码, 由于验证码的类型很多, 所以需要遍历所有可能的验证码类型

    }

}