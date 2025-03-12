import {Captcha, CaptchaType} from "./index";

export class CharCaptcha extends Captcha{
    static type = CaptchaType.CHAR
    static commonKeyword = ['capthca','verify','code','验证码','校验码',]
    static commonRegexp = new RegExp(this.commonKeyword.join('|'), 'i')

    // 描述字符型验证码的特征
    static feature = {
        tagName: 'IMG',
        size: {
            width: [80,200],
            height: [30,80]
        },
        attribute: {
            id: CharCaptcha.commonRegexp,
            class: CharCaptcha.commonRegexp,
            name: CharCaptcha.commonRegexp,
            title: CharCaptcha.commonRegexp,
            alt: CharCaptcha.commonRegexp,
            src: CharCaptcha.commonRegexp,
        },
        relatedEl: {
            input:{
                tagName: 'INPUT',
                type: 'text',
                id: CharCaptcha.commonRegexp,
                placeholder: CharCaptcha.commonRegexp,
                name: CharCaptcha.commonRegexp,
                title: CharCaptcha.commonRegexp,
                alt: CharCaptcha.commonRegexp,
            },
            refresh(){
                let keyword = CharCaptcha.commonKeyword.push
                const reg = new RegExp(keyword.join('|'), 'i')
                return {
                    id: reg,
                    class: reg,
                    name: reg,
                    title: reg,
                    alt: reg,
                    src: reg,
                }

            }
        }
    }
    
    static match(el){

    }
}
