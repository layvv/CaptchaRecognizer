import { CaptchaRecord,Settings,CaptchaRecognizeRequest,CaptchaRecognizeResponse } from '@/types';

/**
 * 定义消息协议
 */
export interface MessagingProtocol {
  startSelectCaptcha: () => void;
  stopSelectCaptcha: () => void;
  uploadCaptchaRecord: (record: CaptchaRecord) => Promise<boolean>;
  updateSettings: (settings: Settings) => Promise<boolean>;
  getSettings: () => Promise<Settings>;
  getCaptchaRecord: () => Promise<CaptchaRecord | null>;
  recognizeCaptcha: (data: CaptchaRecognizeRequest) => Promise<CaptchaRecognizeResponse>;
}
