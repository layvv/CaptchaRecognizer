/**
 * 图像处理工具类
 */
import { Logger } from './logger.js';

const logger = new Logger('ImageUtils');

/**
 * 将图片元素转换为Base64编码
 * @param {HTMLImageElement} imgElement 图片元素
 * @returns {Promise<string>} base64编码的图片数据
 */
export async function imageToBase64(imgElement) {
  return new Promise((resolve, reject) => {
    try {
      // 确保图片已加载
      if (!imgElement.complete) {
        imgElement.onload = () => convertImageToBase64(imgElement, resolve, reject);
        imgElement.onerror = (error) => {
          logger.error('图片加载失败', error);
          reject(new Error('图片加载失败'));
        };
      } else {
        convertImageToBase64(imgElement, resolve, reject);
      }
    } catch (error) {
      logger.error('转换图片失败', error);
      reject(error);
    }
  });
}

/**
 * 将已加载的图片元素转换为Base64
 * @param {HTMLImageElement} imgElement 图片元素
 * @param {Function} resolve 成功回调
 * @param {Function} reject 失败回调
 */
function convertImageToBase64(imgElement, resolve, reject) {
  try {
    // 检查图片的有效性
    if (imgElement.naturalWidth === 0 || imgElement.naturalHeight === 0) {
      reject(new Error('图片尺寸为0'));
      return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = imgElement.naturalWidth;
    canvas.height = imgElement.naturalHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('无法获取2D上下文'));
      return;
    }
    
    // 绘制图片到Canvas
    ctx.drawImage(imgElement, 0, 0);
    
    // 转换为Base64
    const dataURL = canvas.toDataURL('image/png');
    
    // 检查是否成功获取数据
    if (!dataURL || dataURL === 'data:,') {
      reject(new Error('转换图片失败'));
      return;
    }
    
    resolve(dataURL);
  } catch (error) {
    logger.error('Canvas转换失败', error);
    reject(error);
  }
}

/**
 * 从URL加载图片并转换为Base64
 * @param {string} url 图片URL
 * @returns {Promise<string>} base64编码的图片数据
 */
export async function urlToBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    // 处理跨域问题
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取2D上下文'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        logger.error('转换URL图片失败', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('加载图片失败: ' + url));
    };
    
    img.src = url;
  });
}

/**
 * 调整图片大小
 * @param {string} base64 base64编码的图片数据
 * @param {number} maxWidth 最大宽度
 * @param {number} maxHeight 最大高度
 * @returns {Promise<string>} 调整大小后的base64编码图片数据
 */
export async function resizeImage(base64, maxWidth, maxHeight) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // 计算新的尺寸
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('无法获取2D上下文'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        const dataURL = canvas.toDataURL('image/png');
        resolve(dataURL);
      } catch (error) {
        logger.error('调整图片大小失败', error);
        reject(error);
      }
    };
    
    img.onerror = () => {
      reject(new Error('加载Base64图片失败'));
    };
    
    img.src = base64;
  });
}

/**
 * 从Base64编码获取图片的二进制数据
 * @param {string} base64 base64编码的图片数据
 * @returns {Blob} 图片的二进制数据
 */
export function base64ToBlob(base64) {
  // 提取数据部分
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'image/png';
  const rawData = window.atob(parts[1]);
  
  // 转换为二进制数组
  const arrayBuffer = new ArrayBuffer(rawData.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < rawData.length; i++) {
    uint8Array[i] = rawData.charCodeAt(i);
  }
  
  return new Blob([arrayBuffer], { type: contentType });
}

/**
 * 获取图片的主要颜色
 * @param {HTMLImageElement} imgElement 图片元素
 * @returns {Promise<string>} 主要颜色的十六进制表示
 */
export async function getMainColor(imgElement) {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('无法获取2D上下文'));
        return;
      }
      
      canvas.width = imgElement.naturalWidth;
      canvas.height = imgElement.naturalHeight;
      
      ctx.drawImage(imgElement, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const colorCounts = {};
      
      // 统计颜色出现次数
      for (let i = 0; i < imageData.length; i += 4) {
        const r = imageData[i];
        const g = imageData[i + 1];
        const b = imageData[i + 2];
        const a = imageData[i + 3];
        
        // 忽略透明像素
        if (a < 128) continue;
        
        // 将颜色量化，减少颜色数量
        const quantizedR = Math.round(r / 32) * 32;
        const quantizedG = Math.round(g / 32) * 32;
        const quantizedB = Math.round(b / 32) * 32;
        
        const colorKey = `${quantizedR},${quantizedG},${quantizedB}`;
        
        if (colorCounts[colorKey]) {
          colorCounts[colorKey]++;
        } else {
          colorCounts[colorKey] = 1;
        }
      }
      
      // 找出出现最多的颜色
      let maxCount = 0;
      let mainColor = '0,0,0';
      
      for (const colorKey in colorCounts) {
        if (colorCounts[colorKey] > maxCount) {
          maxCount = colorCounts[colorKey];
          mainColor = colorKey;
        }
      }
      
      // 转换为十六进制
      const [r, g, b] = mainColor.split(',').map(Number);
      const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      resolve(hexColor);
    } catch (error) {
      logger.error('获取主要颜色失败', error);
      reject(error);
    }
  });
} 