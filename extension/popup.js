import { setting } from './core/setting.js';
import { Logger } from './utils/logger.js';
import { getAllLocators } from './utils/storage.js';

const logger = new Logger('popup');

/**
 * 初始化弹出窗口
 */
async function initPopup() {
  logger.info('弹出窗口初始化');
  
  // 加载设置
  loadSettings();
  
  // 加载统计信息
  loadStats();
  
  // 设置事件监听
  setupEventListeners();
}

/**
 * 加载设置到UI
 */
function loadSettings() {
  // 启用/禁用开关
  const enabledSwitch = document.getElementById('enabledSwitch');
  enabledSwitch.checked = setting.enabled;
  
  // 自动解析开关
  const autoResolveSwitch = document.getElementById('autoResolveSwitch');
  autoResolveSwitch.checked = setting.autoResolveIfExistsLocator;
  
  // 自动扫描开关
  const autoScanSwitch = document.getElementById('autoScanSwitch');
  autoScanSwitch.checked = setting.autoScanIfNotExistsLocator;
}

/**
 * 加载统计信息
 */
async function loadStats() {
  try {
    // 获取所有验证码定位器统计
    const locators = await getAllLocators();
    
    // 更新统计数据
    document.getElementById('totalLocators').textContent = locators.length;
    
    // 计算成功率
    let totalSuccess = 0;
    let totalTries = 0;
    
    locators.forEach(locator => {
      totalSuccess += locator.successCount || 0;
      totalTries += locator.tryCount || 0;
    });
    
    const successRate = totalTries > 0 ? ((totalSuccess / totalTries) * 100).toFixed(1) : 0;
    document.getElementById('successRate').textContent = `${successRate}%`;
    
    // 最近识别
    if (locators.length > 0) {
      // 按最后识别时间排序
      const recentLocators = [...locators]
        .filter(l => l.lastResolveTime)
        .sort((a, b) => b.lastResolveTime - a.lastResolveTime)
        .slice(0, 5);
      
      const recentList = document.getElementById('recentList');
      recentList.innerHTML = '';
      
      recentLocators.forEach(locator => {
        const li = document.createElement('li');
        const date = new Date(locator.lastResolveTime).toLocaleString();
        li.textContent = `${locator.domain} - ${date}`;
        recentList.appendChild(li);
      });
    }
  } catch (error) {
    logger.error('加载统计信息失败', error);
  }
}

/**
 * 设置事件监听
 */
function setupEventListeners() {
  // 启用/禁用开关
  const enabledSwitch = document.getElementById('enabledSwitch');
  enabledSwitch.addEventListener('change', () => {
    updateSetting({ enabled: enabledSwitch.checked });
  });
  
  // 自动解析开关
  const autoResolveSwitch = document.getElementById('autoResolveSwitch');
  autoResolveSwitch.addEventListener('change', () => {
    updateSetting({ autoResolveIfExistsLocator: autoResolveSwitch.checked });
  });
  
  // 自动扫描开关
  const autoScanSwitch = document.getElementById('autoScanSwitch');
  autoScanSwitch.addEventListener('change', () => {
    updateSetting({ autoScanIfNotExistsLocator: autoScanSwitch.checked });
  });
  
  // 手动选择按钮
  const manualButton = document.getElementById('manualButton');
  manualButton.addEventListener('click', activateManualMode);
  
  // 清除缓存按钮
  const clearCacheButton = document.getElementById('clearCacheButton');
  clearCacheButton.addEventListener('click', clearAllCache);
  
  // 查看日志按钮
  const viewLogsButton = document.getElementById('viewLogsButton');
  viewLogsButton.addEventListener('click', openLogsPage);
}

/**
 * 更新设置
 * @param {object} newSettings 新设置
 */
async function updateSetting(newSettings) {
  try {
    Object.assign(setting, newSettings);
    
    // 发送到后台保存
    const response = await chrome.runtime.sendMessage({
      type: 'UPDATE_SETTING',
      data: setting
    });
    
    if (response && response.success) {
      logger.info('设置已更新', newSettings);
    } else {
      logger.error('更新设置失败');
    }
  } catch (error) {
    logger.error('更新设置异常', error);
  }
}

/**
 * 激活手动验证码选择模式
 */
async function activateManualMode() {
  try {
    // 获取当前活动标签
    const [activeTab] = await chrome.tabs.query({
      active: true,
      currentWindow: true
    });
    
    if (activeTab) {
      // 发送消息到内容脚本
      chrome.tabs.sendMessage(activeTab.id, {
        type: 'ACTIVATE_MANUAL_MODE'
      });
      
      // 关闭弹出窗口
      window.close();
    }
  } catch (error) {
    logger.error('激活手动模式失败', error);
  }
}

/**
 * 清除所有缓存
 */
async function clearAllCache() {
  if (confirm('确定要清除所有缓存吗？这将删除所有已保存的验证码定位器。')) {
    try {
      await chrome.storage.local.clear();
      logger.info('已清除所有缓存');
      alert('缓存已清除');
      loadStats(); // 重新加载统计信息
    } catch (error) {
      logger.error('清除缓存失败', error);
      alert('清除缓存失败: ' + error.message);
    }
  }
}

/**
 * 打开日志页面
 */
function openLogsPage() {
  chrome.tabs.create({
    url: 'logs.html'
  });
}

// 初始化
document.addEventListener('DOMContentLoaded', initPopup); 