// 用户相关API接口定义

// 用户登录请求
export type LoginRequest = {
  username: string;
  password: string;
};

// 用户注册请求
export type RegisterRequest = {
  username: string;
  password: string;
  email: string;
};

// 用户信息响应
export type UserInfo = {
  id: string;
  username: string;
  email: string;
  token: string;
  usageCount: number;
  isAdmin: boolean;
};

// 用户API路径
export const USER_API_PATHS = {
  LOGIN: '/api/user/login',
  REGISTER: '/api/user/register',
  USER_INFO: '/api/user/info',
}; 