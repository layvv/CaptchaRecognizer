import { API } from '../api/network.js';
import { getItem, setItem } from '../utils/storage.js';
import { CaptchaService } from './captcha/service.js';
import { getUUID } from '../utils/user.js';
import { setting } from './setting.js';
import { Logger } from '../utils/logger.js';

// 初始化API实例
const api = new API();
const logger = new Logger('background');
const captchaService = new CaptchaService(api);

// 确保用户ID存在
let userId;

async function initUserID() {
  userId = await getItem('userId');
  if (!userId) {
    userId = getUUID();
    await setItem('userId', userId);
    logger.info('新用户ID已生成', userId);
  }
}

// 消息处理中心
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'RESOLVE_CAPTCHA') {
    handleResolveCaptcha(request.data, sender, sendResponse);
    return true; // 表示我们将异步发送响应
  } else if (request.type === 'SAVE_LOCATOR') {
    handleSaveLocator(request.data, sendResponse);
    return true;
  } else if (request.type === 'GET_SETTING') {
    sendResponse({ success: true, data: setting });
    return false;
  } else if (request.type === 'UPDATE_SETTING') {
    handleUpdateSetting(request.data, sendResponse);
    return false;
  }
});

// 处理验证码识别请求
async function handleResolveCaptcha(data, sender, sendResponse) {
  try {
    logger.info('接收到验证码识别请求', { domain: data.domain, url: data.url });
    const result = await captchaService.resolveCaptcha(data);
    sendResponse({ success: true, data: result });
  } catch (error) {
    logger.error('验证码识别失败', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 处理Locator保存请求
async function handleSaveLocator(locator, sendResponse) {
  try {
    logger.info('保存验证码定位器', { domain: locator.domain, type: locator.type });
    await captchaService.saveLocator(locator);
    sendResponse({ success: true });
  } catch (error) {
    logger.error('保存验证码定位器失败', error);
    sendResponse({ success: false, error: error.message });
  }
}

// 处理设置更新
function handleUpdateSetting(newSetting, sendResponse) {
  Object.assign(setting, newSetting);
  setItem('setting', setting);
  logger.info('设置已更新', setting);
  sendResponse({ success: true, data: setting });
}

// 扩展安装/更新事件
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    logger.info('扩展已安装');
    initUserID();
  } else if (details.reason === 'update') {
    logger.info('扩展已更新', { oldVersion: details.previousVersion });
  }
});

// 初始化
async function initialize() {
  await initUserID();
  
  // 获取存储的设置
  const storedSetting = await getItem('setting');
  if (storedSetting) {
    Object.assign(setting, storedSetting);
    logger.info('设置已加载', setting);
  }
  
  // 注册标签页更新事件
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      chrome.tabs.sendMessage(tabId, { type: 'TAB_UPDATED', url: tab.url });
    }
  });
  
  logger.info('后台服务初始化完成');
}

initialize();
