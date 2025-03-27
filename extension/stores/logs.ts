import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { 
  LogEntry, 
  LogLevel, 
  LogContext, 
  LogContextType,
  ApiLogContext,
  RecognitionLogContext,
  CaptchaLogContext,
  UserLogContext,
  SystemLogContext
} from '../types';

// 日志存储状态存储
export const useLogsStore = defineStore('logs', () => {
  // 日志最大存储数量
  const MAX_LOGS = 1000;
  
  // 存储日志条目
  const logs = ref<LogEntry[]>([]);

  // 按日志级别筛选
  const getLogsByLevel = computed(() => (level: LogLevel) => {
    return logs.value.filter(log => log.level === level);
  });

  // 按上下文类型筛选
  const getLogsByContextType = computed(() => (type: LogContextType) => {
    return logs.value.filter(log => log.context.type === type);
  });

  // 按标签筛选
  const getLogsByTag = computed(() => (tag: string) => {
    return logs.value.filter(log => log.context.tags?.includes(tag));
  });

  // 按跟踪ID筛选
  const getLogsByTraceId = computed(() => (traceId: string) => {
    return logs.value.filter(log => log.context.traceId === traceId);
  });

  // 添加日志
  function addLog(level: LogLevel, message: string, context: LogContext): LogEntry {
    const logEntry: LogEntry = {
      id: uuidv4(),
      level,
      message,
      timestamp: new Date().toISOString(),
      context
    };

    logs.value.unshift(logEntry);

    // 限制日志数量
    if (logs.value.length > MAX_LOGS) {
      logs.value = logs.value.slice(0, MAX_LOGS);
    }

    // 可以在这里实现将日志保存到本地存储的逻辑
    persistLogs();

    return logEntry;
  }

  // 添加成功日志
  function success(message: string, context: LogContext) {
    return addLog(LogLevel.SUCCESS, message, context);
  }

  // 添加信息日志
  function info(message: string, context: LogContext) {
    return addLog(LogLevel.INFO, message, context);
  }

  // 添加警告日志
  function warning(message: string, context: LogContext) {
    return addLog(LogLevel.WARNING, message, context);
  }

  // 添加错误日志
  function error(message: string, context: LogContext) {
    return addLog(LogLevel.ERROR, message, context);
  }

  // 添加调试日志
  function debug(message: string, context: LogContext) {
    return addLog(LogLevel.DEBUG, message, context);
  }

  // 添加API日志
  function logApi(level: LogLevel, message: string, context: Omit<ApiLogContext, 'type'>) {
    return addLog(level, message, {
      type: LogContextType.API,
      ...context
    });
  }

  // 添加验证码识别日志
  function logRecognition(level: LogLevel, message: string, context: Omit<RecognitionLogContext, 'type'>) {
    return addLog(level, message, {
      type: LogContextType.RECOGNITION,
      ...context
    });
  }

  // 添加验证码操作日志
  function logCaptcha(level: LogLevel, message: string, context: Omit<CaptchaLogContext, 'type'>) {
    return addLog(level, message, {
      type: LogContextType.CAPTCHA,
      ...context
    });
  }

  // 添加用户操作日志
  function logUser(level: LogLevel, message: string, context: Omit<UserLogContext, 'type'>) {
    return addLog(level, message, {
      type: LogContextType.USER,
      ...context
    });
  }

  // 添加系统日志
  function logSystem(level: LogLevel, message: string, context: Omit<SystemLogContext, 'type'>) {
    return addLog(level, message, {
      type: LogContextType.SYSTEM,
      ...context
    });
  }

  // 清空日志
  function clearLogs() {
    logs.value = [];
    persistLogs();
  }

  // 将日志持久化到本地存储
  function persistLogs() {
    try {
      // 只保存最近的100条日志到本地存储
      const recentLogs = logs.value.slice(0, 100);
      localStorage.setItem('captcha_recognizer_logs', JSON.stringify(recentLogs));
    } catch (error) {
      console.error('无法保存日志到本地存储:', error);
    }
  }

  // 从本地存储加载日志
  function loadLogs() {
    try {
      const storedLogs = localStorage.getItem('captcha_recognizer_logs');
      if (storedLogs) {
        logs.value = JSON.parse(storedLogs);
      }
    } catch (error) {
      console.error('无法从本地存储加载日志:', error);
    }
  }

  // 初始化时加载日志
  loadLogs();

  return {
    logs,
    getLogsByLevel,
    getLogsByContextType,
    getLogsByTag,
    getLogsByTraceId,
    addLog,
    success,
    info,
    warning,
    error,
    debug,
    logApi,
    logRecognition,
    logCaptcha,
    logUser,
    logSystem,
    clearLogs
  };
}, {
  // 启用状态持久化
  persist: true
}); 