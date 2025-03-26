/**
 * 内容脚本，运行在网页上下文中，负责识别和处理验证码
 */
import { LocatorManager } from './locator/locator-manager.js';
import { FillerFactory } from './filler/filler.js';
import { Logger } from './utils/logger.js';

// 初始化日志记录器
const logger = new Logger('CaptchaRecognizer');

// 定位器管理器
let locatorManager = null;

// 扩展设置
let settings = {
  enabled: true,
  autoRecognize: true,
  autoFill: true,
  manualMode: false,
  maxRetries: 3
};

// 当前域名
let currentDomain = '';

// 手动模式相关
let manualModeActive = false;
let manualModeOverlay = null;

/**
 * 初始化内容脚本
 */
async function initialize() {
  logger.info('初始化验证码识别器内容脚本');
  
  // 获取当前域名
  currentDomain = window.location.hostname;
  
  // 创建定位器管理器
  locatorManager = new LocatorManager(currentDomain);
  
  // 从后台脚本获取设置和定位器
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'get_settings'
    });
    
    if (response && response.success) {
      settings = response.settings;
      logger.setLevel(settings.logLevel || 'info');
      logger.info('已加载设置', settings);
    }
    
    // 获取当前域名的验证码定位器
    const locatorsResponse = await chrome.runtime.sendMessage({
      type: 'get_locators',
      data: { domain: currentDomain }
    });
    
    if (locatorsResponse && locatorsResponse.success) {
      locatorManager.init(locatorsResponse.locators, settings);
      logger.info(`已加载 ${locatorsResponse.locators.length} 个验证码定位器`);
    }
  } catch (error) {
    logger.error('初始化失败:', error);
  }
  
  // 开始自动检测验证码
  if (settings.enabled && settings.autoRecognize) {
    startAutomaticDetection();
  }
  
  // 启用手动模式（如果设置中启用）
  if (settings.manualMode) {
    enableManualMode();
  }
  
  logger.info('内容脚本初始化完成');
}

/**
 * 开始自动检测验证码
 */
async function startAutomaticDetection() {
  logger.info('开始自动检测验证码');
  
  try {
    // 等待页面完全加载
    if (document.readyState !== 'complete') {
      await new Promise(resolve => {
        window.addEventListener('load', resolve, { once: true });
        // 设置超时
        setTimeout(resolve, 5000);
      });
    }
    
    // 等待一小段时间确保所有内容都已加载
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 扫描验证码
    const captchas = await locatorManager.scanForCaptchas();
    
    if (captchas.length === 0) {
      logger.info('未检测到验证码');
      return;
    }
    
    logger.info(`检测到 ${captchas.length} 个验证码`);
    
    // 处理每个验证码
    for (const captcha of captchas) {
      if (settings.autoFill) {
        processCaptcha(captcha.element, captcha.locator);
      } else {
        // 如果不自动填充，则只高亮显示验证码
        highlightCaptchaElement(captcha.element);
      }
    }
  } catch (error) {
    logger.error('自动检测失败:', error);
  }
}

/**
 * 处理验证码
 * @param {HTMLElement} captchaElement 验证码元素
 * @param {Object} locator 验证码定位器
 */
async function processCaptcha(captchaElement, locator) {
  try {
    logger.info('开始处理验证码');
    
    // 高亮显示验证码元素
    highlightCaptchaElement(captchaElement);
    
    // 使用填充器处理验证码
    const result = await FillerFactory.processCaptcha(
      locator.type,
      captchaElement,
      locator,
      settings
    );
    
    if (result.success) {
      logger.info('验证码处理成功:', result);
      
      // 添加标记，表示此验证码已被处理
      captchaElement.dataset.processed = 'true';
      
      // 通知popup验证码已处理
      chrome.runtime.sendMessage({
        type: 'captcha_processed',
        success: true,
        text: result.text,
        confidence: result.confidence
      }).catch(err => {
        // 忽略错误，popup可能未打开
        logger.debug('发送处理结果通知失败:', err);
      });
      
      // 清除高亮
      setTimeout(() => {
        removeHighlight(captchaElement);
      }, 2000);
      
      // 如果成功识别，可能需要更新定位器
      if (locator.creator === 'auto') {
        // 这是一个自动检测的定位器，上传到服务器
        try {
          const uploadResult = await locatorManager.uploadLocator(locator);
          logger.info('已上传新的验证码定位器', uploadResult);
        } catch (error) {
          logger.error('上传定位器失败:', error);
        }
      }
    } else {
      logger.warn('验证码处理失败:', result);
      
      // 显示失败高亮
      highlightCaptchaElement(captchaElement, 'error');
      
      // 启用手动模式辅助用户
      if (!manualModeActive && settings.enabled) {
        logger.info('自动处理失败，启用手动模式');
        enableManualMode();
      }
    }
  } catch (error) {
    logger.error('处理验证码时出错:', error);
    highlightCaptchaElement(captchaElement, 'error');
  }
}

/**
 * 高亮显示验证码元素
 * @param {HTMLElement} element 要高亮的元素
 * @param {string} type 高亮类型 (normal|error)
 */
function highlightCaptchaElement(element, type = 'normal') {
  // 防止重复添加高亮
  removeHighlight(element);
  
  // 创建高亮边框
  const highlight = document.createElement('div');
  highlight.className = 'captcha-recognizer-highlight';
  highlight.dataset.highlightType = type;
  
  // 设置样式
  const rect = element.getBoundingClientRect();
  const styles = {
    position: 'absolute',
    boxSizing: 'border-box',
    zIndex: '9999',
    left: `${window.scrollX + rect.left - 5}px`,
    top: `${window.scrollY + rect.top - 5}px`,
    width: `${rect.width + 10}px`,
    height: `${rect.height + 10}px`,
    border: type === 'normal' ? '2px solid #4CAF50' : '2px solid #F44336',
    borderRadius: '3px',
    pointerEvents: 'none',
    transition: 'all 0.3s ease'
  };
  
  Object.assign(highlight.style, styles);
  
  // 添加到文档
  document.body.appendChild(highlight);
  
  // 添加引用
  element.dataset.highlightId = Date.now().toString();
  highlight.dataset.targetId = element.dataset.highlightId;
  
  // 自动移除高亮
  setTimeout(() => {
    if (highlight.parentNode) {
      highlight.style.opacity = '0.5';
    }
  }, 1000);
}

/**
 * 移除元素的高亮效果
 * @param {HTMLElement} element 要移除高亮的元素
 */
function removeHighlight(element) {
  if (!element.dataset.highlightId) return;
  
  const highlights = document.querySelectorAll(`.captcha-recognizer-highlight[data-target-id="${element.dataset.highlightId}"]`);
  
  for (const highlight of highlights) {
    if (highlight.parentNode) {
      highlight.parentNode.removeChild(highlight);
    }
  }
}

/**
 * 启用手动模式
 * 允许用户手动点击验证码图片
 */
function enableManualMode() {
  if (manualModeActive) return;
  
  manualModeActive = true;
  
  // 创建覆盖层
  manualModeOverlay = document.createElement('div');
  manualModeOverlay.className = 'captcha-recognizer-manual-mode';
  
  const styles = {
    position: 'fixed',
    top: '10px',
    right: '10px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: 'white',
    padding: '10px 15px',
    borderRadius: '5px',
    zIndex: '999999',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
    pointerEvents: 'auto',
    cursor: 'pointer'
  };
  
  Object.assign(manualModeOverlay.style, styles);
  
  manualModeOverlay.textContent = '验证码识别：手动模式（点击此处关闭）';
  
  // 添加关闭按钮的事件
  manualModeOverlay.addEventListener('click', disableManualMode);
  
  // 添加到文档
  document.body.appendChild(manualModeOverlay);
  
  // 添加点击事件以捕获验证码图片
  document.addEventListener('click', handleManualClick, true);
  
  logger.info('已启用手动模式');
}

/**
 * 处理手动点击事件
 * @param {MouseEvent} event 鼠标事件
 */
async function handleManualClick(event) {
  // 忽略对覆盖层自身的点击
  if (event.target === manualModeOverlay) return;
  
  // 检查点击的是否是图片或可能的验证码容器
  const element = event.target;
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'img' || (element.querySelector('img') !== null)) {
    // 阻止默认行为和事件传播
    event.preventDefault();
    event.stopPropagation();
    
    try {
      // 高亮显示选中的元素
      highlightCaptchaElement(element);
      
      // 创建一个新的定位器
      const imgElement = tagName === 'img' ? element : element.querySelector('img');
      
      if (!imgElement) {
        logger.warn('未找到图片元素');
        return;
      }
      
      // 创建定位器
      const locator = locatorManager.createLocatorFromElement(imgElement, 'char');
      
      // 处理验证码
      await processCaptcha(imgElement, locator);
      
      // 自动禁用手动模式
      setTimeout(disableManualMode, 2000);
    } catch (error) {
      logger.error('手动处理验证码失败:', error);
    }
  }
}

/**
 * 禁用手动模式
 */
function disableManualMode() {
  if (!manualModeActive) return;
  
  manualModeActive = false;
  
  // 移除事件监听器
  document.removeEventListener('click', handleManualClick, true);
  
  // 移除覆盖层
  if (manualModeOverlay && manualModeOverlay.parentNode) {
    manualModeOverlay.parentNode.removeChild(manualModeOverlay);
    manualModeOverlay = null;
  }
  
  logger.info('已禁用手动模式');
}

/**
 * 处理来自后台脚本的消息
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    const { type, data } = message;
    
    switch (type) {
      case 'init':
        // 重新初始化
        if (data) {
          if (data.settings) {
            settings = data.settings;
          }
          if (data.locators) {
            locatorManager.init(data.locators, settings);
          }
        }
        sendResponse({ success: true });
        break;
        
      case 'enable_manual_mode':
        enableManualMode();
        sendResponse({ success: true });
        break;
        
      case 'disable_manual_mode':
        disableManualMode();
        sendResponse({ success: true });
        break;
        
      case 'scan_now':
        startAutomaticDetection();
        sendResponse({ success: true });
        break;
        
      case 'update_settings':
        if (data && data.settings) {
          settings = { ...settings, ...data.settings };
          locatorManager.updateSettings(settings);
          logger.setLevel(settings.logLevel || 'info');
        }
        sendResponse({ success: true });
        break;
        
      case 'get_captcha_info':
        // 返回当前页面上检测到的验证码信息
        sendResponse({ success: true, captchas: [] });
        
        // 异步扫描验证码，这样可以立即响应
        (async () => {
          try {
            const captchas = await locatorManager.scanForCaptchas();
            const captchaInfo = captchas.map(c => ({
              type: c.locator.type,
              processed: c.element.dataset.processed === 'true',
              selector: c.locator.selectors && c.locator.selectors[0]
            }));
            
            // 重新发送消息给popup以更新验证码信息
            chrome.runtime.sendMessage({
              type: 'update_captcha_info',
              captchas: captchaInfo
            }).catch(() => {
              // 忽略错误，popup可能未打开
            });
          } catch (error) {
            logger.error('扫描验证码信息失败:', error);
          }
        })();
        break;
        
      default:
        logger.warn(`未知的消息类型: ${type}`);
        sendResponse({ success: false, error: '未知的消息类型' });
    }
  } catch (error) {
    logger.error('处理消息时出错:', error);
    sendResponse({ success: false, error: error.message });
  }
  
  return true; // 表示异步响应
});

// 监听DOM变化，可能会有动态加载的验证码
const observer = new MutationObserver((mutations) => {
  if (!settings.enabled || !settings.autoRecognize) return;
  
  let hasNewImages = false;
  
  for (const mutation of mutations) {
    // 如果有添加的节点
    if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // 查找添加的节点中是否有图片
          const images = node.querySelectorAll('img');
          if (images.length > 0) {
            hasNewImages = true;
            break;
          }
        }
      }
    }
    
    if (hasNewImages) break;
  }
  
  // 如果有新的图片，延迟一下再检测验证码
  if (hasNewImages) {
    setTimeout(() => {
      startAutomaticDetection();
    }, 500);
  }
});

// 配置观察器
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: false,
  characterData: false
});

// 初始化内容脚本
initialize(); 