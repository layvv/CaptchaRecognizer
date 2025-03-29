/**
 * 工具函数集合
 */

// 导出存储工具
export * from './storage';

// 导出消息传递工具
export * from './messaging';

// 导出DOM操作工具
export * from './dom-utils';

// 导出API工具
export * from './api';

// 导出日志工具
export * from './logger';

/**
 * 实用函数
 */

/**
 * 延迟函数
 * @param ms 延迟时间（毫秒）
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 格式化日期时间
 * @param date 日期
 * @param format 格式字符串
 * @returns 格式化后的字符串
 */
export function formatDateTime(date: Date, format = 'YYYY-MM-DD HH:mm:ss'): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}