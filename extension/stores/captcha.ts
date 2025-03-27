import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useApi } from '../composables/useApi';
import type { 
  CaptchaInfoSet,
  CaptchaRecognizeRequest,
  CaptchaRecognizeResponse, 
  GetCaptchaInfoSetRequest,
  UploadCaptchaInfoSetRequest
} from '../types';

export const useCaptchaStore = defineStore('captcha', () => {
  const api = useApi();
  
  const currentInfoSet = ref<CaptchaInfoSet | null>(null);
  const recognitionResult = ref<CaptchaRecognizeResponse | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  const hasInfoSet = computed(() => !!currentInfoSet.value);
  
  // 获取当前网站的验证码信息集合
  async function fetchInfoSet(websiteUrl: string) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const request: GetCaptchaInfoSetRequest = { websiteUrl };
      const response = await api.getCaptchaInfoSet(request);
      
      currentInfoSet.value = response.infoSet;
      return response.infoSet;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '获取验证码信息失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  // 上传验证码信息集合
  async function uploadInfoSet(infoSet: CaptchaInfoSet) {
    isLoading.value = true;
    error.value = null;
    
    try {
      const request: UploadCaptchaInfoSetRequest = { infoSet };
      const response = await api.uploadCaptchaInfoSet(request);
      
      // 更新当前信息集合
      if (infoSet.id) {
        infoSet.id = response.id;
      }
      infoSet.status = response.status;
      currentInfoSet.value = infoSet;
      
      return response;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '上传验证码信息失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  // 识别验证码
  async function recognizeCaptcha(captchaImage: string, websiteUrl: string) {
    if (!currentInfoSet.value) {
      error.value = '未找到当前网站的验证码信息';
      throw new Error('未找到当前网站的验证码信息');
    }
    
    isLoading.value = true;
    error.value = null;
    
    try {
      const request: CaptchaRecognizeRequest = {
        captchaImage,
        websiteUrl,
        captchaType: currentInfoSet.value.captchaType
      };
      
      const result = await api.recognizeCaptcha(request);
      recognitionResult.value = result;
      return result;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '验证码识别失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }
  
  // 清除当前数据
  function clearData() {
    currentInfoSet.value = null;
    recognitionResult.value = null;
    error.value = null;
  }
  
  return {
    currentInfoSet,
    recognitionResult,
    isLoading,
    error,
    hasInfoSet,
    fetchInfoSet,
    uploadInfoSet,
    recognizeCaptcha,
    clearData
  };
}); 