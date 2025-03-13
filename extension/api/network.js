export class API{
    static baseURL = 'http://localhost:8000/v1'

    
    // 自定义fetch实现请求响应拦截
    async myFetch(url, options = {}){
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        }
        
        // 添加用户标识
        const userId = await this._getUserId()
        if (userId) {
            headers['X-User-ID'] = userId
        }
        
        // 构建请求URL
        const requestURL = url.startsWith('http') ? url : `${API.baseURL}${url}`
        
        // 请求计时开始
        const startTime = Date.now()
        
        try {
            const response = await fetch(requestURL, {
                ...options, 
                headers
            })
            
            // 计算请求时间
            const timeElapsed = Date.now() - startTime
            
            // 处理非成功状态码
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.message || `请求失败，状态码: ${response.status}`)
            }
            
            // 解析响应
            const data = await response.json()
            
            // 记录请求信息
            this._logRequest({
                url: requestURL,
                method: options.method || 'GET',
                status: response.status,
                timeElapsed,
                success: true
            })
            
            return data
        } catch (error) {
            // 记录失败请求
            this._logRequest({
                url: requestURL,
                method: options.method || 'GET',
                error: error.message,
                timeElapsed: Date.now() - startTime,
                success: false
            })
            
            // 重新抛出错误
            throw error
        }
    }

    // 获取用户ID
    async _getUserId() {
        return new Promise((resolve) => {
            chrome.storage.local.get('userId', (result) => {
                resolve(result.userId || null)
            })
        })
    }

    // 记录请求信息
    _logRequest(info) {
        chrome.storage.local.get('apiRequests', (result) => {
            const requests = result.apiRequests || []
            requests.push({
                ...info,
                timestamp: new Date().toISOString()
            })
            
            // 只保留最近100条记录
            if (requests.length > 100) {
                requests.splice(0, requests.length - 100)
            }
            
            chrome.storage.local.set({ apiRequests: requests })
        })
        
        // 可选：在控制台显示请求日志
        console.debug(`API ${info.success ? '✅' : '❌'} ${info.method} ${info.url} - ${info.timeElapsed}ms`)
    }

    resolveCaptcha(locator){
        return this.myFetch('/captcha/resolve', {
            method: 'POST',
            body: JSON.stringify(locator)
        })
    }

    saveCaptchaLocator(locator){
        return this.myFetch('/locator/save', {
            method: 'POST',
            body: JSON.stringify(locator)
        })
    }

    getLocatorByDomain(domain=window.location.hostname){
        return this.myFetch(`/locator/get?domain=${domain}`)
    }

    // 上传验证码定位器
    async uploadLocator(locator) {
        return this.myFetch(`/locator/upload`, {
            method: 'POST',
            body: JSON.stringify(locator)
        })
    }

    // 识别验证码
    async recognizeCaptcha(imgBase64, type = 'character') {
        return this.myFetch(`/captcha/recognize`, {
            method: 'POST',
            body: JSON.stringify({
                image: imgBase64,
                type: type
            })
        })
    }

    // 报告验证码识别结果
    async reportCaptchaResult(captchaId, success, errorInfo = null) {
        return this.myFetch(`/captcha/report`, {
            method: 'POST',
            body: JSON.stringify({
                captchaId,
                success,
                errorInfo,
                timestamp: new Date().toISOString()
            })
        })
    }

    // 获取验证码特征库
    async getCaptchaFeatures() {
        return this.myFetch(`/features/get`)
    }

    // 提交问题验证码
    async submitProblemCaptcha(captchaData) {
        return this.myFetch(`/captcha/problem`, {
            method: 'POST',
            body: JSON.stringify(captchaData)
        })
    }
}