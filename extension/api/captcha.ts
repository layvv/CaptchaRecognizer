import { CaptchaInfoSet } from '../types/captcha/infoSet';
import { CaptchaInfoSetStatus, CaptchaType } from '../types/captcha/enums';
import { FeatureScore } from '../types/captcha/feature';

/**
 * 验证码API服务
 */
export const captchaApi = {
  /**
   * 提交验证码信息集
   * @param infoSet 验证码信息集
   */
  async submitInfoSet(infoSet: CaptchaInfoSet): Promise<{ id: string; status: CaptchaInfoSetStatus }> {
    try {
      // TODO: 实现实际API调用
      console.log('提交验证码信息集', infoSet);
      return {
        id: `captcha-${Date.now()}`,
        status: CaptchaInfoSetStatus.PENDING
      };
    } catch (error) {
      console.error('提交验证码信息集失败', error);
      throw error;
    }
  },

  /**
   * 获取验证码信息集
   * @param id 验证码信息集ID
   */
  async getInfoSet(id: string): Promise<CaptchaInfoSet | null> {
    try {
      // TODO: 实现实际API调用
      console.log('获取验证码信息集', id);
      return null;
    } catch (error) {
      console.error('获取验证码信息集失败', error);
      return null;
    }
  },

  /**
   * 获取验证码类型信息集列表
   * @param type 验证码类型
   * @param limit 限制数量
   */
  async getInfoSetsByType(type: CaptchaType, limit = 10): Promise<CaptchaInfoSet[]> {
    try {
      // TODO: 实现实际API调用
      console.log('获取验证码类型信息集列表', type, limit);
      return [];
    } catch (error) {
      console.error('获取验证码类型信息集列表失败', error);
      return [];
    }
  },

  /**
   * 提交特征评分结果
   * @param captchaId 验证码ID
   * @param score 评分结果
   */
  async submitFeatureScore(captchaId: string, score: FeatureScore): Promise<boolean> {
    try {
      // TODO: 实现实际API调用
      console.log('提交特征评分结果', captchaId, score);
      return true;
    } catch (error) {
      console.error('提交特征评分结果失败', error);
      return false;
    }
  },

  /**
   * 上报验证码识别问题
   * @param captchaId 验证码ID
   * @param problem 问题描述
   * @param screenshot 截图数据
   */
  async reportProblem(captchaId: string, problem: string, screenshot?: string): Promise<boolean> {
    try {
      // TODO: 实现实际API调用
      console.log('上报验证码识别问题', captchaId, problem);
      return true;
    } catch (error) {
      console.error('上报验证码识别问题失败', error);
      return false;
    }
  }
}; 