/**
 * 后台脚本，扩展的主控制中心
 */
import * as api from './api.js';
import * as storage from './storage.js';
import { initMessageHandler } from './message-handler.js';

// 扩展安装或更新时的处理
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    console.log('验证码识别扩展已安装');
    // 初始化设置
    await storage.updateSettings({});
    
    // 打开选项页面
    chrome.runtime.openOptionsPage();
  } else if (details.reason === 'update') {
    console.log(`扩展已更新到版本 ${chrome.runtime.getManifest().version}`);
    // 更新后的处理逻辑
    await handleExtensionUpdate(details.previousVersion);
  }
});

/**
 * 处理扩展更新
 * @param {string} previousVersion 上一个版本号
 */
async function handleExtensionUpdate(previousVersion) {
  // 版本迁移逻辑
  const currentVersion = chrome.runtime.getManifest().version;
  console.log(`从版本 ${previousVersion} 更新到 ${currentVersion}`);
  
  // 可以在这里添加版本迁移代码
  // 例如，修改存储结构、更新设置等
}

// 设置定期清理过期缓存的任务
chrome.alarms.create('cleanCache', {
  periodInMinutes: 60 // 每小时清理一次
});

// 处理定时任务
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanCache') {
    storage.cleanExpiredCache()
      .then(() => console.log('缓存清理完成'))
      .catch(error => console.error('缓存清理失败:', error));
  }
});

// 当有标签页更新时，检查是否需要初始化内容脚本
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // 仅在HTTP或HTTPS页面上初始化
    if (tab.url.startsWith('http')) {
      initContentScript(tabId, tab.url);
    }
  }
});

/**
 * 初始化标签页的内容脚本
 * @param {number} tabId 标签页ID
 * @param {string} url 标签页URL
 */
async function initContentScript(tabId, url) {
  try {
    // 获取当前设置
    const settings = await storage.getSettings();
    
    // 如果扩展被禁用，不执行任何操作
    if (!settings.enabled) {
      return;
    }
    
    // 解析域名
    const domain = new URL(url).hostname;
    
    // 检查域名是否在黑名单中
    const blacklisted = await storage.isBlacklisted(domain);
    if (blacklisted) {
      console.log(`域名 ${domain} 在黑名单中，跳过处理`);
      return;
    }
    
    // 获取该域名的验证码定位器
    let locatorsData;
    try {
      locatorsData = await chrome.runtime.sendMessage({
        type: 'get_locators',
        data: { domain }
      });
    } catch (error) {
      console.error('获取定位器失败:', error);
      return;
    }
    
    // 发送初始化消息到内容脚本
    chrome.tabs.sendMessage(tabId, {
      type: 'init',
      data: {
        settings,
        domain,
        locators: locatorsData?.locators || []
      }
    }).catch(error => {
      // 内容脚本可能尚未加载，这是正常的
      if (error.message.includes('Could not establish connection')) {
        console.log('内容脚本尚未加载，稍后再试');
      } else {
        console.error('发送初始化消息失败:', error);
      }
    });
  } catch (error) {
    console.error('初始化内容脚本失败:', error);
  }
}

// 初始化消息处理器
initMessageHandler();

// 在后台脚本启动时检查API服务可用性
checkApiAvailability();

/**
 * 检查API服务可用性
 */
async function checkApiAvailability() {
  try {
    const isAvailable = await api.checkApiAvailability();
    console.log(`API服务${isAvailable ? '可用' : '不可用'}`);
    
    // 如果API不可用，可以设置一个定时任务来定期检查
    if (!isAvailable) {
      chrome.alarms.create('checkApi', {
        periodInMinutes: 5 // 每5分钟检查一次
      });
    } else {
      // 如果API可用，取消定时检查任务
      chrome.alarms.clear('checkApi');
    }
  } catch (error) {
    console.error('检查API服务可用性失败:', error);
  }
}

console.log('后台脚本已启动'); 