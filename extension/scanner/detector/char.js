import {CaptchaDetector} from "./captcha"
import {getSelector} from "../../utils/element";
import {CaptchaLocator} from "../../api";

export class CharDetector extends CaptchaDetector {
    type = 'char_input'

    constructor() {
        super()
        this.keywords = ['captcha', 'verify', 'security', 'auth', 'code', '验证码', '校验码', '安全码', '码']
        this.regex = new RegExp(this.keywords.join('|'), 'i')
        this.relatedEl = {}
    }

    static features = {
        matchSize(el) {
            if (el.width > 80 && el.height > 30 && el.width < 300 && el.height < 100) {
                this.score += 20
                return true
            }
            throw new Error('element size not match')
        },
        matchAttributes(el) {
            [el.id, el.name, el.className, el.src, el.alt, el.title].some(attr => {
                if (this.regex.test(attr)) {
                    this.score += 20
                    return true
                }
            })
        },
        matchNeighbors(el) {
            const nearByForm = el.closest('form')
            if (nearByForm)
                this.score += 10

            const nearByInput = el.closest('input[type=text]')
            if (!nearByInput) {
                throw new Error('no nearby input')
            }
            [nearByInput.name, nearByInput.id, nearByInput.className, nearByInput.placeholder].some(attr => {
                if (this.regex.test(attr)) {
                    this.score += 20
                    this.relatedEl['input'] = getSelector(nearByInput)
                    return true
                }
            })

            const refreshBtnRegexp = new RegExp('刷新|重试|换一张|看不清', 'i')
            const refreshBtnCandidates = [el.closest('button'),
                el.closest('i'), el.closest('a'),el.closest('span')]
            const hasRefreshBtn = refreshBtnCandidates.some(btn => {
                if (btn && refreshBtnRegexp.test(btn.innerText)) {
                    this.score += 10
                    this.relatedEl['refreshBtn'] = getSelector(btn)
                    return true
                }
            })
            if (!hasRefreshBtn) {
                this.relatedEl['refreshBtn'] = getSelector(el)
            }
        }
    }

    detect(el) {
        if (this.check(el)) {
            return new CaptchaLocator(this.type, getSelector(el), this.relatedEl)
        }
    }

    check(el) {
        this.score = 0
        for (const matchRules of Object.values(CharDetector.features)) {
            try {
                matchRules(el)
            } catch (err) {
                console.log(err)
                return false
            }
        }
        return this.score >= 65;

    }
}