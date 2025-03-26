/**
 * 选项页面脚本，处理设置的保存、加载和用户交互
 */

// DOM 元素 - 基本设置
const enabledToggle = document.getElementById('enabledToggle');
const autoRecognizeToggle = document.getElementById('autoRecognizeToggle');
const autoFillToggle = document.getElementById('autoFillToggle');
const manualModeToggle = document.getElementById('manualModeToggle');
const apiUrlInput = document.getElementById('apiUrlInput');
const testApiBtn = document.getElementById('testApiBtn');
const apiStatus = document.getElementById('apiStatus');

// DOM 元素 - 高级设置
const uploadSamplesToggle = document.getElementById('uploadSamplesToggle');
const logLevelSelect = document.getElementById('logLevelSelect');
const maxRetriesInput = document.getElementById('maxRetriesInput');
const exportDataBtn = document.getElementById('exportDataBtn');
const importDataBtn = document.getElementById('importDataBtn');
const clearDataBtn = document.getElementById('clearDataBtn');
const importFileInput = document.getElementById('importFileInput');

// DOM 元素 - 黑名单
const blacklistInput = document.getElementById('blacklistInput');
const addBlacklistBtn = document.getElementById('addBlacklistBtn');
const blacklistTable = document.getElementById('blacklistTable');

// DOM 元素 - 日志
const logFilterSelect = document.getElementById('logFilterSelect');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const logsContent = document.getElementById('logsContent');

// DOM 元素 - 关于
const aboutVersion = document.getElementById('aboutVersion');
const versionNumber = document.getElementById('versionNumber');

// DOM 元素 - 页脚
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const saveStatus = document.getElementById('saveStatus');

// 当前设置
let currentSettings = {};

// 黑名单数据
let blacklistData = [];

// 日志数据
let logsData = [];

/**
 * 初始化选项页面
 */
async function initOptions() {
  // 显示版本号
  const manifest = chrome.runtime.getManifest();
  versionNumber.textContent = manifest.version;
  aboutVersion.textContent = manifest.version;
  
  // 加载设置
  await loadSettings();
  
  // 加载黑名单
  await loadBlacklist();
  
  // 加载日志
  await loadLogs();
  
  // 设置标签切换
  setupTabs();
  
  // 设置事件监听器
  setupEventListeners();
}

/**
 * 加载设置
 */
async function loadSettings() {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'get_settings'
    });
    
    if (response && response.success) {
      currentSettings = response.settings;
      
      // 更新界面
      updateSettingsUI(currentSettings);
    } else {
      showSaveStatus('加载设置失败', false);
    }
  } catch (error) {
    console.error('加载设置失败:', error);
    showSaveStatus('加载设置失败: ' + error.message, false);
  }
}

/**
 * 更新设置界面
 * @param {Object} settings 设置对象
 */
function updateSettingsUI(settings) {
  // 基本设置
  enabledToggle.checked = settings.enabled;
  autoRecognizeToggle.checked = settings.autoRecognize;
  autoFillToggle.checked = settings.autoFill;
  manualModeToggle.checked = settings.manualMode;
  apiUrlInput.value = settings.apiUrl || 'http://localhost:5000/api';
  
  // 高级设置
  uploadSamplesToggle.checked = settings.uploadSamples;
  logLevelSelect.value = settings.logLevel || 'info';
  maxRetriesInput.value = settings.maxRetries || 3;
}

/**
 * 获取当前设置对象
 * @returns {Object} 设置对象
 */
function getCurrentSettings() {
  return {
    enabled: enabledToggle.checked,
    autoRecognize: autoRecognizeToggle.checked,
    autoFill: autoFillToggle.checked,
    manualMode: manualModeToggle.checked,
    apiUrl: apiUrlInput.value.trim(),
    uploadSamples: uploadSamplesToggle.checked,
    logLevel: logLevelSelect.value,
    maxRetries: parseInt(maxRetriesInput.value, 10)
  };
}

/**
 * 保存设置
 */
async function saveSettings() {
  try {
    const newSettings = getCurrentSettings();
    
    const response = await chrome.runtime.sendMessage({
      type: 'update_settings',
      data: { settings: newSettings }
    });
    
    if (response && response.success) {
      currentSettings = response.settings;
      showSaveStatus('设置已保存', true);
    } else {
      showSaveStatus('保存设置失败', false);
    }
  } catch (error) {
    console.error('保存设置失败:', error);
    showSaveStatus('保存设置失败: ' + error.message, false);
  }
}

/**
 * 重置设置为默认值
 */
async function resetSettings() {
  if (confirm('确定要恢复所有设置到默认值吗？')) {
    try {
      // 发送空对象使用默认设置
      const response = await chrome.runtime.sendMessage({
        type: 'update_settings',
        data: { settings: {} }
      });
      
      if (response && response.success) {
        currentSettings = response.settings;
        updateSettingsUI(currentSettings);
        showSaveStatus('已恢复默认设置', true);
      } else {
        showSaveStatus('恢复设置失败', false);
      }
    } catch (error) {
      console.error('恢复设置失败:', error);
      showSaveStatus('恢复设置失败: ' + error.message, false);
    }
  }
}

/**
 * 显示保存状态
 * @param {string} message 状态消息
 * @param {boolean} success 是否成功
 */
function showSaveStatus(message, success) {
  saveStatus.textContent = message;
  saveStatus.className = success ? 'save-status success' : 'save-status error';
  
  // 3秒后隐藏
  setTimeout(() => {
    saveStatus.style.opacity = '0';
    setTimeout(() => {
      saveStatus.textContent = '';
      saveStatus.style.opacity = '1';
    }, 500);
  }, 3000);
}

/**
 * 测试API连接
 */
async function testApiConnection() {
  apiStatus.textContent = '正在连接...';
  apiStatus.className = 'status';
  
  try {
    const url = apiUrlInput.value.trim();
    
    if (!url) {
      apiStatus.textContent = '请输入API服务器URL';
      apiStatus.className = 'status error';
      return;
    }
    
    // 先保存新的API URL
    await chrome.runtime.sendMessage({
      type: 'update_settings',
      data: { settings: { apiUrl: url } }
    });
    
    // 然后测试连接
    const response = await chrome.runtime.sendMessage({
      type: 'check_api_status'
    });
    
    if (response && response.success) {
      if (response.isAvailable) {
        apiStatus.textContent = '连接成功';
        apiStatus.className = 'status success';
      } else {
        apiStatus.textContent = '连接失败: 服务不可用';
        apiStatus.className = 'status error';
      }
    } else {
      apiStatus.textContent = '连接失败: ' + (response?.error || '未知错误');
      apiStatus.className = 'status error';
    }
  } catch (error) {
    console.error('测试API连接失败:', error);
    apiStatus.textContent = '连接失败: ' + error.message;
    apiStatus.className = 'status error';
  }
}

/**
 * 加载黑名单
 */
async function loadBlacklist() {
  try {
    const data = await chrome.storage.sync.get('domainBlacklist');
    blacklistData = data.domainBlacklist || [];
    
    // 更新显示
    updateBlacklistUI();
  } catch (error) {
    console.error('加载黑名单失败:', error);
  }
}

/**
 * 更新黑名单显示
 */
function updateBlacklistUI() {
  blacklistTable.innerHTML = '';
  
  if (blacklistData.length === 0) {
    blacklistTable.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">黑名单为空</td></tr>';
    return;
  }
  
  for (const item of blacklistData) {
    const tr = document.createElement('tr');
    
    const domainTd = document.createElement('td');
    domainTd.textContent = item.domain || item; // 兼容旧格式
    
    const timeTd = document.createElement('td');
    if (item.timestamp) {
      const date = new Date(item.timestamp);
      timeTd.textContent = date.toLocaleString();
    } else {
      timeTd.textContent = '未知';
    }
    
    const actionTd = document.createElement('td');
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '移除';
    removeBtn.className = 'btn danger-btn';
    removeBtn.style.padding = '4px 8px';
    removeBtn.style.fontSize = '12px';
    removeBtn.onclick = () => removeFromBlacklist(item.domain || item);
    actionTd.appendChild(removeBtn);
    
    tr.appendChild(domainTd);
    tr.appendChild(timeTd);
    tr.appendChild(actionTd);
    
    blacklistTable.appendChild(tr);
  }
}

/**
 * 添加域名到黑名单
 */
async function addToBlacklist() {
  const domain = blacklistInput.value.trim();
  
  if (!domain) {
    alert('请输入域名');
    return;
  }
  
  try {
    // 检查是否已存在
    const exists = blacklistData.some(item => 
      (item.domain && item.domain === domain) || item === domain
    );
    
    if (exists) {
      alert(`${domain} 已在黑名单中`);
      return;
    }
    
    // 添加到黑名单
    const newItem = {
      domain,
      timestamp: Date.now()
    };
    
    blacklistData.push(newItem);
    
    // 保存到存储
    await chrome.storage.sync.set({ domainBlacklist: blacklistData });
    
    // 更新显示
    updateBlacklistUI();
    
    // 清空输入框
    blacklistInput.value = '';
  } catch (error) {
    console.error('添加到黑名单失败:', error);
    alert('添加到黑名单失败: ' + error.message);
  }
}

/**
 * 从黑名单中移除域名
 * @param {string} domain 要移除的域名
 */
async function removeFromBlacklist(domain) {
  try {
    blacklistData = blacklistData.filter(item => 
      (item.domain && item.domain !== domain) || item !== domain
    );
    
    // 保存到存储
    await chrome.storage.sync.set({ domainBlacklist: blacklistData });
    
    // 更新显示
    updateBlacklistUI();
  } catch (error) {
    console.error('从黑名单移除失败:', error);
    alert('从黑名单移除失败: ' + error.message);
  }
}

/**
 * 加载日志
 */
async function loadLogs() {
  try {
    const data = await chrome.storage.local.get('logs');
    logsData = data.logs || [];
    
    // 更新显示
    updateLogsUI();
  } catch (error) {
    console.error('加载日志失败:', error);
  }
}

/**
 * 更新日志显示
 */
function updateLogsUI() {
  logsContent.innerHTML = '';
  
  if (logsData.length === 0) {
    logsContent.innerHTML = '<div class="no-logs">暂无日志</div>';
    return;
  }
  
  const filter = logFilterSelect.value;
  
  // 对日志进行排序，最新的在前面
  const sortedLogs = [...logsData].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
  
  for (const log of sortedLogs) {
    // 根据过滤条件筛选
    if (filter === 'error' && log.level !== 'ERROR') continue;
    if (filter === 'success' && log.level !== 'INFO') continue;
    
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    if (log.level === 'ERROR') {
      logEntry.classList.add('error');
    } else if (log.level === 'INFO') {
      logEntry.classList.add('success');
    }
    
    const timestamp = document.createElement('div');
    timestamp.className = 'log-timestamp';
    timestamp.textContent = new Date(log.timestamp).toLocaleString();
    
    const content = document.createElement('div');
    content.className = 'log-content';
    content.textContent = `[${log.level}] [${log.context}] ${log.message}`;
    
    logEntry.appendChild(timestamp);
    logEntry.appendChild(content);
    
    if (log.details) {
      const details = document.createElement('div');
      details.className = 'log-details';
      details.textContent = log.details;
      logEntry.appendChild(details);
    }
    
    logsContent.appendChild(logEntry);
  }
}

/**
 * 清除日志
 */
async function clearLogs() {
  if (confirm('确定要清除所有日志吗？')) {
    try {
      await chrome.storage.local.remove('logs');
      logsData = [];
      updateLogsUI();
    } catch (error) {
      console.error('清除日志失败:', error);
      alert('清除日志失败: ' + error.message);
    }
  }
}

/**
 * 导出数据
 */
function exportData() {
  try {
    const exportData = {
      settings: currentSettings,
      blacklist: blacklistData,
      timestamp: Date.now(),
      version: chrome.runtime.getManifest().version
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `captcha-recognizer-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出数据失败:', error);
    alert('导出数据失败: ' + error.message);
  }
}

/**
 * 导入数据
 */
function importData() {
  importFileInput.click();
}

/**
 * 处理导入文件
 */
function handleImportFile() {
  const file = importFileInput.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      
      if (!data.settings) {
        throw new Error('导入的文件格式不正确');
      }
      
      // 导入设置
      if (data.settings) {
        await chrome.runtime.sendMessage({
          type: 'update_settings',
          data: { settings: data.settings }
        });
        currentSettings = data.settings;
        updateSettingsUI(currentSettings);
      }
      
      // 导入黑名单
      if (data.blacklist) {
        blacklistData = data.blacklist;
        await chrome.storage.sync.set({ domainBlacklist: blacklistData });
        updateBlacklistUI();
      }
      
      showSaveStatus('导入数据成功', true);
    } catch (error) {
      console.error('导入数据失败:', error);
      showSaveStatus('导入数据失败: ' + error.message, false);
    }
  };
  
  reader.readAsText(file);
}

/**
 * 清除所有数据
 */
async function clearAllData() {
  if (confirm('确定要清除所有数据吗？这将删除所有设置、黑名单和缓存数据。')) {
    try {
      // 恢复默认设置
      await chrome.runtime.sendMessage({
        type: 'update_settings',
        data: { settings: {} }
      });
      
      // 清除黑名单
      await chrome.storage.sync.remove('domainBlacklist');
      
      // 清除日志
      await chrome.storage.local.remove('logs');
      
      // 清除缓存数据
      await chrome.storage.local.remove('cache');
      
      // 重新加载页面
      window.location.reload();
    } catch (error) {
      console.error('清除数据失败:', error);
      showSaveStatus('清除数据失败: ' + error.message, false);
    }
  }
}

/**
 * 设置标签切换
 */
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      // 移除所有激活状态
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // 设置当前标签为激活
      button.classList.add('active');
      const tabId = button.dataset.tab;
      document.getElementById(tabId).classList.add('active');
    });
  });
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
  // 保存按钮
  saveBtn.addEventListener('click', saveSettings);
  
  // 重置按钮
  resetBtn.addEventListener('click', resetSettings);
  
  // 测试API连接
  testApiBtn.addEventListener('click', testApiConnection);
  
  // 添加黑名单
  addBlacklistBtn.addEventListener('click', addToBlacklist);
  blacklistInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addToBlacklist();
    }
  });
  
  // 清除日志
  clearLogsBtn.addEventListener('click', clearLogs);
  
  // 日志过滤
  logFilterSelect.addEventListener('change', updateLogsUI);
  
  // 数据管理
  exportDataBtn.addEventListener('click', exportData);
  importDataBtn.addEventListener('click', importData);
  clearDataBtn.addEventListener('click', clearAllData);
  
  // 导入文件处理
  importFileInput.addEventListener('change', handleImportFile);
}

// 初始化选项页面
document.addEventListener('DOMContentLoaded', initOptions);