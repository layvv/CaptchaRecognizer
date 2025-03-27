import { ref } from 'vue';
import type { ErrorResponse } from '../../types/api/common';

// API基础URL，实际使用时从环境变量或配置中获取
const API_BASE_URL = 'http://localhost:8000';

/**
 * 通用API请求composable
 */
export function useApiRequest() {
  const loading = ref(false);
  const error = ref<ErrorResponse | null>(null);

  /**
   * 发送API请求的通用方法
   */
  async function request<T, R>(
    path: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    data?: T,
    withAuth: boolean = true
  ): Promise<R> {
    loading.value = true;
    error.value = null;

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // 如果需要带上授权信息
      if (withAuth) {
        const token = localStorage.getItem('auth_token');
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      }

      const options: RequestInit = {
        method,
        headers,
        credentials: 'include',
      };

      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      const url = new URL(path, API_BASE_URL).toString();
      const response = await fetch(url, options);
      
      // 处理非2xx响应
      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        error.value = errorData;
        throw new Error(errorData.message || `请求失败: ${response.status}`);
      }

      return await response.json() as R;
    } catch (err) {
      if (!error.value) {
        error.value = {
          code: 500,
          message: err instanceof Error ? err.message : '未知错误'
        };
      }
      throw err;
    } finally {
      loading.value = false;
    }
  }

  return {
    loading,
    error,
    request
  };
} 