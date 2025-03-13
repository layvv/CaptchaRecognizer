/**
 * 设置本地存储
 * @param {string} key 键
 * @param {any} value 值
 * @returns {Promise<void>}
 */
export function setItem(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => {
      resolve();
    });
  });
}

/**
 * 获取本地存储
 * @param {string} key 键
 * @returns {Promise<any>} 存储的值
 */
export function getItem(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key]);
    });
  });
}

/**
 * 移除本地存储
 * @param {string} key 键
 * @returns {Promise<void>}
 */
export function removeItem(key) {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, () => {
      resolve();
    });
  });
}

/**
 * 清除所有本地存储
 * @returns {Promise<void>}
 */
export function clearAll() {
  return new Promise((resolve) => {
    chrome.storage.local.clear(() => {
      resolve();
    });
  });
}

/**
 * 获取所有本地存储项
 * @returns {Promise<object>} 所有存储项
 */
export function getAllItems() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      resolve(items);
    });
  });
}

/**
 * 保存验证码定位器
 * @param {object} locator 验证码定位器
 * @returns {Promise<void>}
 */
export function setLocator(locator) {
  return new Promise((resolve) => {
    // 使用域名作为键
    chrome.storage.local.set({ [locator.domain]: locator }, () => {
      resolve();
    });
  });
}

/**
 * 获取验证码定位器
 * @param {string} domain 域名
 * @returns {Promise<object>} 验证码定位器
 */
export function getLocator(domain) {
  return new Promise((resolve) => {
    chrome.storage.local.get(domain, (result) => {
      resolve(result[domain]);
    });
  });
}

/**
 * 获取所有验证码定位器
 * @returns {Promise<Array>} 所有验证码定位器
 */
export function getAllLocators() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (items) => {
      // 过滤出验证码定位器（根据其特征）
      const locators = Object.values(items).filter(item => 
        item && item.type && item.domain && item.captcha
      );
      resolve(locators);
    });
  });
}

/**
 * 设置批量数据
 * @param {object} data 数据对象
 * @returns {Promise<void>}
 */
export function setBulk(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => {
      resolve();
    });
  });
}
