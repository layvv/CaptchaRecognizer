/**
 * 日志工具类，用于记录日志并设置级别
 */

// 日志级别
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  OFF: 4
};

/**
 * 日志工具类
 */
export class Logger {
  /**
   * 构造函数
   * @param {string} context 日志上下文
   * @param {number} level 日志级别
   */
  constructor(context, level = LOG_LEVELS.INFO) {
    this.context = context;
    this.level = level;
    
    // 全局日志级别
    this.globalLevel = LOG_LEVELS.INFO;
    
    // 是否启用控制台日志
    this.enableConsoleLog = true;
    
    // 是否启用远程日志
    this.enableRemoteLog = false;
    
    // 是否启用保存到本地存储
    this.enableLocalStorage = false;
    
    // 本地存储的最大日志数
    this.maxLocalLogs = 100;
    
    // 初始化前尝试获取存储的设置
    this.loadSettings();
  }

  /**
   * 加载日志设置
   */
  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'get_settings'
      });
      
      if (response && response.success) {
        const { settings } = response;
        
        if (settings.logLevel) {
          this.globalLevel = this.getLevelValue(settings.logLevel);
        }
        
        this.enableConsoleLog = settings.enableConsoleLog !== false;
        this.enableRemoteLog = settings.enableRemoteLog === true;
        this.enableLocalStorage = settings.enableLocalStorage === true;
      }
    } catch (error) {
      // 忽略错误，使用默认设置
    }
  }

  /**
   * 获取日志级别的数值
   * @param {string|number} level 日志级别
   * @returns {number} 日志级别数值
   */
  getLevelValue(level) {
    if (typeof level === 'number') {
      return level;
    }
    
    if (typeof level === 'string') {
      const upperLevel = level.toUpperCase();
      return LOG_LEVELS[upperLevel] !== undefined ? LOG_LEVELS[upperLevel] : LOG_LEVELS.INFO;
    }
    
    return LOG_LEVELS.INFO;
  }

  /**
   * 检查是否应该记录指定级别的日志
   * @param {number} level 日志级别
   * @returns {boolean} 是否应该记录
   */
  shouldLog(level) {
    return level >= Math.max(this.level, this.globalLevel);
  }

  /**
   * 格式化日志消息
   * @param {string} level 日志级别名称
   * @param {string} message 日志消息
   * @returns {string} 格式化后的日志消息
   */
  formatMessage(level, message) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.context}] ${message}`;
  }

  /**
   * 记录日志
   * @param {number} level 日志级别
   * @param {string} levelName 日志级别名称
   * @param {string} message 日志消息
   * @param {Array} args 额外参数
   */
  log(level, levelName, message, ...args) {
    if (!this.shouldLog(level)) {
      return;
    }
    
    const formattedMessage = this.formatMessage(levelName, message);
    
    if (this.enableConsoleLog) {
      switch (level) {
        case LOG_LEVELS.DEBUG:
          console.debug(formattedMessage, ...args);
          break;
        case LOG_LEVELS.INFO:
          console.info(formattedMessage, ...args);
          break;
        case LOG_LEVELS.WARN:
          console.warn(formattedMessage, ...args);
          break;
        case LOG_LEVELS.ERROR:
          console.error(formattedMessage, ...args);
          break;
      }
    }
    
    // 保存重要的日志到本地存储
    if (this.enableLocalStorage && level >= LOG_LEVELS.WARN) {
      this.saveToLocalStorage(levelName, message, args);
    }
    
    // 发送重要的日志到服务器
    if (this.enableRemoteLog && level >= LOG_LEVELS.ERROR) {
      this.sendToServer(levelName, message, args);
    }
  }

  /**
   * 保存日志到本地存储
   * @param {string} level 日志级别
   * @param {string} message 日志消息
   * @param {Array} args 额外参数
   */
  async saveToLocalStorage(level, message, args) {
    try {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        context: this.context,
        message,
        details: args.length > 0 ? JSON.stringify(args) : undefined,
        url: window.location.href
      };
      
      // 从存储中获取现有日志
      const data = await chrome.storage.local.get('logs');
      const logs = data.logs || [];
      
      // 添加新日志
      logs.push(logEntry);
      
      // 如果超过最大数量，删除旧的
      if (logs.length > this.maxLocalLogs) {
        logs.splice(0, logs.length - this.maxLocalLogs);
      }
      
      // 保存回存储
      await chrome.storage.local.set({ logs });
    } catch (error) {
      // 如果保存失败，不要陷入无限循环
      if (this.enableConsoleLog) {
        console.error('保存日志到本地存储失败:', error);
      }
    }
  }

  /**
   * 发送日志到服务器
   * @param {string} level 日志级别
   * @param {string} message 日志消息
   * @param {Array} args 额外参数
   */
  async sendToServer(level, message, args) {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        level,
        context: this.context,
        message,
        details: args.length > 0 ? args : undefined,
        url: window.location.href,
        userAgent: navigator.userAgent,
        version: chrome.runtime.getManifest().version
      };
      
      // 发送到后台脚本，由后台脚本发送到服务器
      await chrome.runtime.sendMessage({
        type: 'send_log',
        data: { logData }
      });
    } catch (error) {
      // 如果发送失败，不要陷入无限循环
      if (this.enableConsoleLog) {
        console.error('发送日志到服务器失败:', error);
      }
    }
  }

  /**
   * 记录调试级别日志
   * @param {string} message 日志消息
   * @param  {...any} args 额外参数
   */
  debug(message, ...args) {
    this.log(LOG_LEVELS.DEBUG, 'DEBUG', message, ...args);
  }

  /**
   * 记录信息级别日志
   * @param {string} message 日志消息
   * @param  {...any} args 额外参数
   */
  info(message, ...args) {
    this.log(LOG_LEVELS.INFO, 'INFO', message, ...args);
  }

  /**
   * 记录警告级别日志
   * @param {string} message 日志消息
   * @param  {...any} args 额外参数
   */
  warn(message, ...args) {
    this.log(LOG_LEVELS.WARN, 'WARN', message, ...args);
  }

  /**
   * 记录错误级别日志
   * @param {string} message 日志消息
   * @param  {...any} args 额外参数
   */
  error(message, ...args) {
    this.log(LOG_LEVELS.ERROR, 'ERROR', message, ...args);
  }

  /**
   * 设置日志级别
   * @param {number|string} level 日志级别
   */
  setLevel(level) {
    this.level = this.getLevelValue(level);
  }

  /**
   * 设置全局日志级别
   * @param {number|string} level 日志级别
   */
  setGlobalLevel(level) {
    this.globalLevel = this.getLevelValue(level);
  }

  /**
   * 启用/禁用控制台日志
   * @param {boolean} enable 是否启用
   */
  setConsoleLogging(enable) {
    this.enableConsoleLog = enable;
  }

  /**
   * 启用/禁用远程日志
   * @param {boolean} enable 是否启用
   */
  setRemoteLogging(enable) {
    this.enableRemoteLog = enable;
  }

  /**
   * 启用/禁用本地存储日志
   * @param {boolean} enable 是否启用
   */
  setLocalStorageLogging(enable) {
    this.enableLocalStorage = enable;
  }
}