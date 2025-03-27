import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue';
import { 
  ElementSelectorConfig, 
  ElementHighlightStyle, 
  SelectedElementInfo,
  SelectorState,
  SelectorEvents,
  SelectorGenerationRule
} from '../types/selector';

/**
 * 生成CSS选择器
 */
function generateCssSelector(element: HTMLElement, rules: SelectorGenerationRule): string {
  // 优先使用ID（如果存在且规则允许）
  if (rules.useId && element.id) {
    return `#${element.id}`;
  }

  const parts = [];
  // 使用标签名
  if (rules.useTag) {
    parts.push(element.tagName.toLowerCase());
  }

  // 使用类名
  if (rules.useClass && element.className) {
    const classes = element.className.split(' ')
      .filter(cls => cls.trim().length > 0)
      .map(cls => `.${cls}`)
      .join('');
    if (classes) parts.push(classes);
  }

  // 使用属性
  if (rules.useAttr.length > 0) {
    for (const attr of rules.useAttr) {
      if (element.hasAttribute(attr)) {
        parts.push(`[${attr}="${element.getAttribute(attr)}"]`);
      }
    }
  }

  return parts.join('');
}

/**
 * 生成XPath
 */
function generateXPath(element: HTMLElement): string {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  let path = '';
  let current: Element | null = element;
  
  while (current && current.nodeType === Node.ELEMENT_NODE) {
    let index = 1;
    let sibling: Element | null = current;
    
    while ((sibling = sibling.previousElementSibling)) {
      if (sibling.tagName === current.tagName) {
        index++;
      }
    }
    
    const tagName = current.tagName.toLowerCase();
    path = `/${tagName}[${index}]${path}`;
    current = current.parentElement;
  }
  
  return path || null;
}

/**
 * 检查元素是否可见
 */
function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' 
    && style.visibility !== 'hidden' 
    && style.opacity !== '0'
    && element.offsetWidth > 0 
    && element.offsetHeight > 0;
}

/**
 * 获取元素属性列表
 */
function getElementAttributes(element: HTMLElement): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    result[attr.name] = attr.value;
  }
  return result;
}

/**
 * 获取父元素选择器
 */
function getParentSelectors(element: HTMLElement): string[] {
  const selectors = [];
  let current = element.parentElement;
  
  while (current) {
    if (current.id) {
      selectors.push(`#${current.id}`);
      break;
    } else if (current.className) {
      const cls = current.className.split(' ')
        .filter(c => c.trim().length > 0)
        .map(c => `.${c}`)
        .join('');
      if (cls) selectors.push(`${current.tagName.toLowerCase()}${cls}`);
    } else {
      selectors.push(current.tagName.toLowerCase());
    }
    current = current.parentElement;
    if (selectors.length >= 3) break; // 只获取最近3层父元素
  }
  
  return selectors;
}

/**
 * 元素选择器composable
 */
export function useElementSelector(options: Partial<ElementSelectorConfig> = {}) {
  // 默认配置
  const defaultConfig: ElementSelectorConfig = {
    enabled: false,
    highlightColor: '#ff6b6b',
    outlineWidth: 2,
    showInfo: true,
    allowClick: false,
    excludeSelectors: ['html', 'body'],
    transitionDuration: 0.2,       // 过渡动画时长(秒)
    pulseAnimation: true,          // 是否启用脉冲动画
    autoScroll: true               // 是否自动滚动到视图
  };
  
  // 合并配置
  const config = reactive({
    ...defaultConfig,
    ...options
  });
  
  // 高亮样式
  const highlightStyle = computed<ElementHighlightStyle>(() => ({
    outlineColor: config.highlightColor,
    outlineWidth: `${config.outlineWidth}px`,
    outlineStyle: 'solid',
    backgroundColor: config.highlightColor,
    backgroundOpacity: 0.2,
    zIndex: 2147483647,
    transitionDuration: `${config.transitionDuration}s`,
    animation: config.pulseAnimation ? 'pulse 2s infinite' : 'none'
  }));
  
  // 状态
  const state = reactive<SelectorState>({
    isActive: false,
    selectedElement: null,
    hoveredElement: null,
    history: []
  });
  
  // 事件回调
  const events: SelectorEvents = {
    onSelect: () => {},
    onHover: () => {},
    onCancel: () => {},
    onComplete: () => {}
  };
  
  // 选择器生成规则
  const selectorRules: SelectorGenerationRule = {
    useId: true,
    useClass: true,
    useTag: true,
    useAttr: ['type', 'name', 'role', 'aria-label'],
    maxLength: 100,
    optimizationLevel: 1
  };
  
  // 高亮元素
  let highlightElement: HTMLElement | null = null;
  // CSS样式元素
  let styleElement: HTMLStyleElement | null = null;
  
  // 创建CSS样式
  function createStyles() {
    if (styleElement) return;
    
    styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes pulse {
        0% {
          box-shadow: 0 0 0 0 rgba(66, 184, 131, 0.4);
        }
        70% {
          box-shadow: 0 0 0 10px rgba(66, 184, 131, 0);
        }
        100% {
          box-shadow: 0 0 0 0 rgba(66, 184, 131, 0);
        }
      }
    `;
    document.head.appendChild(styleElement);
  }
  
  // 创建高亮元素
  function createHighlightElement() {
    if (highlightElement) return;
    
    createStyles();
    
    highlightElement = document.createElement('div');
    highlightElement.style.position = 'absolute';
    highlightElement.style.pointerEvents = 'none';
    highlightElement.style.zIndex = String(highlightStyle.value.zIndex);
    highlightElement.style.transition = `all ${highlightStyle.value.transitionDuration} ease`;
    if (config.pulseAnimation) {
      highlightElement.style.animation = highlightStyle.value.animation;
    }
    document.body.appendChild(highlightElement);
  }
  
  // 更新高亮元素位置
  function updateHighlightPosition(element: HTMLElement | null) {
    if (!highlightElement || !element) {
      if (highlightElement) {
        highlightElement.style.opacity = '0';
      }
      return;
    }
    
    const rect = element.getBoundingClientRect();
    
    // 如果目标元素不在视口内，自动滚动到视图中
    if (config.autoScroll) {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      if (rect.top < 0 || rect.left < 0 || rect.bottom > viewportHeight || rect.right > viewportWidth) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
    
    highlightElement.style.left = `${window.pageXOffset + rect.left}px`;
    highlightElement.style.top = `${window.pageYOffset + rect.top}px`;
    highlightElement.style.width = `${rect.width}px`;
    highlightElement.style.height = `${rect.height}px`;
    highlightElement.style.outlineColor = highlightStyle.value.outlineColor;
    highlightElement.style.outlineWidth = highlightStyle.value.outlineWidth;
    highlightElement.style.outlineStyle = highlightStyle.value.outlineStyle;
    highlightElement.style.backgroundColor = highlightStyle.value.backgroundColor;
    highlightElement.style.opacity = String(highlightStyle.value.backgroundOpacity);
  }
  
  // 移除高亮元素
  function removeHighlightElement() {
    if (highlightElement && highlightElement.parentNode) {
      highlightElement.parentNode.removeChild(highlightElement);
      highlightElement = null;
    }
    
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement);
      styleElement = null;
    }
  }
  
  // 处理鼠标移动
  function handleMouseMove(e: MouseEvent) {
    if (!state.isActive) return;
    
    // 获取鼠标下方元素
    const element = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    
    // 检查是否在排除列表中
    if (!element || config.excludeSelectors.some(selector => 
      element.matches(selector) || element === highlightElement)) {
      updateHighlightPosition(null);
      state.hoveredElement = null;
      events.onHover(null);
      return;
    }
    
    // 如果悬停元素改变，更新状态
    if (state.hoveredElement !== element) {
      state.hoveredElement = element;
      updateHighlightPosition(element);
      events.onHover(element);
    }
  }
  
  // 处理鼠标点击
  function handleMouseClick(e: MouseEvent) {
    if (!state.isActive || !state.hoveredElement) return;
    
    // 阻止正常点击行为
    if (!config.allowClick) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    const element = state.hoveredElement;
    
    // 构建选中元素信息
    const elementInfo: SelectedElementInfo = {
      element,
      selector: generateCssSelector(element, selectorRules),
      xpath: generateXPath(element),
      boundingRect: element.getBoundingClientRect(),
      attributes: getElementAttributes(element),
      isVisible: isElementVisible(element),
      isInteractive: element.tagName === 'INPUT' || element.tagName === 'BUTTON' || element.tagName === 'A',
      parentSelectors: getParentSelectors(element),
      siblingSelectors: []
    };
    
    state.selectedElement = elementInfo;
    state.history.push(elementInfo);
    
    events.onSelect(elementInfo);
  }
  
  // 处理按键
  function handleKeyDown(e: KeyboardEvent) {
    if (!state.isActive) return;
    
    // ESC键取消选择
    if (e.key === 'Escape') {
      e.preventDefault();
      stopSelector();
      events.onCancel();
    }
    
    // Enter键完成选择
    if (e.key === 'Enter' && state.selectedElement) {
      e.preventDefault();
      stopSelector();
      events.onComplete(state.selectedElement);
    }
  }
  
  // 启动选择器
  function startSelector() {
    if (state.isActive) return;
    
    state.isActive = true;
    createHighlightElement();
    
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('click', handleMouseClick, true);
    document.addEventListener('keydown', handleKeyDown);
    
    // 设置一个特殊的光标样式
    document.body.style.cursor = 'crosshair';
  }
  
  // 停止选择器
  function stopSelector() {
    if (!state.isActive) return;
    
    state.isActive = false;
    removeHighlightElement();
    
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleMouseClick, true);
    document.removeEventListener('keydown', handleKeyDown);
    
    // 恢复默认光标
    document.body.style.cursor = '';
  }
  
  // 设置事件监听器
  function setEvents(newEvents: Partial<SelectorEvents>) {
    Object.assign(events, newEvents);
  }
  
  // 清除历史记录
  function clearHistory() {
    state.history = [];
  }
  
  // 监听enabled配置变化
  watch(() => config.enabled, (enabled) => {
    if (enabled) {
      startSelector();
    } else {
      stopSelector();
    }
  });
  
  // 组件卸载时自动清理
  onUnmounted(() => {
    stopSelector();
  });
  
  return {
    config,
    state,
    highlightStyle,
    startSelector,
    stopSelector,
    setEvents,
    clearHistory
  };
} 