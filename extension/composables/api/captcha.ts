import { useApiRequest } from './common';
import { CAPTCHA_API_PATHS } from '../../types/api/captcha';
import type { 
  RecognizeRequest, 
  RecognizeResponse,
  GetInfoSetRequest,
  GetInfoSetResponse,
  UploadInfoSetRequest,
  UploadInfoSetResponse,
  FeatureVerificationResult
} from '../../types/api/captcha';

/**
 * 验证码相关API composable
 */
export function useCaptchaApi() {
  const { request, loading, error } = useApiRequest();

  // 识别验证码
  async function recognizeCaptcha(data: RecognizeRequest): Promise<RecognizeResponse> {
    return request<RecognizeRequest, RecognizeResponse>(
      CAPTCHA_API_PATHS.RECOGNIZE,
      'POST',
      data
    );
  }

  // 获取验证码信息集合
  async function getInfoSet(data: GetInfoSetRequest): Promise<GetInfoSetResponse> {
    const params = new URLSearchParams();
    params.append('websiteUrl', data.websiteUrl);
    
    return request<null, GetInfoSetResponse>(
      `${CAPTCHA_API_PATHS.GET_INFO_SET}?${params.toString()}`
    );
  }

  // 上传验证码信息集合
  async function uploadInfoSet(data: UploadInfoSetRequest): Promise<UploadInfoSetResponse> {
    return request<UploadInfoSetRequest, UploadInfoSetResponse>(
      CAPTCHA_API_PATHS.UPLOAD_INFO_SET,
      'POST',
      data
    );
  }

  // 验证验证码信息集合特征
  async function verifyInfoSet(data: UploadInfoSetRequest): Promise<FeatureVerificationResult> {
    return request<UploadInfoSetRequest, FeatureVerificationResult>(
      CAPTCHA_API_PATHS.VERIFY_INFO_SET,
      'POST',
      data
    );
  }

  return {
    loading,
    error,
    recognizeCaptcha,
    getInfoSet,
    uploadInfoSet,
    verifyInfoSet
  };
} 