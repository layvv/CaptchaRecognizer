
/**
 * API请求接口
 */
export interface ApiRequest<T> {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: T;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * API响应接口
 */
export interface ApiResponse<T> {
  code: number;
  data?: T;
  message?: string;
}

