import { storageService } from '../storage';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * 日志服务配置
 */
interface LoggerConfig {
  enabled: boolean;
  level: LogLevel;
  maxLogSize: number;
}

/**
 * 日志服务 - 用于记录系统信息和错误
 */
class LoggerService {
  private config: LoggerConfig = {
    enabled: true,
    level: LogLevel.INFO,
    maxLogSize: 500 // 最大保存日志条数
  };
  
  private logQueue: Array<{
    level: LogLevel;
    message: string;
    data?: any;
    timestamp: number;
  }> = [];
  
  constructor() {
    this.initConfig();
  }
  
  /**
   * 初始化日志配置
   */
  private async initConfig() {
    const settings = await storageService.getSettings();
    this.config.enabled = settings.enableLog;
    this.config.level = settings.logLevel as LogLevel;
  }
  
  /**
   * 获取级别优先级
   */
  private getLevelPriority(level: LogLevel): number {
    switch (level) {
      case LogLevel.DEBUG:
        return 0;
      case LogLevel.INFO:
        return 1;
      case LogLevel.WARN:
        return 2;
      case LogLevel.ERROR:
        return 3;
      default:
        return 1;
    }
  }
  
  /**
   * 检查是否应该记录该级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return this.getLevelPriority(level) >= this.getLevelPriority(this.config.level);
  }
  
  /**
   * 记录日志
   */
  private log(level: LogLevel, message: string, data?: any) {
    if (!this.shouldLog(level)) return;
    
    const logItem = {
      level,
      message,
      data,
      timestamp: Date.now()
    };
    
    this.logQueue.push(logItem);
    
    // 控制台输出
    const logMethod = level === LogLevel.ERROR ? console.error :
                      level === LogLevel.WARN ? console.warn :
                      level === LogLevel.INFO ? console.info :
                      console.debug;
    
    if (data) {
      logMethod(`[${level.toUpperCase()}] ${message}`, data);
    } else {
      logMethod(`[${level.toUpperCase()}] ${message}`);
    }
    
    // 限制日志大小
    if (this.logQueue.length > this.config.maxLogSize) {
      this.logQueue.shift();
    }
  }
  
  /**
   * 记录调试日志
   */
  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }
  
  /**
   * 记录信息日志
   */
  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }
  
  /**
   * 记录警告日志
   */
  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }
  
  /**
   * 记录错误日志
   */
  error(message: string, data?: any) {
    this.log(LogLevel.ERROR, message, data);
  }
  
  /**
   * 获取日志队列
   */
  getLogQueue() {
    return [...this.logQueue];
  }
  
  /**
   * 清空日志队列
   */
  clearLogQueue() {
    this.logQueue = [];
  }
}

// 导出单例
export const loggerService = new LoggerService(); 