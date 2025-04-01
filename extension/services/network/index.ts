import { ApiRequest, ApiResponse } from '@/types/api';

/**
 * 网络服务 - 处理与服务器的通信
 */
class NetworkService {
  private baseUrl: string = 'http://localhost:8000/api'; // 开发环境默认地址
  private defaultTimeout: number = 30000; // 默认超时时间：30秒

  /**
   * 设置API基础URL
   */
  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  /**
   * 发送请求
   */
  async request<T, R>(apiRequest: ApiRequest<T>): Promise<ApiResponse<R>> {
    try {
      const { url, method, data, headers = {}, timeout = this.defaultTimeout } = apiRequest;
      const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        signal: controller.signal
      };
      
      if (data && (method === 'POST' || method === 'PUT')) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(fullUrl, options);
      clearTimeout(timeoutId);
      
      const responseData = await response.json();
      
      if (!response.ok) {
        return {
          code: response.status,
          message: responseData.message || response.statusText
        };
      }
      
      return {
        code: response.status,
        data: responseData.data,
        message: responseData.message
      };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return {
          code: 408,
          message: '请求超时'
        };
      }
      
      return {
        code: 500,
        message: (error as Error).message || '网络请求失败'
      };
    }
  }

  /**
   * GET请求
   */
  async get<R>(url: string, headers?: Record<string, string>, timeout?: number): Promise<ApiResponse<R>> {
    return this.request<null, R>({
      url,
      method: 'GET',
      headers,
      timeout
    });
  }

  /**
   * POST请求
   */
  async post<T, R>(url: string, data: T, headers?: Record<string, string>, timeout?: number): Promise<ApiResponse<R>> {
    return this.request<T, R>({
      url,
      method: 'POST',
      data,
      headers,
      timeout
    });
  }

  /**
   * PUT请求
   */
  async put<T, R>(url: string, data: T, headers?: Record<string, string>, timeout?: number): Promise<ApiResponse<R>> {
    return this.request<T, R>({
      url,
      method: 'PUT',
      data,
      headers,
      timeout
    });
  }

  /**
   * DELETE请求
   */
  async delete<R>(url: string, headers?: Record<string, string>, timeout?: number): Promise<ApiResponse<R>> {
    return this.request<null, R>({
      url,
      method: 'DELETE',
      headers,
      timeout
    });
  }
}

// 导出单例
export const networkService = new NetworkService(); 