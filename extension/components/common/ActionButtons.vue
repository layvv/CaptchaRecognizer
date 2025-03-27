<script setup lang="ts">
import { useCaptchaStore } from '../../stores/captcha';
import { Search, Select, Upload, View } from '@element-plus/icons-vue';
import { browser } from 'wxt/browser';

const captchaStore = useCaptchaStore();

// 立即识别
const handleRecognize = () => {
  // 稍后实现
  console.log('识别验证码');
};

// 手动定位验证码
const handleLocate = () => {
  // 稍后实现
  console.log('定位验证码');
};

// 刷新页面信息
const handleRefresh = () => {
  // 稍后实现
  console.log('刷新页面信息');
};

/**
 * 检测页面中的验证码
 */
async function detectCaptcha() {
  try {
    // 获取当前标签页
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id) return;
    
    // 向内容脚本发送消息
    browser.tabs.sendMessage(tab.id, { action: 'detectCaptcha' });
    
    // 关闭弹出窗口
    window.close();
  } catch (error) {
    console.error('检测验证码失败', error);
  }
}

/**
 * 打开元素选择器
 */
async function selectElement() {
  try {
    // 获取当前标签页
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id) return;
    
    // 向内容脚本发送消息
    browser.tabs.sendMessage(tab.id, { action: 'activateSelector' });
    
    // 关闭弹出窗口
    window.close();
  } catch (error) {
    console.error('激活元素选择器失败', error);
  }
}

/**
 * 上传验证码
 */
async function uploadCaptcha() {
  try {
    // 获取当前标签页
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    
    if (!tab.id) return;
    
    // 向内容脚本发送消息
    browser.tabs.sendMessage(tab.id, { action: 'uploadCaptcha' });
    
    // 关闭弹出窗口
    window.close();
  } catch (error) {
    console.error('上传验证码失败', error);
  }
}

/**
 * 查看验证码库
 */
function viewDatabase() {
  // TODO: 实现验证码库页面
  console.log('查看验证码库');
}
</script>

<template>
  <div class="action-buttons">
    <div class="button-group">
      <el-button 
        type="primary" 
        :icon="Search" 
        class="action-button detect-button"
        @click="detectCaptcha"
      >
        检测验证码
      </el-button>
      
      <el-button 
        type="success" 
        :icon="Select" 
        class="action-button select-button"
        @click="selectElement"
      >
        选择元素
      </el-button>
    </div>
    
    <div class="button-group">
      <el-button 
        type="info" 
        :icon="Upload" 
        class="action-button"
        @click="uploadCaptcha"
      >
        上传验证码
      </el-button>
      
      <el-button 
        type="warning" 
        :icon="View" 
        class="action-button"
        @click="viewDatabase"
      >
        验证码库
      </el-button>
    </div>
  </div>
</template>

<style scoped>
.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.button-group {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-button {
  flex: 1;
  height: 40px;
  border-radius: 8px;
}

.detect-button {
  background-color: var(--el-color-primary);
}

.select-button {
  background-color: var(--el-color-success);
}
</style> 