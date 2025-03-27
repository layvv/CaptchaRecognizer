import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useUserApi } from '../composables/api';
import type { UserInfo, LoginRequest, RegisterRequest } from '../types';

export const useUserStore = defineStore('user', () => {
  const userApi = useUserApi();
  
  const currentUser = ref<UserInfo | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  const isLoggedIn = computed(() => !!currentUser.value);
  const isAdmin = computed(() => currentUser.value?.isAdmin || false);
  const usageCount = computed(() => currentUser.value?.usageCount || 0);
  
  // 登录
  async function login(credentials: LoginRequest) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const user = await userApi.login(credentials);
      currentUser.value = user;
      
      // 保存认证令牌到本地存储
      localStorage.setItem('auth_token', user.token);
      
      return user;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '登录失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  // 注册
  async function register(userData: RegisterRequest) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const user = await userApi.register(userData);
      currentUser.value = user;
      
      // 保存认证令牌到本地存储
      localStorage.setItem('auth_token', user.token);
      
      return user;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '注册失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  // 登出
  function logout() {
    currentUser.value = null;
    localStorage.removeItem('auth_token');
  }
  
  // 加载用户信息
  async function loadUserInfo() {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    
    isLoading.value = true;
    
    try {
      const user = await userApi.getUserInfo();
      currentUser.value = user;
    } catch (err) {
      // 如果获取用户信息失败，可能是令牌无效，清除本地存储
      logout();
      error.value = '获取用户信息失败，请重新登录';
    } finally {
      isLoading.value = false;
    }
  }
  
  return {
    currentUser,
    isLoading,
    error,
    isLoggedIn,
    isAdmin,
    usageCount,
    login,
    register,
    logout,
    loadUserInfo
  };
}); 