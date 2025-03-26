/**
 * 存储模块，负责管理扩展的数据存储
 */

// 默认设置
const DEFAULT_SETTINGS = {
  // 全局开关
  enabled: true,
  // 自动识别
  autoRecognize: true,
  // 自动填写
  autoFill: true,
  // 手动模式开关
  manualMode: false,
  // API服务器URL
  apiUrl: 'http://localhost:5000/api',
  // 日志级别: debug, info, warn, error
  logLevel: 'info',
  // 失败重试次数
  maxRetries: 3,
  // 是否上传样本数据用于改进
  uploadSamples: true
};

// 本地存储的键
const STORAGE_KEYS = {
  SETTINGS: 'settings',
  LOCATORS: 'locators',
  DOMAIN_BLACKLIST: 'domainBlacklist',
  FAILED_ELEMENTS: 'failedElements',
  CACHE: 'cache'
};

/**
 * 获取扩展设置
 * @returns {Promise<Object>} 设置对象
 */
export async function getSettings() {
  try {
    const data = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...data[STORAGE_KEYS.SETTINGS] };
  } catch (error) {
    console.error('获取设置失败:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 更新扩展设置
 * @param {Object} settings 要更新的设置
 * @returns {Promise<void>}
 */
export async function updateSettings(settings) {
  try {
    const currentSettings = await getSettings();
    const newSettings = { ...currentSettings, ...settings };
    await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: newSettings });
    
    // 触发设置变更事件
    const event = new CustomEvent('settingsChanged', { detail: newSettings });
    document.dispatchEvent(event);
    
    return newSettings;
  } catch (error) {
    console.error('更新设置失败:', error);
    throw error;
  }
}

/**
 * 保存验证码定位器到本地存储
 * @param {string} domain 网站域名
 * @param {Array} locators 定位器数组
 * @returns {Promise<void>}
 */
export async function saveLocators(domain, locators) {
  try {
    // 获取当前存储的所有定位器
    const data = await chrome.storage.local.get(STORAGE_KEYS.LOCATORS);
    const allLocators = data[STORAGE_KEYS.LOCATORS] || {};
    
    // 更新特定域名的定位器
    allLocators[domain] = locators;
    
    // 保存回存储
    await chrome.storage.local.set({ [STORAGE_KEYS.LOCATORS]: allLocators });
    
    console.log(`已保存 ${locators.length} 个定位器到域名 ${domain}`);
  } catch (error) {
    console.error('保存定位器失败:', error);
    throw error;
  }
}

/**
 * 获取特定域名的验证码定位器
 * @param {string} domain 网站域名
 * @returns {Promise<Array>} 定位器数组
 */
export async function getLocators(domain) {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.LOCATORS);
    const allLocators = data[STORAGE_KEYS.LOCATORS] || {};
    return allLocators[domain] || [];
  } catch (error) {
    console.error('获取定位器失败:', error);
    return [];
  }
}

/**
 * 添加域名到黑名单
 * @param {string} domain 要添加到黑名单的域名
 * @returns {Promise<void>}
 */
export async function addToBlacklist(domain) {
  try {
    const data = await chrome.storage.sync.get(STORAGE_KEYS.DOMAIN_BLACKLIST);
    const blacklist = data[STORAGE_KEYS.DOMAIN_BLACKLIST] || [];
    
    if (!blacklist.includes(domain)) {
      blacklist.push(domain);
      await chrome.storage.sync.set({ [STORAGE_KEYS.DOMAIN_BLACKLIST]: blacklist });
      console.log(`已将域名 ${domain} 添加到黑名单`);
    }
  } catch (error) {
    console.error('添加到黑名单失败:', error);
    throw error;
  }
}

/**
 * 检查域名是否在黑名单中
 * @param {string} domain 要检查的域名
 * @returns {Promise<boolean>} 是否在黑名单中
 */
export async function isBlacklisted(domain) {
  try {
    const data = await chrome.storage.sync.get(STORAGE_KEYS.DOMAIN_BLACKLIST);
    const blacklist = data[STORAGE_KEYS.DOMAIN_BLACKLIST] || [];
    return blacklist.includes(domain);
  } catch (error) {
    console.error('检查黑名单失败:', error);
    return false;
  }
}

/**
 * 记录失败的元素
 * @param {string} domain 网站域名
 * @param {Object} elementInfo 元素信息
 * @returns {Promise<void>}
 */
export async function recordFailedElement(domain, elementInfo) {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.FAILED_ELEMENTS);
    const failedElements = data[STORAGE_KEYS.FAILED_ELEMENTS] || {};
    
    // 初始化这个域名的失败元素数组
    if (!failedElements[domain]) {
      failedElements[domain] = [];
    }
    
    // 添加时间戳
    elementInfo.timestamp = Date.now();
    
    // 添加到数组
    failedElements[domain].push(elementInfo);
    
    // 限制每个域名存储的失败元素数量，防止存储过大
    if (failedElements[domain].length > 50) {
      failedElements[domain] = failedElements[domain].slice(-50);
    }
    
    await chrome.storage.local.set({ [STORAGE_KEYS.FAILED_ELEMENTS]: failedElements });
  } catch (error) {
    console.error('记录失败元素失败:', error);
  }
}

/**
 * 获取域名的失败元素列表
 * @param {string} domain 网站域名
 * @returns {Promise<Array>} 失败元素数组
 */
export async function getFailedElements(domain) {
  try {
    const data = await chrome.storage.local.get(STORAGE_KEYS.FAILED_ELEMENTS);
    const failedElements = data[STORAGE_KEYS.FAILED_ELEMENTS] || {};
    return failedElements[domain] || [];
  } catch (error) {
    console.error('获取失败元素失败:', error);
    return [];
  }
}

/**
 * 缓存数据
 * @param {string} key 缓存键
 * @param {*} data 要缓存的数据
 * @param {number} ttl 缓存有效期(毫秒)
 * @returns {Promise<void>}
 */
export async function cacheData(key, data, ttl = 3600000) {
  try {
    const cacheItem = {
      data,
      expires: Date.now() + ttl
    };
    
    const currentCache = await chrome.storage.local.get(STORAGE_KEYS.CACHE);
    const cache = currentCache[STORAGE_KEYS.CACHE] || {};
    
    cache[key] = cacheItem;
    await chrome.storage.local.set({ [STORAGE_KEYS.CACHE]: cache });
  } catch (error) {
    console.error('缓存数据失败:', error);
  }
}

/**
 * 获取缓存数据
 * @param {string} key 缓存键
 * @returns {Promise<*>} 缓存的数据，如果过期或不存在则返回null
 */
export async function getCachedData(key) {
  try {
    const currentCache = await chrome.storage.local.get(STORAGE_KEYS.CACHE);
    const cache = currentCache[STORAGE_KEYS.CACHE] || {};
    
    if (cache[key] && cache[key].expires > Date.now()) {
      return cache[key].data;
    }
    
    return null;
  } catch (error) {
    console.error('获取缓存数据失败:', error);
    return null;
  }
}

/**
 * 清理过期的缓存
 * @returns {Promise<void>}
 */
export async function cleanExpiredCache() {
  try {
    const currentCache = await chrome.storage.local.get(STORAGE_KEYS.CACHE);
    const cache = currentCache[STORAGE_KEYS.CACHE] || {};
    let hasExpired = false;
    
    // 检查并删除过期的缓存
    for (const key in cache) {
      if (cache[key].expires <= Date.now()) {
        delete cache[key];
        hasExpired = true;
      }
    }
    
    // 只有当有过期项目时才更新存储
    if (hasExpired) {
      await chrome.storage.local.set({ [STORAGE_KEYS.CACHE]: cache });
    }
  } catch (error) {
    console.error('清理过期缓存失败:', error);
  }
}

// 导出存储键以便其他模块使用
export { STORAGE_KEYS }; 