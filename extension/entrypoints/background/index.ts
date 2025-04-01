import { networkService } from '@/services/network';
import { storageService } from '@/services/storage';
import { captchaService } from '@/services/captcha';
import { loggerService } from '@/services/logger';
import { onMessage, sendMessage } from '@/services/messaging';
import { CaptchaRecord, CaptchaRecognizeRequest, CaptchaRecognizeResponse, Settings } from '@/types';
import { browser } from 'wxt/browser';

export default defineBackground({
  main() {
    loggerService.info('后台脚本启动');
    
    // 初始化网络服务
    initializeServices();
    
    // 注册消息监听器
    registerMessageHandlers();
  }
});

/**
 * 初始化服务
 */
async function initializeServices() {
  try {
    // 获取设置
    const settings = await storageService.getSettings();
    
    // 设置API地址(实际生产环境中应该从配置中获取)
    networkService.setBaseUrl('http://localhost:8000/api');
    
    loggerService.info('服务初始化完成');
  } catch (error) {
    loggerService.error('服务初始化失败', error);
  }
}

/**
 * 注册消息监听器
 */
function registerMessageHandlers() {
  // 上传验证码记录
  onMessage('uploadCaptchaRecord', async (message) => {
    try {
      const record = message as unknown as CaptchaRecord;
      loggerService.info('接收到上传验证码记录消息', { url: record.url });
      
      const result = await captchaService.uploadCaptchaRecord(record);
      loggerService.info('验证码记录上传结果', { success: result });
      
      return result;
    } catch (error) {
      loggerService.error('上传验证码记录失败', error);
      return false;
    }
  });
  
  // 获取设置
  onMessage('getSettings', async () => {
    loggerService.info('接收到获取设置消息');
    
    try {
      const settings = await storageService.getSettings();
      return settings;
    } catch (error) {
      loggerService.error('获取设置失败', error);
      throw error; // 使用throw确保Promise被拒绝而不是返回null
    }
  });
  
  // 更新设置
  onMessage('updateSettings', async (message) => {
    try {
      const settings = message as unknown as Settings;
      loggerService.info('接收到更新设置消息');
      
      await storageService.saveSettings(settings);
      return true;
    } catch (error) {
      loggerService.error('保存设置失败', error);
      return false;
    }
  });
  
  // 获取验证码记录
  onMessage('getCaptchaRecord', async () => {
    loggerService.info('接收到获取验证码记录消息');
    
    try {
      // 这里应该从当前活动标签页获取URL，但是由于函数参数限制，
      // 实际应用中应该在content script中获取URL后发送消息
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        loggerService.warn('无法获取当前活动标签页');
        return null;
      }
      
      const url = tabs[0].url;
      if (!url) {
        loggerService.warn('无法获取当前页面URL');
        return null;
      }
      
      const record = await captchaService.getCaptchaRecord(url);
      return record;
    } catch (error) {
      loggerService.error('获取验证码记录失败', error);
      return null;
    }
  });
  
  // 识别验证码
  onMessage('recognizeCaptcha', async (message) => {
    try {
      const data = message as unknown as CaptchaRecognizeRequest;
      loggerService.info('接收到识别验证码消息', { type: data.type });
      
      // 由于这里需要完整的CaptchaRecord对象，实际应用中应该在请求中传入
      // 或者在content script中处理识别逻辑
      if (!data.captchaId) {
        return {
          success: false,
          error: '缺少验证码记录ID'
        };
      }
      
      // 调用API进行识别
      const response = await networkService.post<CaptchaRecognizeRequest, CaptchaRecognizeResponse>(
        '/captcha/recognize',
        data
      );
      
      if (response.code !== 200 || !response.data) {
        return {
          success: false,
          error: response.message || '识别失败'
        };
      }
      
      return response.data;
    } catch (error) {
      loggerService.error('识别验证码失败', error);
      return {
        success: false,
        error: (error as Error).message || '识别过程出现异常'
      };
    }
  });
  
  // 开始选择验证码
  onMessage('startSelectCaptcha', async () => {
    loggerService.info('接收到开始选择验证码消息');
    
    try {
      // 不需要任何操作，消息会自动转发到内容脚本
    } catch (error) {
      loggerService.error('处理开始选择验证码消息失败', error);
      throw error;
    }
  });
  
  // 停止选择验证码
  onMessage('stopSelectCaptcha', async () => {
    loggerService.info('接收到停止选择验证码消息');
    
    try {
      // 不需要任何操作，消息会自动转发到内容脚本
    } catch (error) {
      loggerService.error('处理停止选择验证码消息失败', error);
      throw error;
    }
  });
}
  