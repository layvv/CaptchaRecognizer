<template>
  <div class="popup-container">
    <header class="header">
      <h1 class="title">验证码识别器</h1>
    </header>
    
    <div class="content">
      <div class="status-section">
        <div class="status-row">
          <span>扩展状态:</span>
          <el-switch
            v-model="settings.enabled"
            active-color="#13ce66"
            inactive-color="#ff4949"
            @change="updateSettings"
          ></el-switch>
        </div>
        
        <div class="status-row">
          <span>自动识别:</span>
          <el-switch
            v-model="settings.autoRecognize"
            active-color="#13ce66"
            inactive-color="#ff4949"
            :disabled="!settings.enabled"
            @change="updateSettings"
          ></el-switch>
        </div>
        
        <div class="status-row">
          <span>高亮元素:</span>
          <el-switch
            v-model="settings.highlightElement"
            active-color="#13ce66"
            inactive-color="#ff4949"
            :disabled="!settings.enabled"
            @change="updateSettings"
          ></el-switch>
        </div>
      </div>
      
      <div class="action-section">
        <el-button 
          type="primary" 
          class="action-button" 
          @click="startSelectCaptcha"
          :disabled="!settings.enabled"
        >
          选择验证码
        </el-button>
        
        <el-button 
          type="info" 
          class="action-button" 
          @click="viewCaptchaRecords"
          :disabled="!settings.enabled"
        >
          查看记录
        </el-button>
      </div>
      
      <div class="captcha-info" v-if="activeCaptcha">
        <h3>当前页面验证码</h3>
        <div class="info-row">
          <span class="label">类型:</span>
          <span class="value">{{ getCaptchaTypeName(activeCaptcha.type) }}</span>
        </div>
        <div class="info-row">
          <span class="label">选择器:</span>
          <span class="value code">{{ activeCaptcha.selector }}</span>
        </div>
      </div>
      
      <div class="no-captcha" v-else>
        <p>当前页面未检测到验证码</p>
        <p>点击"选择验证码"按钮来手动选择</p>
      </div>
    </div>
    
    <footer class="footer">
      <span class="version">版本: 1.0.0</span>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { sendMessage } from '@/services/messaging';
import { Settings, CaptchaRecord, CaptchaType } from '@/types';

// 设置状态
const settings = ref<Settings>({
  enabled: true,
  autoRecognize: true,
  maxRetry: 3,
  highlightElement: true,
  theme: 'system',
  enableLog: true,
  logLevel: 'info'
});

// 当前活动验证码
const activeCaptcha = ref<CaptchaRecord | null>(null);

// 加载组件时初始化数据
onMounted(async () => {
  try {
    // 加载设置
    const loadedSettings = await sendMessage('getSettings', undefined);
    if (loadedSettings) {
      settings.value = loadedSettings;
    }
    
    // 获取当前页面的验证码记录
    const record = await sendMessage('getCaptchaRecord', undefined);
    activeCaptcha.value = record;
  } catch (error) {
    console.error('初始化失败:', error);
    ElMessage.error('加载设置失败');
  }
});

// 更新设置
const updateSettings = async () => {
  try {
    await sendMessage('updateSettings', settings.value);
    ElMessage.success('设置已更新');
  } catch (error) {
    console.error('更新设置失败:', error);
    ElMessage.error('更新设置失败');
  }
};

// 开始选择验证码
const startSelectCaptcha = async () => {
  try {
    console.log('发送开始选择验证码消息');
    // 获取当前标签页
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tabs || tabs.length === 0) {
      console.error('无法获取当前标签页');
      ElMessage.error('无法获取当前标签页');
      return;
    }
    
    const currentTab = tabs[0];
    if (!currentTab.id) {
      console.error('无法获取标签页ID');
      ElMessage.error('无法获取标签页ID');
      return;
    }
    
    // 发送消息时指定标签页ID
    await sendMessage('startSelectCaptcha', undefined, currentTab.id);
    window.close(); // 关闭弹出窗口
  } catch (error) {
    console.error('启动验证码选择器失败:', error);
    ElMessage.error('启动验证码选择器失败');
  }
};

// 查看验证码记录
const viewCaptchaRecords = () => {
  // 实现查看验证码记录的功能（可以是新标签页或弹出窗口）
  ElMessage.info('查看验证码记录功能开发中');
};

// 获取验证码类型名称
const getCaptchaTypeName = (type: CaptchaType): string => {
  switch (type) {
    case CaptchaType.CHAR:
      return '字符验证码';
    case CaptchaType.SLIDER:
      return '滑块验证码';
    case CaptchaType.CLICK:
      return '点选验证码';
    case CaptchaType.ROTATE:
      return '旋转验证码';
    case CaptchaType.PUZZLE:
      return '拼图验证码';
    default:
      return '未知类型';
  }
};
</script>

<style scoped>
.popup-container {
  width: 350px;
  min-height: 400px;
  display: flex;
  flex-direction: column;
  font-family: 'Arial', sans-serif;
}

.header {
  background-color: #4285f4;
  color: white;
  padding: 12px 16px;
  text-align: center;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.content {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-section {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
}

.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.status-row:last-child {
  margin-bottom: 0;
}

.action-section {
  display: flex;
  gap: 10px;
}

.action-button {
  flex: 1;
}

.captcha-info {
  background-color: #f5f5f5;
  border-radius: 8px;
  padding: 12px;
}

.captcha-info h3 {
  margin-top: 0;
  margin-bottom: 10px;
  font-size: 16px;
  color: #333;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
}

.label {
  font-weight: bold;
  width: 70px;
}

.value {
  flex: 1;
}

.code {
  font-family: monospace;
  font-size: 12px;
  word-break: break-all;
}

.no-captcha {
  text-align: center;
  color: #666;
  padding: 20px 0;
}

.no-captcha p {
  margin: 5px 0;
}

.footer {
  padding: 10px 16px;
  background-color: #f5f5f5;
  border-top: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #666;
}
</style>
