/**
 * 弹出界面脚本，处理用户交互和状态显示
 */

// DOM 元素
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const apiStatus = document.getElementById('apiStatus');
const enabledToggle = document.getElementById('enabledToggle');
const scanNowBtn = document.getElementById('scanNowBtn');
const manualModeBtn = document.getElementById('manualModeBtn');
const sessionCount = document.getElementById('sessionCount');
const successRate = document.getElementById('successRate');
const currentDomain = document.getElementById('currentDomain');
const blacklistBtn = document.getElementById('blacklistBtn');
const captchaInfo = document.getElementById('captchaInfo');
const optionsBtn = document.getElementById('optionsBtn');
const versionNumber = document.getElementById('versionNumber');

// 统计数据
let stats = {
  sessionCount: 0,
  successCount: 0
};

// 当前标签页信息
let currentTab = null;

/**
 * 初始化弹出界面
 */
async function initPopup() {
  // 显示版本号
  versionNumber.textContent = chrome.runtime.getManifest().version;
  
  // 获取当前标签页
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tabs.length > 0) {
    currentTab = tabs[0];
    updateCurrentSite(currentTab.url);
  }
  
  // 获取设置和状态
  await loadSettings();
  
  // 检查API状态
  checkApiStatus();
  
  // 获取统计数据
  loadStats();
  
  // 设置事件监听器
  setupEventListeners();
}

/**
 * 更新当前网站信息
 * @param {string} url 当前URL
 */
function updateCurrentSite(url) {
  try {
    const urlObj = new URL(url);
    currentDomain.textContent = urlObj.hostname;
    
    // 检查网站上是否存在验证码
    checkCaptchasOnPage();
  } catch (error) {
    currentDomain.textContent = '无效的URL';
  }
}

/**
 * 加载扩展设置
 */
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'get_settings'
    });
    
    if (response && response.success) {
      const settings = response.settings;
      
      // 更新开关状态
      enabledToggle.checked = settings.enabled && settings.autoRecognize;
      
      // 更新界面状态
      updateStatus(settings.enabled);
      
      // 手动模式按钮状态
      manualModeBtn.classList.toggle('active', settings.manualMode);
    }
  } catch (error) {
    console.error('加载设置失败:', error);
    updateStatus(false, '加载设置失败');
  }
}

/**
 * 检查API状态
 */
async function checkApiStatus() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'check_api_status'
    });
    
    if (response && response.success) {
      apiStatus.textContent = `API服务: ${response.isAvailable ? '在线' : '离线'}`;
      apiStatus.classList.toggle('offline', !response.isAvailable);
    } else {
      apiStatus.textContent = 'API服务: 状态未知';
      apiStatus.classList.add('offline');
    }
  } catch (error) {
    apiStatus.textContent = 'API服务: 连接错误';
    apiStatus.classList.add('offline');
  }
}

/**
 * 加载统计数据
 */
async function loadStats() {
  try {
    // 从存储加载统计数据
    const data = await chrome.storage.local.get('recognitionStats');
    if (data.recognitionStats) {
      stats = data.recognitionStats;
    }
    
    updateStatsDisplay();
  } catch (error) {
    console.error('加载统计数据失败:', error);
  }
}

/**
 * 更新统计显示
 */
function updateStatsDisplay() {
  sessionCount.textContent = stats.sessionCount;
  
  const rate = stats.sessionCount > 0 
    ? Math.round((stats.successCount / stats.sessionCount) * 100) 
    : 0;
  
  successRate.textContent = `${rate}%`;
}

/**
 * 检查当前页面上的验证码
 */
async function checkCaptchasOnPage() {
  if (!currentTab) return;
  
  try {
    // 向内容脚本发送消息
    const response = await chrome.tabs.sendMessage(currentTab.id, {
      type: 'get_captcha_info'
    });
    
    if (response && response.success) {
      if (response.captchas && response.captchas.length > 0) {
        captchaInfo.innerHTML = `
          <span>检测到 ${response.captchas.length} 个验证码</span>
          <ul>
            ${response.captchas.map(c => `
              <li>${c.type} 类型${c.processed ? ' (已处理)' : ''}</li>
            `).join('')}
          </ul>
        `;
      } else {
        captchaInfo.innerHTML = '<span>未检测到验证码</span>';
      }
    }
  } catch (error) {
    // 内容脚本可能未加载或无法通信
    captchaInfo.innerHTML = '<span>无法获取验证码信息</span>';
  }
}

/**
 * 更新扩展状态显示
 * @param {boolean} isEnabled 是否启用
 * @param {string} message 状态消息
 */
function updateStatus(isEnabled, message = null) {
  if (isEnabled) {
    statusDot.classList.add('active');
    statusDot.classList.remove('error');
    statusText.textContent = message || '已启用';
    scanNowBtn.disabled = false;
  } else {
    statusDot.classList.remove('active');
    statusDot.classList.add('error');
    statusText.textContent = message || '已禁用';
    scanNowBtn.disabled = true;
  }
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  // 开关切换
  enabledToggle.addEventListener('change', async () => {
    const enabled = enabledToggle.checked;
    
    try {
      await chrome.runtime.sendMessage({
        type: 'update_settings',
        data: { 
          settings: { 
            enabled,
            autoRecognize: enabled
          } 
        }
      });
      
      // 更新界面状态
      updateStatus(enabled);
      
      // 通知内容脚本
      if (currentTab) {
        chrome.tabs.sendMessage(currentTab.id, {
          type: 'update_settings',
          data: { 
            settings: { 
              enabled,
              autoRecognize: enabled
            } 
          }
        }).catch(() => {
          // 内容脚本可能未加载，忽略错误
        });
      }
    } catch (error) {
      console.error('更新设置失败:', error);
      // 恢复开关状态
      enabledToggle.checked = !enabled;
      updateStatus(!enabled, '更新设置失败');
    }
  });
  
  // 立即扫描按钮
  scanNowBtn.addEventListener('click', async () => {
    if (!currentTab) return;
    
    try {
      await chrome.tabs.sendMessage(currentTab.id, {
        type: 'scan_now'
      });
      
      // 更新验证码信息显示
      setTimeout(checkCaptchasOnPage, 1000);
    } catch (error) {
      console.error('发送扫描命令失败:', error);
    }
  });
  
  // 手动模式按钮
  manualModeBtn.addEventListener('click', async () => {
    if (!currentTab) return;
    
    // 切换手动模式
    const isActive = manualModeBtn.classList.contains('active');
    
    try {
      const type = isActive ? 'disable_manual_mode' : 'enable_manual_mode';
      
      await chrome.runtime.sendMessage({ type });
      
      // 更新按钮状态
      manualModeBtn.classList.toggle('active');
    } catch (error) {
      console.error('切换手动模式失败:', error);
    }
  });
  
  // 黑名单按钮
  blacklistBtn.addEventListener('click', async () => {
    if (!currentTab) return;
    
    try {
      const domain = new URL(currentTab.url).hostname;
      
      const confirmed = confirm(`是否将 ${domain} 添加到黑名单？\n黑名单网站将不会自动识别验证码。`);
      
      if (confirmed) {
        await chrome.runtime.sendMessage({
          type: 'add_to_blacklist',
          data: { domain }
        });
        
        // 更新状态
        updateStatus(false, '已加入黑名单');
        enabledToggle.checked = false;
      }
    } catch (error) {
      console.error('添加到黑名单失败:', error);
      alert('添加到黑名单失败: ' + error.message);
    }
  });
  
  // 选项按钮
  optionsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
}

// 初始化弹出界面
document.addEventListener('DOMContentLoaded', initPopup);

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'captcha_processed') {
    // 更新统计数据
    stats.sessionCount++;
    if (message.success) {
      stats.successCount++;
    }
    
    // 保存统计数据
    chrome.storage.local.set({ recognitionStats: stats });
    
    // 更新显示
    updateStatsDisplay();
    checkCaptchasOnPage();
  }
  else if (message.type === 'update_captcha_info') {
    // 更新验证码信息显示
    updateCaptchaInfoDisplay(message.captchas);
  }
  
  return false; // 不使用异步响应
});

/**
 * 更新验证码信息显示
 * @param {Array} captchas 验证码数组
 */
function updateCaptchaInfoDisplay(captchas) {
  if (!captchas || captchas.length === 0) {
    captchaInfo.innerHTML = '<span>未检测到验证码</span>';
    return;
  }
  
  captchaInfo.innerHTML = `
    <span>检测到 ${captchas.length} 个验证码</span>
    <ul>
      ${captchas.map(c => `
        <li>${c.type} 类型${c.processed ? ' (已处理)' : ''}</li>
      `).join('')}
    </ul>
  `;
} 