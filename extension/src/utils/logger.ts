import { StorageUtil } from './storage';

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
 * 日志条目接口
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: any;
}

/**
 * 日志工具类
 * 提供统一的日志记录功能，可以替代直接使用console
 */
export class Logger {
  private static readonly MAX_LOGS = 1000;
  private static readonly STORAGE_KEY = 'app_logs';
  private static debugMode = false;
  private module: string;

  /**
   * 构造函数
   * @param module 模块名称，用于标识日志来源
   */
  constructor(module: string) {
    this.module = module;
  }

  /**
   * 设置调试模式
   */
  static setDebugMode(enabled: boolean): void {
    Logger.debugMode = enabled;
  }

  /**
   * 获取调试模式状态
   */
  static isDebugMode(): boolean {
    return Logger.debugMode;
  }

  /**
   * 记录调试级别日志
   */
  debug(message: string, data?: any): void {
    if (Logger.debugMode) {
      this.log(LogLevel.DEBUG, message, data);
    }
  }

  /**
   * 记录信息级别日志
   */
  info(message: string, data?: any): void {
    this.log(LogLevel.INFO, message, data);
  }

  /**
   * 记录警告级别日志
   */
  warn(message: string, data?: any): void {
    this.log(LogLevel.WARN, message, data);
  }

  /**
   * 记录错误级别日志
   */
  error(message: string, data?: any): void {
    this.log(LogLevel.ERROR, message, data);
  }

  /**
   * 内部日志记录方法
   */
  private log(level: LogLevel, message: string, data?: any): void {
    // 打印到控制台
    this.printToConsole(level, message, data);
    
    // 保存到存储
    this.saveToStorage(level, message, data);
  }

  /**
   * 打印日志到控制台
   */
  private printToConsole(level: LogLevel, message: string, data?: any): void {
    const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}] [${this.module}]`;
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(prefix, message, data !== undefined ? data : '');
        break;
      case LogLevel.INFO:
        console.log(prefix, message, data !== undefined ? data : '');
        break;
      case LogLevel.WARN:
        console.warn(prefix, message, data !== undefined ? data : '');
        break;
      case LogLevel.ERROR:
        console.error(prefix, message, data !== undefined ? data : '');
        break;
    }
  }

  /**
   * 保存日志到存储
   */
  private async saveToStorage(level: LogLevel, message: string, data?: any): Promise<void> {
    if (!Logger.debugMode && level === LogLevel.DEBUG) {
      return; // 非调试模式下不保存调试日志
    }

    try {
      const entry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        module: this.module,
        message,
        data: data
      };

      // 读取现有日志
      const logs = await this.getLogs();
      
      // 添加新日志并限制数量
      logs.push(entry);
      if (logs.length > Logger.MAX_LOGS) {
        logs.splice(0, logs.length - Logger.MAX_LOGS);
      }
      
      // 保存日志
      await StorageUtil.saveItem(Logger.STORAGE_KEY, logs);
    } catch (error) {
      console.error('保存日志失败:', error);
    }
  }

  /**
   * 获取所有日志
   */
  async getLogs(): Promise<LogEntry[]> {
    try {
      return await StorageUtil.getItem<LogEntry[]>(Logger.STORAGE_KEY, []);
    } catch (error) {
      console.error('获取日志失败:', error);
      return [];
    }
  }

  /**
   * 清除所有日志
   */
  async clearLogs(): Promise<void> {
    try {
      await StorageUtil.saveItem(Logger.STORAGE_KEY, []);
    } catch (error) {
      console.error('清除日志失败:', error);
    }
  }

  /**
   * 获取指定级别的日志
   */
  async getLogsByLevel(level: LogLevel): Promise<LogEntry[]> {
    const logs = await this.getLogs();
    return logs.filter(log => log.level === level);
  }

  /**
   * 获取指定模块的日志
   */
  async getLogsByModule(module: string): Promise<LogEntry[]> {
    const logs = await this.getLogs();
    return logs.filter(log => log.module === module);
  }

  /**
   * 导出日志为JSON字符串
   */
  async exportLogs(): Promise<string> {
    const logs = await this.getLogs();
    return JSON.stringify(logs, null, 2);
  }
} 