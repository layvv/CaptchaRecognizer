/**
 * 内容脚本入口文件
 * 负责初始化验证码识别和处理功能
 */

import { AppSettings, MessageType } from '../../types';
import { MessagingUtil } from '../../utils/messaging';
import { captchaProcessor } from './captcha-processor';
import { registerMessageHandlers } from './message-handler';
import { autoDetectCaptcha } from './captcha-detector';
import { defineContentScript } from 'wxt/sandbox';

// 默认设置
const DEFAULT_SETTINGS: AppSettings = {
  enabled: true,
  autoSolve: true,
  highlightCaptcha: true,
  useLocalCache: true,
  apiUrl: '',
  apiTimeout: 10000,
  debugMode: false,
  maxErrorCount: 3,
  theme: 'light'
};

// 全局设置
let settings: AppSettings = { ...DEFAULT_SETTINGS };


// 导出content脚本
export default defineContentScript({
  matches: ['http://*/*', 'https://*/*'],
  runAt: 'document_end',
  main() {
    // 加载时初始化
    initialize();
  }
}); 

/**
 * 初始化内容脚本
 */
async function initialize() {
  console.log('验证码识别助手: 内容脚本已加载');
  
  try {
    // 加载设置
    await loadSettings();
    
    // 注册消息处理器
    registerMessageHandlers(settings);
    
    // 自动检测验证码
    if (settings.autoSolve) {
      setTimeout(() => autoDetectCaptcha(settings), 1000); // 延迟执行，确保页面已完全加载
    }
  } catch (error) {
    console.error('内容脚本初始化失败:', error);
  }
}

/**
 * 加载设置
 */
async function loadSettings() {
  try {
    const response = await MessagingUtil.sendToBackground({
      type: MessageType.GET_SETTINGS,
      data: null
    });
    
    if (response.success) {
      settings = { ...DEFAULT_SETTINGS, ...response.data };
      console.log('已加载设置:', settings);
      
      // 配置验证码处理器
      captchaProcessor.setOptions({
        autoSolve: settings.autoSolve,
        maxErrorCount: settings.maxErrorCount
      });
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
}

