export class API{
    static baseURL = 'http://localhost:8000/v1'

    
    // 自定义fetch实现请求响应拦截
    async myFetch(url, options){
        const headers = {
            'Content-Type': 'application/json',
        }
        const response = await fetch(`${this.baseURL}${url}`, {
            ...options, 
            headers
        })
        if(response.status === 200){
            return response.json()
        }else{
            console.error(response.status,': ', response.statusText)
        }
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

}