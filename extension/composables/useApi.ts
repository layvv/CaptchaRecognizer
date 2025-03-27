import { ref } from 'vue';
import { API_PATHS } from '../types';
import type { 
  UserLoginRequest,
  UserRegisterRequest,
  UserResponse,
  CaptchaRecognizeRequest,
  CaptchaRecognizeResponse,
  GetCaptchaInfoSetRequest,
  GetCaptchaInfoSetResponse,
  UploadCaptchaInfoSetRequest,
  UploadCaptchaInfoSetResponse,
  ErrorResponse
} from '../types';

// API基础URL，实际使用时从环境变量或配置中获取
const API_BASE_URL = 'http://localhost:8000';

export function useApi() {
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

  // 用户登录
  async function login(data: UserLoginRequest): Promise<UserResponse> {
    return request<UserLoginRequest, UserResponse>(
      API_PATHS.LOGIN,
      'POST',
      data,
      false
    );
  }

  // 用户注册
  async function register(data: UserRegisterRequest): Promise<UserResponse> {
    return request<UserRegisterRequest, UserResponse>(
      API_PATHS.REGISTER,
      'POST',
      data,
      false
    );
  }

  // 获取用户信息
  async function getUserInfo(): Promise<UserResponse> {
    return request<null, UserResponse>(API_PATHS.USER_INFO);
  }

  // 识别验证码
  async function recognizeCaptcha(data: CaptchaRecognizeRequest): Promise<CaptchaRecognizeResponse> {
    return request<CaptchaRecognizeRequest, CaptchaRecognizeResponse>(
      API_PATHS.RECOGNIZE,
      'POST',
      data
    );
  }

  // 获取验证码信息集合
  async function getCaptchaInfoSet(data: GetCaptchaInfoSetRequest): Promise<GetCaptchaInfoSetResponse> {
    const params = new URLSearchParams();
    params.append('websiteUrl', data.websiteUrl);
    
    return request<null, GetCaptchaInfoSetResponse>(
      `${API_PATHS.GET_INFO_SET}?${params.toString()}`
    );
  }

  // 上传验证码信息集合
  async function uploadCaptchaInfoSet(data: UploadCaptchaInfoSetRequest): Promise<UploadCaptchaInfoSetResponse> {
    return request<UploadCaptchaInfoSetRequest, UploadCaptchaInfoSetResponse>(
      API_PATHS.UPLOAD_INFO_SET,
      'POST',
      data
    );
  }

  return {
    loading,
    error,
    login,
    register,
    getUserInfo,
    recognizeCaptcha,
    getCaptchaInfoSet,
    uploadCaptchaInfoSet
  };
} 