<script setup lang="ts">
import { ElMessage } from 'element-plus';
import { useSettingsStore } from '@stores/settings';

// 获取设置store
const settingsStore = useSettingsStore();

// 保存设置（在这里实际上不需要做什么，因为pinia会自动保存变更）
const saveSettings = () => {
  ElMessage({
    type: 'success',
    message: '设置已保存'
  });
};

// 重置设置
const resetSettings = () => {
  settingsStore.resetSettings();
  
  ElMessage({
    type: 'info',
    message: '设置已重置为默认值'
  });
};
</script>

<template>
  <div class="settings-page">
    <el-form label-position="top" size="default">
      <!-- 基本设置 -->
      <div class="settings-section">
        <h3 class="section-title">基本设置</h3>
        
        <el-form-item label="主题">
          <el-select v-model="settingsStore.theme" class="full-width">
            <el-option label="浅色" value="light" />
            <el-option label="深色" value="dark" />
            <el-option label="跟随系统" value="auto" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="API 地址">
          <el-input v-model="settingsStore.apiEndpoint" placeholder="服务器地址" />
        </el-form-item>
      </div>
      
      <!-- 验证码识别 -->
      <div class="settings-section">
        <h3 class="section-title">验证码识别</h3>
        
        <el-form-item>
          <el-switch
            v-model="settingsStore.autoRecognize"
            active-text="自动识别验证码"
          />
        </el-form-item>
        
        <el-form-item>
          <el-switch
            v-model="settingsStore.autoFill"
            active-text="自动填充结果"
          />
        </el-form-item>
        
        <el-form-item label="最大重试次数">
          <el-input-number 
            v-model="settingsStore.maxRetries" 
            :min="1" 
            :max="5"
            controls-position="right"
            style="width: 120px"
          />
        </el-form-item>
      </div>
      
      <!-- 通知与日志 -->
      <div class="settings-section">
        <h3 class="section-title">通知与日志</h3>
        
        <el-form-item>
          <el-switch
            v-model="settingsStore.showNotifications"
            active-text="显示桌面通知"
          />
        </el-form-item>
        
        <el-form-item label="日志级别">
          <el-select v-model="settingsStore.logLevel" class="full-width">
            <el-option label="调试" value="debug" />
            <el-option label="信息" value="info" />
            <el-option label="警告" value="warn" />
            <el-option label="错误" value="error" />
          </el-select>
        </el-form-item>
      </div>
      
      <div class="settings-actions">
        <el-button type="primary" @click="saveSettings">保存设置</el-button>
        <el-button @click="resetSettings">重置默认</el-button>
      </div>
    </el-form>
  </div>
</template>

<style scoped>
.settings-page {
  padding: 16px;
}

.settings-section {
  margin-bottom: 24px;
  padding-bottom: 4px;
  border-bottom: 1px solid #ebeef5;
}

.section-title {
  font-size: 16px;
  font-weight: 500;
  margin: 0 0 16px 0;
  color: #409eff;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.full-width {
  width: 100%;
}
</style> 