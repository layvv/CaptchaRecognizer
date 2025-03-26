/**
 * 消息处理模块，负责处理浏览器扩展内部通信
 */
import * as api from './api.js';
import * as storage from './storage.js';

// 消息类型定义
export const MESSAGE_TYPES = {
  RECOGNIZE_CAPTCHA: 'recognize_captcha',
  GET_LOCATORS: 'get_locators',
  UPLOAD_LOCATOR: 'upload_locator',
  REPORT_RESULT: 'report_result',
  UPLOAD_SAMPLE: 'upload_sample',
  UPDATE_SETTINGS: 'update_settings',
  GET_SETTINGS: 'get_settings',
  ENABLE_MANUAL_MODE: 'enable_manual_mode',
  DISABLE_MANUAL_MODE: 'disable_manual_mode',
  CHECK_API_STATUS: 'check_api_status',
  SYNC_LOCATORS: 'sync_locators',
  ADD_TO_BLACKLIST: 'add_to_blacklist',
  RECORD_FAILED_ELEMENT: 'record_failed_element'
};

/**
 * 初始化消息监听器
 */
export function initMessageHandler() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender)
      .then(sendResponse)
      .catch(error => {
        console.error('消息处理错误:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // 返回true表示我们将异步发送响应
    return true;
  });
  
  console.log('消息处理器已初始化');
}

/**
 * 处理接收到的消息
 * @param {Object} message 消息对象
 * @param {Object} sender 发送者信息
 * @returns {Promise<Object>} 响应对象
 */
async function handleMessage(message, sender) {
  const { type, data } = message;
  
  try {
    switch (type) {
      case MESSAGE_TYPES.RECOGNIZE_CAPTCHA:
        return await handleRecognizeCaptcha(data);
        
      case MESSAGE_TYPES.GET_LOCATORS:
        return await handleGetLocators(data);
        
      case MESSAGE_TYPES.UPLOAD_LOCATOR:
        return await handleUploadLocator(data);
        
      case MESSAGE_TYPES.REPORT_RESULT:
        return await handleReportResult(data);
        
      case MESSAGE_TYPES.UPLOAD_SAMPLE:
        return await handleUploadSample(data);
        
      case MESSAGE_TYPES.UPDATE_SETTINGS:
        return await handleUpdateSettings(data);
        
      case MESSAGE_TYPES.GET_SETTINGS:
        return await handleGetSettings();
        
      case MESSAGE_TYPES.ENABLE_MANUAL_MODE:
        return await handleEnableManualMode();
        
      case MESSAGE_TYPES.DISABLE_MANUAL_MODE:
        return await handleDisableManualMode();
        
      case MESSAGE_TYPES.CHECK_API_STATUS:
        return await handleCheckApiStatus();
        
      case MESSAGE_TYPES.SYNC_LOCATORS:
        return await handleSyncLocators(data);
        
      case MESSAGE_TYPES.ADD_TO_BLACKLIST:
        return await handleAddToBlacklist(data);
        
      case MESSAGE_TYPES.RECORD_FAILED_ELEMENT:
        return await handleRecordFailedElement(data);
        
      default:
        throw new Error(`未知的消息类型: ${type}`);
    }
  } catch (error) {
    console.error(`处理消息 ${type} 时出错:`, error);
    throw error;
  }
}

/**
 * 处理验证码识别请求
 * @param {Object} data 请求数据
 * @returns {Promise<Object>} 响应对象
 */
async function handleRecognizeCaptcha(data) {
  const { imageData, captchaType = 'char' } = data;
  
  try {
    const result = await api.recognizeCaptcha(imageData, captchaType);
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('验证码识别失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理获取验证码定位器请求
 * @param {Object} data 请求数据
 * @returns {Promise<Object>} 响应对象
 */
async function handleGetLocators(data) {
  const { domain, type = null, useCache = true } = data;
  
  // 首先尝试从本地存储获取
  const localLocators = await storage.getLocators(domain);
  
  // 如果本地有定位器数据，并且允许使用缓存，则直接返回
  if (localLocators.length > 0 && useCache) {
    return {
      success: true,
      locators: localLocators,
      source: 'local'
    };
  }
  
  // 否则从API获取
  try {
    const apiLocators = await api.getLocators(domain, type);
    
    // 保存到本地存储
    if (apiLocators.length > 0) {
      await storage.saveLocators(domain, apiLocators);
    }
    
    return {
      success: true,
      locators: apiLocators,
      source: 'api'
    };
  } catch (error) {
    console.error('获取定位器失败:', error);
    
    // 如果API请求失败但本地有数据，仍然返回本地数据
    if (localLocators.length > 0) {
      return {
        success: true,
        locators: localLocators,
        source: 'local',
        apiError: error.message
      };
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理上传验证码定位器请求
 * @param {Object} data 请求数据
 * @returns {Promise<Object>} 响应对象
 */
async function handleUploadLocator(data) {
  const { locator } = data;
  
  try {
    const result = await api.uploadLocator(locator);
    
    // 同时更新本地存储
    const domain = locator.domain;
    const localLocators = await storage.getLocators(domain);
    
    // 检查是否已存在相同ID的定位器
    const existingIndex = localLocators.findIndex(l => l.id === locator.id);
    
    if (existingIndex >= 0) {
      // 更新已存在的定位器
      localLocators[existingIndex] = locator;
    } else {
      // 添加新定位器
      localLocators.push(locator);
    }
    
    await storage.saveLocators(domain, localLocators);
    
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('上传定位器失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理报告验证码识别结果请求
 * @param {Object} data 请求数据
 * @returns {Promise<Object>} 响应对象
 */
async function handleReportResult(data) {
  const { locatorId, success, details } = data;
  
  try {
    const result = await api.reportRecognitionResult(locatorId, success, details);
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('报告识别结果失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理上传验证码样本请求
 * @param {Object} data 请求数据
 * @returns {Promise<Object>} 响应对象
 */
async function handleUploadSample(data) {
  const { imageData, correctValue, captchaType = 'char' } = data;
  
  // 检查是否允许上传样本
  const settings = await storage.getSettings();
  if (!settings.uploadSamples) {
    return {
      success: false,
      error: '样本上传功能已禁用'
    };
  }
  
  try {
    const result = await api.uploadCaptchaSample(imageData, correctValue, captchaType);
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('上传验证码样本失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理更新设置请求
 * @param {Object} data 新的设置数据
 * @returns {Promise<Object>} 响应对象
 */
async function handleUpdateSettings(data) {
  try {
    const newSettings = await storage.updateSettings(data);
    
    // 如果API URL改变了，更新API模块中的URL
    if (data.apiUrl !== undefined) {
      api.setApiBaseUrl(data.apiUrl);
    }
    
    return {
      success: true,
      settings: newSettings
    };
  } catch (error) {
    console.error('更新设置失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理获取设置请求
 * @returns {Promise<Object>} 响应对象
 */
async function handleGetSettings() {
  try {
    const settings = await storage.getSettings();
    return {
      success: true,
      settings
    };
  } catch (error) {
    console.error('获取设置失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理启用手动模式请求
 * @returns {Promise<Object>} 响应对象
 */
async function handleEnableManualMode() {
  try {
    const settings = await storage.updateSettings({ manualMode: true });
    
    // 通知内容脚本启用手动模式
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'enable_manual_mode'
      });
    }
    
    return {
      success: true,
      settings
    };
  } catch (error) {
    console.error('启用手动模式失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理禁用手动模式请求
 * @returns {Promise<Object>} 响应对象
 */
async function handleDisableManualMode() {
  try {
    const settings = await storage.updateSettings({ manualMode: false });
    
    // 通知内容脚本禁用手动模式
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      await chrome.tabs.sendMessage(tabs[0].id, {
        type: 'disable_manual_mode'
      });
    }
    
    return {
      success: true,
      settings
    };
  } catch (error) {
    console.error('禁用手动模式失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理检查API状态请求
 * @returns {Promise<Object>} 响应对象
 */
async function handleCheckApiStatus() {
  try {
    const isAvailable = await api.checkApiAvailability();
    return {
      success: true,
      isAvailable
    };
  } catch (error) {
    console.error('检查API状态失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理从服务器同步定位器请求
 * @param {Object} data 请求数据
 * @returns {Promise<Object>} 响应对象
 */
async function handleSyncLocators(data) {
  const { domain, type = null, force = false } = data;
  
  try {
    // 强制从API获取最新数据
    const apiLocators = await api.getLocators(domain, type);
    
    // 更新本地存储
    await storage.saveLocators(domain, apiLocators);
    
    return {
      success: true,
      locators: apiLocators,
      count: apiLocators.length
    };
  } catch (error) {
    console.error('同步定位器失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理添加域名到黑名单请求
 * @param {Object} data 请求数据
 * @returns {Promise<Object>} 响应对象
 */
async function handleAddToBlacklist(data) {
  const { domain } = data;
  
  try {
    await storage.addToBlacklist(domain);
    return {
      success: true
    };
  } catch (error) {
    console.error('添加到黑名单失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 处理记录失败元素请求
 * @param {Object} data 请求数据
 * @returns {Promise<Object>} 响应对象
 */
async function handleRecordFailedElement(data) {
  const { domain, elementInfo } = data;
  
  try {
    await storage.recordFailedElement(domain, elementInfo);
    return {
      success: true
    };
  } catch (error) {
    console.error('记录失败元素失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
} 