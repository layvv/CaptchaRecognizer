import {getUserID} from "../../utils/user";


export class CaptchaLocator{
    constructor(type,captcha,context){
        Object.assign(this, {
            type,
            domain: window.location.hostname,
            url: window.location.origin + window.location.pathname,
            captcha,
            context,
            createTime: Date.now(),
            lastResolveTime: null,
            lastUploader: getUserID(),
            lastUpdateTime: null,
            errorCount: 0,
            successCount: 0,
            tryCount: 0,
            origin: 'client',
            locateMode: 'auto', // auto, manual
        })
    }
}