export class CaptchaLocator{
    constructor(type,selector,relatedEl){
        this.id = crypto.randomUUID().replace(/-/g,'')
        this.type = type
        this.domain = window.location.hostname
        this.selector = selector
        this.relatedEl = relatedEl
        this.extraInfo = {
            createTime: Date.now(),
        }
    }
}