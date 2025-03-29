/**
 * DOM操作相关工具函数
 */

/**
 * 获取元素的CSS选择器
 * @param element DOM元素
 * @returns CSS选择器
 */
export function getElementSelector(element: Element): string {
  if (!element) return '';
  
  // 如果元素有ID，使用ID选择器
  if (element.id) {
    return `#${element.id}`;
  }
  
  // 使用简化的CSS选择器路径
  const tagName = element.tagName.toLowerCase();
  const classes = element.className ? `.${element.className.trim().replace(/\s+/g, '.')}` : '';
  return tagName + classes;
}

/**
 * 通过选择器查找元素
 * @param selector CSS选择器
 * @param context 上下文元素
 * @returns 找到的元素或null
 */
export function findElementBySelector(selector: string, context: Element | Document = document): Element | null {
  if (!selector) return null;
  
  try {
    return context.querySelector(selector);
  } catch (error) {
    console.error('选择器语法错误:', selector, error);
    return null;
  }
}

/**
 * 查找所有匹配选择器的元素
 * @param selector CSS选择器
 * @param context 上下文元素
 * @returns 找到的元素数组
 */
export function findElementsBySelector(selector: string, context: Element | Document = document): Element[] {
  if (!selector) return [];
  
  try {
    return Array.from(context.querySelectorAll(selector));
  } catch (error) {
    console.error('选择器语法错误:', selector, error);
    return [];
  }
}

/**
 * 判断元素是否在视口中可见
 * @param element DOM元素
 * @returns 是否可见
 */
export function isElementVisible(element: Element): boolean {
  if (!element) return false;
  
  const style = window.getComputedStyle(element as HTMLElement);
  
  return style.display !== 'none' 
    && style.visibility !== 'hidden' 
    && style.opacity !== '0'
    && (element as HTMLElement).offsetWidth > 0
    && (element as HTMLElement).offsetHeight > 0;
}

/**
 * 判断元素是否在视口内
 * @param element DOM元素
 * @returns 是否在视口内
 */
export function isElementInViewport(element: Element): boolean {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

/**
 * 获取元素的所有属性
 * @param element DOM元素
 * @returns 属性对象
 */
export function getElementAttributes(element: Element): Record<string, string> {
  if (!element) return {};
  
  const attributes: Record<string, string> = {};
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    attributes[attr.name] = attr.value;
  }
  
  return attributes;
}

/**
 * 获取元素的文本内容
 * @param element DOM元素
 * @returns 文本内容
 */
export function getElementText(element: Element): string {
  if (!element) return '';
  
  return element.textContent?.trim() || '';
}

/**
 * 获取元素的HTML内容
 * @param element DOM元素
 * @returns HTML内容
 */
export function getElementHtml(element: Element): string {
  if (!element) return '';
  
  return element.innerHTML.trim();
}

/**
 * 获取元素的尺寸
 * @param element DOM元素
 * @returns 元素尺寸对象
 */
export function getElementDimensions(element: Element): { width: number; height: number } {
  if (!element) return { width: 0, height: 0 };
  
  const rect = element.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height
  };
}

/**
 * 获取元素的位置
 * @param element DOM元素
 * @returns 元素位置对象
 */
export function getElementPosition(element: Element): { top: number; left: number } {
  if (!element) return { top: 0, left: 0 };
  
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX
  };
}

/**
 * 创建一个元素
 * @param tagName 标签名
 * @param attributes 属性对象
 * @param innerHTML HTML内容
 * @returns 创建的元素
 */
export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  attributes: Record<string, string> = {},
  innerHTML: string = ''
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  
  // 设置属性
  for (const [key, value] of Object.entries(attributes)) {
    element.setAttribute(key, value);
  }
  
  // 设置内容
  if (innerHTML) {
    element.innerHTML = innerHTML;
  }
  
  return element;
}

/**
 * 获取页面元素截图为base64编码
 * @param element DOM元素
 * @returns Promise<base64编码的图片数据>
 */
export async function captureElementAsBase64(element: Element): Promise<string> {
  // 检查元素是否存在
  if (!element) {
    throw new Error('元素不存在');
  }
  
  // 检查元素是否为图片
  if (element instanceof HTMLImageElement) {
    return await convertImageToBase64(element);
  }
  
  // 检查元素是否为Canvas
  if (element instanceof HTMLCanvasElement) {
    return element.toDataURL('image/png');
  }
  
  // 使用html2canvas捕获其他元素
  try {
    // 这里应该使用动态导入html2canvas，为了简化，暂时用注释替代
    // const html2canvas = await import('html2canvas');
    // const canvas = await html2canvas.default(element as HTMLElement);
    // return canvas.toDataURL('image/png');
    
    // 临时实现：仅支持图片和Canvas元素
    throw new Error('目前仅支持图片和Canvas元素');
  } catch (error) {
    console.error('捕获元素失败:', error);
    throw error;
  }
}

/**
 * 将图片转换为Base64格式
 */
async function convertImageToBase64(img: HTMLImageElement): Promise<string> {
  return new Promise((resolve, reject) => {
    // 创建一个Canvas元素
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 确保图片已加载
    const loadImage = () => {
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      
      if (!ctx) {
        reject(new Error('无法获取Canvas上下文'));
        return;
      }
      
      // 在Canvas上绘制图片
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // 将Canvas转换为Base64
      try {
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        // 如果图片跨域，可能会导致安全错误
        reject(new Error('无法转换图片，可能是跨域问题'));
      }
    };
    
    if (img.complete) {
      loadImage();
    } else {
      img.onload = loadImage;
      img.onerror = () => reject(new Error('图片加载失败'));
    }
  });
}

/**
 * 下载图片并转换为Base64
 * @param url 图片URL
 * @returns Promise<base64编码的图片数据>
 */
export async function downloadImageAsBase64(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // 尝试解决跨域问题
    
    img.onload = async () => {
      try {
        const base64 = await convertImageToBase64(img);
        resolve(base64);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error(`图片加载失败: ${url}`));
    };
    
    img.src = url;
  });
}

/**
 * 获取页面上所有图片元素
 * @returns HTMLImageElement数组
 */
export function getAllImageElements(): HTMLImageElement[] {
  return Array.from(document.querySelectorAll('img'));
}

/**
 * 获取页面上所有Canvas元素
 * @returns HTMLCanvasElement数组
 */
export function getAllCanvasElements(): HTMLCanvasElement[] {
  return Array.from(document.querySelectorAll('canvas'));
}

/**
 * 获取元素的computed样式
 * @param element DOM元素
 * @param pseudoElement 伪元素
 * @returns CSSStyleDeclaration对象
 */
export function getComputedStyles(element: Element, pseudoElement?: string): CSSStyleDeclaration {
  return window.getComputedStyle(element, pseudoElement || null);
}

/**
 * 判断元素是否有背景图片
 * @param element DOM元素
 * @returns 是否有背景图片
 */
export function hasBackgroundImage(element: Element): boolean {
  const style = getComputedStyles(element);
  const backgroundImage = style.backgroundImage;
  
  return backgroundImage !== 'none' && backgroundImage !== '';
}

/**
 * 查找相关元素
 * @param element 起始元素
 * @param maxDistance 最大搜索距离
 * @returns 相关元素数组
 */
export function findRelatedElements(element: Element, maxDistance: number = 3): Element[] {
  if (!element) return [];
  
  const results: Element[] = [];
  
  // 先查找父元素及其直接后代
  let parent = element.parentElement;
  for (let i = 0; i < maxDistance; i++) {
    if (!parent) break;
    
    // 添加兄弟节点
    Array.from(parent.children).forEach(child => {
      if (child !== element && !results.includes(child)) {
        results.push(child);
      }
    });
    
    parent = parent.parentElement;
  }
  
  // 查找相邻的元素
  let nextSibling = element.nextElementSibling;
  for (let i = 0; i < maxDistance; i++) {
    if (!nextSibling) break;
    results.push(nextSibling);
    nextSibling = nextSibling.nextElementSibling;
  }
  
  let prevSibling = element.previousElementSibling;
  for (let i = 0; i < maxDistance; i++) {
    if (!prevSibling) break;
    results.push(prevSibling);
    prevSibling = prevSibling.previousElementSibling;
  }
  
  return results;
} 