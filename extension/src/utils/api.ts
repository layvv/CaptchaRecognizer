/**
 * API服务类模拟
 * 
 * 提供一个稳定的API接口实现，实际网络请求功能将在后续完善
 * 目前由于axios在扩展环境中可能遇到问题，我们暂时使用模拟实现
 */

import { ApiResponse } from '@/types';
import { Logger } from '@/utils/logger';

// 创建日志记录器
const logger = new Logger('ApiService');

/**
 * API服务类
 * 提供统一的API调用接口
 */
export class ApiService {
  private isServerAvailable: boolean = false;
  private baseUrl: string;
  private timeout: number;
  
  /**
   * 构造函数
   */
  constructor(baseUrl: string = 'http://localhost:8000/api', timeout: number = 10000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
    
    logger.info('API服务已初始化', { baseUrl, timeout });
  }
  
  /**
   * 设置基础URL
   */
  setBaseUrl(baseUrl: string): void {
    if (baseUrl && baseUrl !== this.baseUrl) {
      this.baseUrl = baseUrl;
      logger.debug('已更新API基础URL', { baseUrl });
    }
  }
  
  /**
   * 设置超时时间
   */
  setTimeout(timeout: number): void {
    if (timeout && timeout !== this.timeout) {
      this.timeout = timeout;
      logger.debug('已更新API超时时间', { timeout });
    }
  }
  
  /**
   * 检查服务器是否可用
   */
  async checkServerAvailability(endpoint: string = '/status'): Promise<boolean> {
    try {
      logger.debug('检查服务器可用性', { endpoint });
      // 模拟异步请求
      await new Promise(resolve => setTimeout(resolve, 500));
      // 暂时假设服务器不可用
      this.isServerAvailable = false;
      return false;
    } catch (error) {
      this.isServerAvailable = false;
      logger.warn('服务器不可用', error);
      return false;
    }
  }
  
  /**
   * 获取服务器可用状态
   */
  getServerAvailability(): boolean {
    return this.isServerAvailable;
  }
  
  /**
   * 设置服务器可用状态
   */
  setServerAvailability(available: boolean): void {
    this.isServerAvailable = available;
  }
  
  /**
   * GET请求
   */
  async get<T = any>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      logger.debug(`执行GET请求`, { url, params });
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        success: false,
        message: '服务器暂不可用',
        code: 503
      };
    } catch (error) {
      logger.error(`GET ${url} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      logger.debug(`执行POST请求`, { url, data });
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        success: false,
        message: '服务器暂不可用',
        code: 503
      };
    } catch (error) {
      logger.error(`POST ${url} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any): Promise<ApiResponse<T>> {
    try {
      logger.debug(`执行PUT请求`, { url, data });
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        success: false,
        message: '服务器暂不可用',
        code: 503
      };
    } catch (error) {
      logger.error(`PUT ${url} 失败:`, error);
      throw error;
    }
  }
  
  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    try {
      logger.debug(`执行DELETE请求`, { url, params });
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        success: false,
        message: '服务器暂不可用',
        code: 503
      };
    } catch (error) {
      logger.error(`DELETE ${url} 失败:`, error);
      throw error;
    }
  }
}