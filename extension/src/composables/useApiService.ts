import { ref, reactive, computed, watch } from 'vue';
import { ApiService, Logger } from '@/utils';
import { useSettingsStore } from '@/stores/settings';
import { ApiResponse, CaptchaType, CaptchaRecord, CaptchaRecognitionRequest, CaptchaRecognitionResult, API_PATHS, FeedbackType } from '@/types';
import { StorageUtil } from '@/utils/storage';
import { useCaptchaStore } from '@/stores/captcha';

// 日志记录器
const logger = new Logger('ApiService');

/**
 * API服务组合函数
 * 提供与后端API交互的功能，包括验证码API和反馈API
 */
export function useApiService() {
  const settingsStore = useSettingsStore();
  const captchaStore = useCaptchaStore();
  
  // API服务状态
  const apiState = reactive({
    instance: null as ApiService | null,
    isOffline: false,
    isLoading: false,
    error: null as string | null,
    lastRequest: null as any,
    lastResponse: null as any
  });
  
  // 当前API URL
  const apiUrl = computed(() => settingsStore.settings.apiUrl);
  
  // 当前API超时时间
  const apiTimeout = computed(() => settingsStore.settings.apiTimeout);
  
  // 是否使用本地缓存
  const useLocalCache = computed(() => settingsStore.settings.useLocalCache);
  
  /**
   * 初始化API服务
   */
  const initApiService = () => {
    try {
      logger.debug('初始化API服务', { url: apiUrl.value, timeout: apiTimeout.value });
      
      // 创建API服务实例
      apiState.instance = new ApiService(apiUrl.value, apiTimeout.value);
      apiState.error = null;
      
      // 检查服务器可用性
      checkServerAvailability();
    } catch (error) {
      apiState.error = (error as Error).message;
      apiState.isOffline = true;
      logger.error('API服务初始化失败', error);
    }
  };
  
  /**
   * 检查服务器可用性
   */
  const checkServerAvailability = async () => {
    if (!apiState.instance) {
      initApiService();
    }
    
    if (!apiState.instance) return false;
    
    try {
      apiState.isLoading = true;
      const isAvailable = await apiState.instance.checkServerAvailability();
      apiState.isOffline = !isAvailable;
      logger.debug('服务器可用性检查', { isAvailable });
      return isAvailable;
    } catch (error) {
      apiState.isOffline = true;
      apiState.error = (error as Error).message;
      logger.error('服务器可用性检查失败', error);
      return false;
    } finally {
      apiState.isLoading = false;
    }
  };
  
  /**
   * 执行API请求，处理离线模式和错误情况
   * @param requestFn 请求函数
   * @param offlineHandler 离线模式处理函数
   * @param errorHandler 错误处理函数
   */
  const executeApiRequest = async <T>(
    requestFn: () => Promise<ApiResponse<T>>,
    offlineHandler?: () => Promise<ApiResponse<T>>,
    errorHandler?: (error: any) => Promise<ApiResponse<T>>
  ): Promise<ApiResponse<T>> => {
    try {
      apiState.isLoading = true;
      apiState.error = null;
      
      // 如果是离线模式且提供了离线处理器，则使用离线处理
      if (apiState.isOffline && offlineHandler) {
        return await offlineHandler();
      }
      
      // 确保API服务已初始化
      if (!apiState.instance) {
        initApiService();
      }
      
      // 如果初始化后仍然没有实例或处于离线模式，且没有离线处理器
      if (!apiState.instance || apiState.isOffline) {
        return {
          success: false,
          message: '后端服务不可用',
          code: 503
        } as ApiResponse<T>;
      }
      
      // 执行请求
      const response = await requestFn();
      apiState.lastResponse = response;
      return response;
    } catch (error) {
      apiState.error = (error as Error).message;
      logger.error('API请求失败', error);
      
      // 尝试切换到离线模式
      apiState.isOffline = true;
      
      // 如果提供了错误处理器，则使用它
      if (errorHandler) {
        return await errorHandler(error);
      }
      
      // 否则返回标准错误响应
      return {
        success: false,
        message: apiState.error,
        code: 500
      } as ApiResponse<T>;
    } finally {
      apiState.isLoading = false;
    }
  };
  
  // ============================
  // 验证码API功能
  // ============================
  
  /**
   * 根据URL获取验证码记录
   */
  const getCaptchaRecordByUrl = async (url: string): Promise<ApiResponse<CaptchaRecord | null>> => {
    logger.debug('获取验证码记录', { url });
    apiState.lastRequest = { url };
    
    return executeApiRequest<CaptchaRecord | null>(
      // 在线请求处理
      async () => {
        const response = await apiState.instance!.get<CaptchaRecord | null>(
          API_PATHS.CAPTCHA.GET_RECORD,
          { url }
        );
        
        // 如果使用本地缓存，同时更新本地记录
        if (response.success && response.data && useLocalCache.value) {
          await saveLocalCaptchaRecord(response.data);
        }
        
        // 更新Store
        if (response.success && response.data) {
          captchaStore.setCurrentRecord(response.data);
        }
        
        return response;
      },
      // 离线处理
      async () => {
        const record = await getLocalCaptchaRecord(url);
        if (record) {
          captchaStore.setCurrentRecord(record);
        }
        return {
          success: true,
          message: '从本地缓存获取记录',
          data: record
        };
      },
      // 错误处理
      async () => {
        const record = await getLocalCaptchaRecord(url);
        if (record) {
          captchaStore.setCurrentRecord(record);
          return {
            success: true,
            message: '从本地缓存获取记录',
            data: record
          };
        }
        return {
          success: false,
          message: '获取验证码记录失败',
          data: null
        };
      }
    );
  };
  
  /**
   * 保存验证码记录
   */
  const saveCaptchaRecord = async (record: CaptchaRecord): Promise<ApiResponse<CaptchaRecord>> => {
    logger.debug('保存验证码记录', { record });
    apiState.lastRequest = { record };
    
    return executeApiRequest<CaptchaRecord>(
      // 在线请求处理
      async () => {
        const response = await apiState.instance!.post<CaptchaRecord>(
          API_PATHS.CAPTCHA.SAVE_RECORD,
          record
        );
        
        // 如果使用本地缓存，同时更新本地记录
        if (response.success && response.data && useLocalCache.value) {
          await saveLocalCaptchaRecord(response.data);
        }
        
        // 更新Store
        if (response.success && response.data) {
          captchaStore.setCurrentRecord(response.data);
        }
        
        return response;
      },
      // 离线处理
      async () => {
        // 生成一个本地ID
        if (!record.id) {
          record.id = `local-${Date.now()}`;
        }
        
        await saveLocalCaptchaRecord(record);
        captchaStore.setCurrentRecord(record);
        
        return {
          success: true,
          message: '离线模式：保存验证码记录成功',
          data: record
        };
      },
      // 错误处理
      async () => {
        // 生成一个本地ID
        if (!record.id) {
          record.id = `local-${Date.now()}`;
        }
        
        await saveLocalCaptchaRecord(record);
        captchaStore.setCurrentRecord(record);
        
        return {
          success: true,
          message: '离线模式：保存验证码记录成功',
          data: record
        };
      }
    );
  };
  
  /**
   * 识别验证码
   */
  const recognizeCaptcha = async (request: CaptchaRecognitionRequest): Promise<ApiResponse<CaptchaRecognitionResult>> => {
    logger.debug('识别验证码', { request });
    apiState.lastRequest = { request };
    
    return executeApiRequest<CaptchaRecognitionResult>(
      // 在线请求处理
      async () => {
        return await apiState.instance!.post<CaptchaRecognitionResult>(
          API_PATHS.CAPTCHA.RECOGNIZE,
          request
        );
      },
      // 离线处理
      async () => {
        return {
          success: false,
          message: '离线模式：无法识别验证码',
          data: {
            text: '',
            confidence: 0,
            details: { error: '离线模式不支持验证码识别' }
          }
        };
      }
    );
  };
  
  /**
   * 报告验证码识别结果
   */
  const reportCaptchaResult = async (recordId: string, success: boolean, details?: any): Promise<ApiResponse<void>> => {
    logger.debug('报告验证码识别结果', { recordId, success, details });
    apiState.lastRequest = { recordId, success, details };
    
    return executeApiRequest<void>(
      // 在线请求处理
      async () => {
        return await apiState.instance!.post<void>(
          API_PATHS.CAPTCHA.REPORT_RESULT,
          { recordId, success, details }
        );
      },
      // 离线处理
      async () => {
        return {
          success: true,
          message: '离线模式：已忽略结果报告'
        };
      }
    );
  };
  
  // ============================
  // 反馈API功能
  // ============================
  
  /**
   * 提交用户反馈
   */
  const submitFeedback = async (
    type: FeedbackType,
    content: string,
    metadata: Record<string, any> = {}
  ): Promise<ApiResponse<void>> => {
    logger.debug('提交用户反馈', { type, content, metadata });
    apiState.lastRequest = { type, content, metadata };
    
    // 创建反馈项
    const feedbackItem = {
      id: StorageUtil.generateUniqueId('feedback_'),
      type,
      content,
      metadata,
      timestamp: new Date().toISOString(),
      isSynced: false
    };
    
    return executeApiRequest<void>(
      // 在线请求处理
      async () => {
        const response = await apiState.instance!.post<void>(
          API_PATHS.FEEDBACK.SUBMIT,
          { type, content, metadata }
        );
        
        if (response.success) {
          feedbackItem.isSynced = true;
        }
        
        // 无论成功失败都保存到本地
        await saveLocalFeedback(feedbackItem);
        
        return response;
      },
      // 离线处理
      async () => {
        await saveLocalFeedback(feedbackItem);
        return {
          success: true,
          message: '离线模式：反馈已保存到本地'
        };
      },
      // 错误处理
      async () => {
        await saveLocalFeedback(feedbackItem);
        return {
          success: true,
          message: '反馈已保存到本地，但未能发送到服务器'
        };
      }
    );
  };
  
  /**
   * 同步本地未同步的反馈
   */
  const syncLocalFeedback = async (): Promise<number> => {
    if (apiState.isOffline || !apiState.instance) {
      return 0;
    }
    
    try {
      const feedbackItems = await StorageUtil.getItem<any[]>('feedback_items', []);
      const unsyncedItems = feedbackItems.filter(item => !item.isSynced);
      
      if (unsyncedItems.length === 0) {
        return 0;
      }
      
      logger.debug('同步本地反馈', { count: unsyncedItems.length });
      
      let syncedCount = 0;
      
      // 逐个同步
      for (const item of unsyncedItems) {
        try {
          const response = await apiState.instance.post(
            API_PATHS.FEEDBACK.SUBMIT,
            {
              type: item.type,
              content: item.content,
              metadata: {
                ...item.metadata,
                original_timestamp: item.timestamp
              }
            }
          );
          
          if (response.success) {
            // 更新同步状态
            item.isSynced = true;
            syncedCount++;
          }
        } catch (error) {
          logger.error('同步反馈项失败', { id: item.id, error });
        }
      }
      
      // 保存更新后的状态
      await StorageUtil.saveItem('feedback_items', feedbackItems);
      
      logger.debug('同步本地反馈完成', { syncedCount });
      
      return syncedCount;
    } catch (error) {
      logger.error('同步本地反馈失败', error);
      return 0;
    }
  };
  
  // ============================
  // 本地存储辅助函数
  // ============================
  
  /**
   * 从本地存储获取验证码记录
   */
  const getLocalCaptchaRecord = async (url: string): Promise<CaptchaRecord | null> => {
    try {
      const records = await StorageUtil.getItem<Record<string, CaptchaRecord>>('captcha_records', {});
      // 使用URL的哈希作为键
      const key = await StorageUtil.hashString(url);
      return records[key] || null;
    } catch (error) {
      logger.error('从本地获取验证码记录失败', error);
      return null;
    }
  };
  
  /**
   * 保存验证码记录到本地存储
   */
  const saveLocalCaptchaRecord = async (record: CaptchaRecord): Promise<boolean> => {
    if (!record.url) {
      logger.error('保存验证码记录失败：缺少URL');
      return false;
    }
    
    try {
      const records = await StorageUtil.getItem<Record<string, CaptchaRecord>>('captcha_records', {});
      // 使用URL的哈希作为键
      const key = await StorageUtil.hashString(record.url);
      records[key] = record;
      await StorageUtil.saveItem('captcha_records', records);
      return true;
    } catch (error) {
      logger.error('保存验证码记录到本地失败', error);
      return false;
    }
  };
  
  /**
   * 保存反馈到本地存储
   */
  const saveLocalFeedback = async (item: any): Promise<void> => {
    try {
      const items = await StorageUtil.getItem<any[]>('feedback_items', []);
      
      // 添加到内存中的列表
      const existingIndex = items.findIndex(i => i.id === item.id);
      if (existingIndex >= 0) {
        items[existingIndex] = item;
      } else {
        items.push(item);
      }
      
      // 保存整个列表
      await StorageUtil.saveItem('feedback_items', items);
      
      logger.debug('已保存反馈到本地', { id: item.id });
    } catch (error) {
      logger.error('保存反馈到本地失败', error);
    }
  };
  
  // 监听设置变化，自动重新初始化API服务
  watch([apiUrl, apiTimeout], () => {
    logger.debug('API设置已更改，重新初始化API服务');
    
    if (apiState.instance) {
      apiState.instance.setBaseUrl(apiUrl.value);
      apiState.instance.setTimeout(apiTimeout.value);
      
      // 检查服务器可用性
      checkServerAvailability();
    } else {
      initApiService();
    }
  });
  
  // 初始化
  initApiService();
  
  return {
    // API状态
    apiState: computed(() => apiState),
    isLoading: computed(() => apiState.isLoading),
    isOffline: computed(() => apiState.isOffline),
    error: computed(() => apiState.error),
    
    // API实例
    apiInstance: computed(() => apiState.instance),
    
    // 基础方法
    initApiService,
    checkServerAvailability,
    
    // 验证码API
    getCaptchaRecordByUrl,
    saveCaptchaRecord,
    recognizeCaptcha,
    reportCaptchaResult,
    
    // 反馈API
    submitFeedback,
    syncLocalFeedback
  };
} 