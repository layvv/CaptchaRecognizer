<template>
  <div class="popup-container">
    <el-card class="mb-10">
      <template #header>
        <div class="card-header">
          <span>验证码识别助手</span>
          <el-switch
            v-model="settings.enabled"
            @change="saveSettings"
            active-color="#13ce66"
          />
        </div>
      </template>
      <div v-if="isLoading" class="text-center">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="error" class="text-center status-error">
        <el-icon><CircleClose /></el-icon>
        <span>{{ error }}</span>
      </div>
      <div v-else>
        <el-form label-position="left" label-width="120px">
          <el-form-item label="自动处理验证码">
            <el-switch
              v-model="settings.autoSolve"
              :disabled="!settings.enabled"
              @change="saveSettings"
            />
          </el-form-item>
          <el-form-item label="高亮验证码">
            <el-switch
              v-model="settings.highlightCaptcha"
              :disabled="!settings.enabled"
              @change="saveSettings"
            />
          </el-form-item>
          <el-form-item label="使用本地缓存">
            <el-switch
              v-model="settings.useLocalCache"
              :disabled="!settings.enabled"
              @change="saveSettings"
            />
          </el-form-item>
          <el-form-item label="调试模式">
            <el-switch
              v-model="settings.debugMode"
              :disabled="!settings.enabled"
              @change="saveSettings"
            />
          </el-form-item>
        </el-form>
      </div>
    </el-card>
    
    <el-card v-if="settings.enabled">
      <template #header>
        <div class="card-header">
          <span>当前页面验证码</span>
        </div>
      </template>
      <div v-if="captchaStore.isLoading" class="text-center">
        <el-icon class="is-loading"><Loading /></el-icon>
        <span>加载中...</span>
      </div>
      <div v-else-if="captchaStore.error" class="text-center status-error">
        <el-icon><CircleClose /></el-icon>
        <span>{{ captchaStore.error }}</span>
      </div>
      <div v-else-if="captchaStore.hasValidRecord" class="record-info">
        <div>
          <span class="record-label">验证码类型:</span>
          <span>{{ formatCaptchaType(captchaStore.currentRecord?.captchaType) }}</span>
        </div>
        <div>
          <span class="record-label">选择器:</span>
          <span>{{ captchaStore.currentRecord?.selector }}</span>
        </div>
        <div>
          <span class="record-label">成功率:</span>
          <span>{{ formatSuccessRate(captchaStore.currentRecord?.successRate) }}</span>
        </div>
        <div class="record-actions mt-10">
          <el-button type="primary" size="small" @click="startCaptchaSelector">
            重新选择验证码
          </el-button>
        </div>
      </div>
      <div v-else class="text-center">
        <p>当前页面未检测到验证码记录</p>
        <el-button type="primary" size="small" @click="startCaptchaSelector">
          手动选择验证码
        </el-button>
      </div>
    </el-card>
    
    <div class="text-center version-info">
      <p>CaptchaRecognizer v1.0.0</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Check, Close, Loading, CircleClose } from '@element-plus/icons-vue';
import { useSettingsStore, useCaptchaStore } from '@/stores';
import { MessagingUtil } from '@/utils';
import { CaptchaType, MessageType } from '@/types';

// 加载状态
const isLoading = ref(false);
const error = ref<string | null>(null);

// 获取store
const settingsStore = useSettingsStore();
const captchaStore = useCaptchaStore();

// 设置计算属性
const settings = computed(() => settingsStore.settings);

// 初始化
onMounted(async () => {
  await loadData();
});

// 加载数据
async function loadData() {
  isLoading.value = true;
  error.value = null;
  
  try {
    // 加载设置
    await settingsStore.loadSettings();
    
    // 获取当前标签页信息
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    if (currentTab && currentTab.url && settingsStore.settings.enabled) {
      // 加载当前页面的验证码记录
      await captchaStore.loadRecordForCurrentPage(currentTab.url);
    }
  } catch (err) {
    console.error('加载数据失败:', err);
    error.value = '加载数据失败';
  } finally {
    isLoading.value = false;
  }
}

// 保存设置
async function saveSettings() {
  try {
    await settingsStore.saveSettings(settings.value);
    
    // 通知内容脚本更新设置
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    if (currentTab && currentTab.id) {
      try {
        await MessagingUtil.sendToContent(currentTab.id, {
          type: MessageType.GET_SETTINGS
        });
      } catch (error) {
        // 忽略错误，内容脚本可能未加载
      }
    }
  } catch (err) {
    console.error('保存设置失败:', err);
  }
}

// 开始验证码选择器
async function startCaptchaSelector() {
  try {
    // 获取当前标签页
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    if (currentTab && currentTab.id) {
      await MessagingUtil.sendToContent(currentTab.id, {
        type: MessageType.START_CAPTCHA_SELECTOR
      });
      
      // 关闭弹出窗口
      window.close();
    }
  } catch (err) {
    console.error('启动验证码选择器失败:', err);
  }
}

// 格式化验证码类型
function formatCaptchaType(type?: CaptchaType): string {
  if (!type) return '未知';
  
  const typeMap: Record<CaptchaType, string> = {
    [CaptchaType.CHARACTER]: '字符验证码',
    [CaptchaType.SLIDER]: '滑块验证码',
    [CaptchaType.CLICK]: '点击验证码',
    [CaptchaType.CUSTOM]: '自定义验证码'
  };
  
  return typeMap[type] || '未知';
}

// 格式化成功率
function formatSuccessRate(rate?: number): string {
  if (rate === undefined || rate === null) return '未知';
  return `${(rate * 100).toFixed(1)}%`;
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-info {
  line-height: 1.8;
}

.record-label {
  display: inline-block;
  width: 80px;
  color: #606266;
}

.record-actions {
  display: flex;
  justify-content: center;
}
</style> 