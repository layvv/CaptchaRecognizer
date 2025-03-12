export class Storage{

    saveLocator(locator){
        chrome.storage.local.set({[locator.domain]:locator})
    }

    getLocator(){
        chrome.storage.local.get(window.location.hostname, (result) => {
            return result.locator
        })
    }

}
