/**
 * 日志工具类
 * 提供多级别、结构化的日志记录功能
 */
export class Logger {
  // 日志级别定义
  static LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
  };
  
  // 当前全局日志级别
  static currentLevel = Logger.LEVELS.INFO;
  
  // 是否启用持久化日志
  static enablePersistence = true;
  
  // 最大存储的日志条目数
  static maxLogEntries = 1000;
  
  /**
   * 创建一个Logger实例
   * @param {string} module 模块名称
   */
  constructor(module) {
    this.module = module;
    this.logBuffer = [];
  }
  
  /**
   * 调试日志
   * @param {string} message 消息
   * @param {object} data 额外数据
   */
  debug(message, data = {}) {
    this._log(Logger.LEVELS.DEBUG, message, data);
  }
  
  /**
   * 信息日志
   * @param {string} message 消息
   * @param {object} data 额外数据
   */
  info(message, data = {}) {
    this._log(Logger.LEVELS.INFO, message, data);
  }
  
  /**
   * 警告日志
   * @param {string} message 消息
   * @param {object} data 额外数据
   */
  warn(message, data = {}) {
    this._log(Logger.LEVELS.WARN, message, data);
  }
  
  /**
   * 错误日志
   * @param {string} message 消息
   * @param {object|Error} data 额外数据或错误对象
   */
  error(message, data = {}) {
    // 如果传入的是Error对象，转换为可序列化的对象
    if (data instanceof Error) {
      data = {
        message: data.message,
        stack: data.stack,
        name: data.name
      };
    }
    
    this._log(Logger.LEVELS.ERROR, message, data);
  }
  
  /**
   * 内部日志记录方法
   * @private
   */
  _log(level, message, data) {
    if (level < Logger.currentLevel) return;
    
    const timestamp = new Date().toISOString();
    const levelName = Object.keys(Logger.LEVELS).find(key => 
      Logger.LEVELS[key] === level
    );
    
    // 创建日志条目
    const logEntry = {
      timestamp,
      level: levelName,
      module: this.module,
      message,
      data
    };
    
    // 控制台输出
    const consoleMethod = this._getConsoleMethod(level);
    if (Object.keys(data).length > 0) {
      console[consoleMethod](`[${timestamp}] [${levelName}] [${this.module}] ${message}`, data);
    } else {
      console[consoleMethod](`[${timestamp}] [${levelName}] [${this.module}] ${message}`);
    }
    
    // 保存到缓冲区
    this.logBuffer.push(logEntry);
    
    // 持久化日志（如果启用）
    if (Logger.enablePersistence) {
      this._persistLogs(logEntry);
    }
  }
  
  /**
   * 获取对应的控制台方法
   * @private
   */
  _getConsoleMethod(level) {
    switch (level) {
      case Logger.LEVELS.DEBUG:
        return 'debug';
      case Logger.LEVELS.INFO:
        return 'info';
      case Logger.LEVELS.WARN:
        return 'warn';
      case Logger.LEVELS.ERROR:
        return 'error';
      default:
        return 'log';
    }
  }
  
  /**
   * 持久化日志
   * @private
   */
  _persistLogs(logEntry) {
    chrome.storage.local.get('appLogs', result => {
      let logs = result.appLogs || [];
      logs.push(logEntry);
      
      // 限制日志条目数量
      if (logs.length > Logger.maxLogEntries) {
        logs = logs.slice(-Logger.maxLogEntries);
      }
      
      chrome.storage.local.set({ appLogs: logs });
    });
  }
  
  /**
   * 获取所有日志
   * @static
   */
  static async getAllLogs() {
    return new Promise(resolve => {
      chrome.storage.local.get('appLogs', result => {
        resolve(result.appLogs || []);
      });
    });
  }
  
  /**
   * 清空所有日志
   * @static
   */
  static async clearAllLogs() {
    return new Promise(resolve => {
      chrome.storage.local.remove('appLogs', () => {
        resolve();
      });
    });
  }
  
  /**
   * 设置全局日志级别
   * @static
   */
  static setLogLevel(level) {
    if (typeof level === 'string') {
      level = Logger.LEVELS[level.toUpperCase()];
    }
    
    if (level !== undefined) {
      Logger.currentLevel = level;
    }
  }
} 