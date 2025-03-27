import { useApiRequest } from './common';
import { USER_API_PATHS } from '../../types/api/user';
import type { LoginRequest, RegisterRequest, UserInfo } from '../../types/api/user';

/**
 * 用户相关API composable
 */
export function useUserApi() {
  const { request, loading, error } = useApiRequest();

  // 用户登录
  async function login(data: LoginRequest): Promise<UserInfo> {
    return request<LoginRequest, UserInfo>(
      USER_API_PATHS.LOGIN,
      'POST',
      data,
      false
    );
  }

  // 用户注册
  async function register(data: RegisterRequest): Promise<UserInfo> {
    return request<RegisterRequest, UserInfo>(
      USER_API_PATHS.REGISTER,
      'POST',
      data,
      false
    );
  }

  // 获取用户信息
  async function getUserInfo(): Promise<UserInfo> {
    return request<null, UserInfo>(USER_API_PATHS.USER_INFO);
  }

  return {
    loading,
    error,
    login,
    register,
    getUserInfo
  };
} 