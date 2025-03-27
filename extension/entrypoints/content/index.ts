import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import SelectorDemo from '../../components/captcha/SelectorDemo.vue';
import FloatingInfo from '../../components/captcha/FloatingInfo.vue';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';
import { browser } from 'wxt/browser';
import { useElementSelector } from '../../composables/useElementSelector';
import { useFeatureScore } from '../../composables/useFeatureScore';

// 消息类型
interface Message {
  action: 'detectCaptcha' | 'activateSelector' | 'uploadCaptcha' | 'cancelSelection';
  [key: string]: any;
}

// 全局存储选择器实例
let selectorInstance: ReturnType<typeof useElementSelector> | null = null;
// 是否已初始化界面
let isUIInitialized = false;
// 容器元素
let container: HTMLDivElement | null = null;
// Vue应用实例
let app: ReturnType<typeof createApp> | null = null;
// 浮动信息组件相关
let floatingInfoContainer: HTMLDivElement | null = null;
let floatingInfoApp: ReturnType<typeof createApp> | null = null;
let mousePosition = { x: 0, y: 0 };
// 特征评分系统
let featureScoreInstance: ReturnType<typeof useFeatureScore> | null = null;

export default defineContentScript({
  matches: ['*://*/*'],
  main() {
    console.log('初始化验证码识别器');
    
    // 监听来自popup的消息
    browser.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
      console.log('收到消息:', message);
      
      // 类型检查
      if (!message || typeof message !== 'object' || !('action' in message)) {
        sendResponse({ success: false, error: 'Invalid message format' });
        return true;
      }
      
      const typedMessage = message as Message;
      
      // 根据消息类型执行相应操作
      switch (typedMessage.action) {
        case 'detectCaptcha':
          detectCaptcha();
          break;
        case 'activateSelector':
          initUI(); // 先初始化UI
          initFloatingInfo(); // 初始化浮动信息
          activateSelector(); // 然后直接激活选择器
          break;
        case 'uploadCaptcha':
          showUI();
          // TODO: 实现上传功能
          break;
        default:
          sendResponse({ success: false, error: 'Unknown action' });
          return true;
      }
      
      // 返回成功响应
      sendResponse({ success: true });
      return true;
    });
    
    // 监听从iframe发来的消息
    window.addEventListener('message', (event) => {
      // 确保消息来自我们的应用
      if (!event.data || typeof event.data !== 'object' || !('action' in event.data)) {
        return;
      }
      
      const action = event.data.action;
      
      switch (action) {
        case 'cancelSelection':
          hideUI();
          hideFloatingInfo();
          if (selectorInstance) {
            selectorInstance.stopSelector();
          }
          break;
        case 'captchaInfoSaved':
          hideUI();
          hideFloatingInfo();
          // 可以添加其他回调逻辑
          break;
      }
    });
    
    // 跟踪鼠标位置
    document.addEventListener('mousemove', (e) => {
      mousePosition.x = e.clientX;
      mousePosition.y = e.clientY;
    }, { passive: true });
  },
});

/**
 * 初始化UI
 */
function initUI() {
  if (isUIInitialized) return;
  
  // 创建容器
  container = document.createElement('div');
  container.id = 'captcha-recognizer-container';
  container.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    width: 350px;
    max-height: 80vh;
    overflow-y: auto;
    font-family: Arial, sans-serif;
    display: none;
  `;
  document.body.appendChild(container);
  
  // 创建Vue应用
  app = createApp(SelectorDemo);
  
  // 注册Element Plus
  app.use(ElementPlus);
  
  // 注册所有图标
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
  }
  
  // 注册Pinia状态管理
  const pinia = createPinia();
  app.use(pinia);
  
  // 挂载应用
  app.mount(container);
  
  // 添加拖动功能
  makeDraggable(container);
  
  // 创建选择器实例（不要立即启动）
  selectorInstance = useElementSelector({
    highlightColor: '#42b883',
    outlineWidth: 2,
    showInfo: true,
    transitionDuration: 0.2, // 添加过渡动画时长
    pulseAnimation: true,    // 启用脉冲动画
    enabled: false,          // 默认不启用
    autoScroll: true         // 启用自动滚动
  });
  
  // 创建特征评分实例
  featureScoreInstance = useFeatureScore();
  
  isUIInitialized = true;
}

/**
 * 初始化浮动信息组件
 */
function initFloatingInfo() {
  if (floatingInfoContainer) return;
  
  // 创建容器
  floatingInfoContainer = document.createElement('div');
  floatingInfoContainer.id = 'floating-info-container';
  document.body.appendChild(floatingInfoContainer);
  
  // 创建Vue应用
  floatingInfoApp = createApp(FloatingInfo, {
    element: null,
    visible: false,
    score: null,
    x: 0,
    y: 0
  });
  
  // 挂载应用
  floatingInfoApp.mount(floatingInfoContainer);
}

/**
 * 更新浮动信息
 */
function updateFloatingInfo(element: HTMLElement | null, score: number | null = null) {
  if (!floatingInfoApp) return;
  
  const props = floatingInfoApp._props;
  if (props) {
    props.element = element;
    props.visible = element !== null;
    props.score = score;
    props.x = mousePosition.x;
    props.y = mousePosition.y;
  }
}

/**
 * 隐藏浮动信息
 */
function hideFloatingInfo() {
  updateFloatingInfo(null);
}

/**
 * 显示UI
 */
function showUI() {
  if (!isUIInitialized) {
    initUI();
  }
  
  if (container) {
    container.style.display = 'block';
  }
}

/**
 * 隐藏UI
 */
function hideUI() {
  if (container) {
    container.style.display = 'none';
  }
}

/**
 * 激活选择器
 */
function activateSelector() {
  if (!selectorInstance || !featureScoreInstance) return;
  
  // 设置事件
  selectorInstance.setEvents({
    onSelect: (info) => {
      console.log('选择元素:', info);
      // 选择元素时显示UI并隐藏浮动信息
      showUI();
      hideFloatingInfo();
      
      // 评估元素
      featureScoreInstance.evaluateElement(info.element);
    },
    onHover: (element) => {
      // 悬停时的处理，预先评估元素
      if (element) {
        // 快速评估元素获取粗略分数
        const quickScore = getQuickScore(element);
        updateFloatingInfo(element, quickScore);
      } else {
        hideFloatingInfo();
      }
    },
    onComplete: (info) => {
      console.log('选择完成:', info);
      showUI(); // 确保UI显示
      hideFloatingInfo(); // 隐藏悬停信息
    },
    onCancel: () => {
      console.log('选择取消');
      hideUI(); // 取消时隐藏UI
      hideFloatingInfo(); // 隐藏悬停信息
    }
  });
  
  // 启动选择器
  selectorInstance.startSelector();
}

/**
 * 快速评分，用于悬停时的初步评估
 * @param element 目标元素
 * @returns 粗略分数（0-100）
 */
function getQuickScore(element: HTMLElement): number {
  let score = 0;
  
  // 检查是否是图片元素
  if (element.tagName === 'IMG') {
    score += 40;
    
    // 检查ID和类名中是否包含验证码相关关键词
    const id = element.id.toLowerCase();
    const className = element.className.toLowerCase();
    const keywords = ['captcha', 'verify', 'code', 'validation', '验证码', '验证', '安全码'];
    
    for (const keyword of keywords) {
      if (id.includes(keyword)) score += 20;
      if (className.includes(keyword)) score += 15;
    }
    
    // 检查尺寸
    const rect = element.getBoundingClientRect();
    if (rect.width >= 50 && rect.width <= 300 && rect.height >= 30 && rect.height <= 100) {
      score += 25;
    }
  } else {
    // 非图片元素分数较低
    if (element.tagName === 'CANVAS') {
      score += 30; // Canvas也可能是验证码
    } else if (element.tagName === 'DIV' || element.tagName === 'SPAN') {
      score += 10; // Div或Span可能是容器
    }
  }
  
  // 限制分数在0-100之间
  return Math.min(100, Math.max(0, score));
}

/**
 * 检测页面中的验证码
 */
function detectCaptcha() {
  console.log('检测验证码...');
  // TODO: 实现验证码检测逻辑
  
  // 显示UI
  showUI();
}

/**
 * 使元素可拖动
 */
function makeDraggable(element: HTMLElement) {
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  
  // 拖动手柄
  const handle = document.createElement('div');
  handle.style.cssText = `
    cursor: move;
    background: #f5f7fa;
    padding: 8px;
    border-radius: 8px 8px 0 0;
    text-align: center;
    font-weight: bold;
    border-bottom: 1px solid #ebeef5;
  `;
  handle.innerText = '验证码识别器 (拖动)';
  
  // 关闭按钮
  const closeBtn = document.createElement('span');
  closeBtn.style.cssText = `
    position: absolute;
    right: 10px;
    top: 8px;
    cursor: pointer;
    font-size: 16px;
  `;
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = () => {
    hideUI();
    if (selectorInstance) {
      selectorInstance.stopSelector();
    }
  };
  
  handle.appendChild(closeBtn);
  element.insertBefore(handle, element.firstChild);
  
  handle.onmousedown = (e) => {
    isDragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    
    // 防止文本选择
    e.preventDefault();
  };
  
  document.onmousemove = (e) => {
    if (!isDragging) return;
    
    element.style.left = `${e.clientX - offsetX}px`;
    element.style.top = `${e.clientY - offsetY}px`;
  };
  
  document.onmouseup = () => {
    isDragging = false;
  };
}
  