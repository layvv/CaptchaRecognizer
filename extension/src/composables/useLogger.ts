import { ref, reactive, computed, readonly, watch } from 'vue';
import { Logger, LogLevel, LogEntry } from '@/utils/logger';
import { useSettingsStore } from '@/stores/settings';

/**
 * 全局日志模块
 */
let globalLogger: Logger | null = null;

/**
 * 日志组合函数
 * 提供全局的日志记录与查询功能
 */
export function useLogger(module: string) {
  const settingsStore = useSettingsStore();
  
  // 创建日志记录器
  const logger = new Logger(module);
  
  // 设置全局日志记录器(默认为第一个创建的记录器)
  if (!globalLogger) {
    globalLogger = logger;
  }
  
  // 根据设置更新调试模式
  const updateDebugMode = () => {
    if (settingsStore.settings) {
      Logger.setDebugMode(settingsStore.settings.debugMode);
    }
  };
  
  // 初始化时设置调试模式
  updateDebugMode();
  
  // 监听设置变化，更新调试模式
  watch(
    () => settingsStore.settings.debugMode,
    (newValue) => {
      Logger.setDebugMode(newValue);
    }
  );
  
  return {
    // 记录调试日志
    debug: (message: string, data?: any) => logger.debug(message, data),
    
    // 记录信息日志
    info: (message: string, data?: any) => logger.info(message, data),
    
    // 记录警告日志
    warn: (message: string, data?: any) => logger.warn(message, data),
    
    // 记录错误日志
    error: (message: string, data?: any) => logger.error(message, data),
    
    // 获取日志记录
    getLogs: () => logger.getLogs(),
    
    // 清除日志
    clearLogs: () => logger.clearLogs(),
    
    // 获取指定级别的日志
    getLogsByLevel: (level: LogLevel) => logger.getLogsByLevel(level),
    
    // 导出日志
    exportLogs: () => logger.exportLogs(),
    
    // 是否处于调试模式
    isDebugMode: computed(() => Logger.isDebugMode()),
    
    // 日志级别枚举
    LogLevel
  };
}

/**
 * 获取全局日志管理器
 */
export function getGlobalLogger(): Logger | null {
  return globalLogger;
}

/**
 * 设置全局日志管理器
 */
export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
} 