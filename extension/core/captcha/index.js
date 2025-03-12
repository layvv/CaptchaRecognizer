export class CaptchaType{
    static CHAR = 'char'
    static SLIDE = 'slide'
    static TEXT_CLICK = 'text_click'
}

export class CaptchaLocator{
    constructor(type,selector,relatedEl){
        this.type = type
        this.domain = window.location.hostname
        this.url = window.location.href
        this.selector = selector
        this.relatedEl = relatedEl
        this.extraInfo = {
            createTime: Date.now(),
            lastResolveTime: Date.now(),
            errorCount: 0,
            successCount: 1,
            tryCount: 1,
        }
    }
}

// 定义每类验证码的特征接口
export class Captcha{

    // 验证码类型
    static type = null

    // 验证码特征信息
    static feature = {
        attribute: null,
        relatedEl: null,
    }

    static match(el){
    }

}