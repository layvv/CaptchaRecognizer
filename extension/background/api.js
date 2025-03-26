/**
 * API通信模块，负责与后端服务器通信
 */

// 基础URL配置
let API_BASE_URL = 'http://localhost:5000/api';

/**
 * 设置API基础URL
 * @param {string} baseUrl 新的基础URL
 */
export function setApiBaseUrl(baseUrl) {
  API_BASE_URL = baseUrl;
}

/**
 * 生成完整的API URL
 * @param {string} endpoint API端点
 * @returns {string} 完整的API URL
 */
function getApiUrl(endpoint) {
  return `${API_BASE_URL}${endpoint}`;
}

/**
 * 获取API请求头
 * @param {boolean} includeAuth 是否包含认证信息
 * @returns {Object} 请求头对象
 */
async function getHeaders(includeAuth = false) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Client-Version': chrome.runtime.getManifest().version
  };
  
  if (includeAuth) {
    // 从存储中获取认证令牌（如果需要的话）
    const authData = await chrome.storage.local.get('authToken');
    if (authData.authToken) {
      headers['Authorization'] = `Bearer ${authData.authToken}`;
    }
  }
  
  return headers;
}

/**
 * 处理API响应
 * @param {Response} response Fetch API响应对象
 * @returns {Promise<Object>} 解析后的响应数据
 * @throws {Error} 当响应状态码不是2xx时抛出
 */
async function handleResponse(response) {
  const data = await response.json();
  
  if (!response.ok) {
    const error = new Error(data.message || '网络请求失败');
    error.status = response.status;
    error.data = data;
    throw error;
  }
  
  return data;
}

/**
 * 发送API请求
 * @param {string} endpoint API端点
 * @param {Object} options 请求选项
 * @returns {Promise<Object>} 响应数据
 */
async function apiRequest(endpoint, options = {}) {
  try {
    const url = getApiUrl(endpoint);
    const requireAuth = options.requireAuth !== false;
    const headers = await getHeaders(requireAuth);
    
    const requestOptions = {
      method: options.method || 'GET',
      headers,
      ...options
    };
    
    if (options.body && typeof options.body === 'object') {
      requestOptions.body = JSON.stringify(options.body);
    }
    
    // 记录请求信息（用于调试）
    console.log(`API请求: ${requestOptions.method} ${url}`);
    
    const response = await fetch(url, requestOptions);
    return await handleResponse(response);
  } catch (error) {
    console.error('API请求失败:', error);
    
    // 重新抛出错误以便上层处理
    throw error;
  }
}

/**
 * 识别验证码
 * @param {string} imageData 验证码图片的base64数据
 * @param {string} captchaType 验证码类型（如'char', 'slider'等）
 * @returns {Promise<Object>} 识别结果
 */
export async function recognizeCaptcha(imageData, captchaType = 'char') {
  return apiRequest('/captcha/recognize', {
    method: 'POST',
    body: {
      image: imageData,
      type: captchaType
    }
  });
}

/**
 * 上传验证码定位器
 * @param {Object} locator 验证码定位器对象
 * @returns {Promise<Object>} 上传结果
 */
export async function uploadLocator(locator) {
  return apiRequest('/locator/upload', {
    method: 'POST',
    body: locator,
    requireAuth: true
  });
}

/**
 * 获取验证码定位器
 * @param {string} domain 网站域名
 * @param {string} type 验证码类型，不指定则获取所有类型
 * @returns {Promise<Array>} 定位器数组
 */
export async function getLocators(domain, type = null) {
  let endpoint = `/locator/list?domain=${encodeURIComponent(domain)}`;
  if (type) {
    endpoint += `&type=${encodeURIComponent(type)}`;
  }
  
  return apiRequest(endpoint);
}

/**
 * 报告验证码识别结果
 * @param {string} locatorId 定位器ID
 * @param {boolean} success 识别是否成功
 * @param {Object} details 详细信息
 * @returns {Promise<Object>} 响应结果
 */
export async function reportRecognitionResult(locatorId, success, details = {}) {
  return apiRequest('/captcha/report', {
    method: 'POST',
    body: {
      locatorId,
      success,
      details
    }
  });
}

/**
 * 上传验证码样本（用于训练）
 * @param {string} imageData 验证码图片的base64数据
 * @param {string} correctValue 正确的验证码值，可以为null
 * @param {string} captchaType 验证码类型
 * @returns {Promise<Object>} 上传结果
 */
export async function uploadCaptchaSample(imageData, correctValue, captchaType = 'char') {
  return apiRequest('/captcha/upload-sample', {
    method: 'POST',
    body: {
      image: imageData,
      correctValue,
      type: captchaType
    }
  });
}

/**
 * 获取验证码特征库
 * @param {string} captchaType 验证码类型
 * @returns {Promise<Object>} 特征库数据
 */
export async function getCaptchaFeatures(captchaType = 'char') {
  return apiRequest(`/captcha/features?type=${encodeURIComponent(captchaType)}`);
}

/**
 * 检查API服务可用性
 * @returns {Promise<boolean>} 服务是否可用
 */
export async function checkApiAvailability() {
  try {
    const result = await apiRequest('/health');
    return result.status === 'ok';
  } catch (error) {
    console.error('API服务不可用:', error);
    return false;
  }
} 