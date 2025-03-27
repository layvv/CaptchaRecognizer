<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const user = computed(() => userStore.currentUser);
const isLoggedIn = computed(() => userStore.isLoggedIn);

// 设置选项
const settings = ref({
  autoRecognize: true,
  autoFill: true,
  showNotifications: true,
  theme: 'light',
  apiEndpoint: 'http://localhost:8000',
  maxRetries: 3,
  logLevel: 'info'
});

// 保存设置
const saveSettings = () => {
  // 稍后实现设置保存逻辑
  console.log('保存设置', settings.value);
};

// 重置设置
const resetSettings = () => {
  settings.value = {
    autoRecognize: true,
    autoFill: true,
    showNotifications: true,
    theme: 'light',
    apiEndpoint: 'http://localhost:8000',
    maxRetries: 3,
    logLevel: 'info'
  };
};

// 登出
const handleLogout = () => {
  userStore.logout();
};
</script>

<template>
  <div class="settings-page">
    <!-- 用户信息区域 -->
    <div class="user-section">
      <div v-if="isLoggedIn" class="profile-info">
        <div class="profile-header">
          <el-avatar :size="54" class="profile-avatar">
            {{ user?.username.charAt(0).toUpperCase() }}
          </el-avatar>
          <div class="profile-detail">
            <h3 class="username">{{ user?.username }}</h3>
            <p class="email">{{ user?.email }}</p>
            
            <div class="profile-actions">
              <el-button size="small" type="primary" @click="saveSettings">
                <el-icon><refresh /></el-icon>
                刷新信息
              </el-button>
              <el-button size="small" type="danger" @click="handleLogout">
                <el-icon><switch-button /></el-icon>
                退出登录
              </el-button>
            </div>
          </div>
        </div>
      </div>
      
      <div v-else class="login-prompt">
        <el-empty description="未登录" :image-size="60">
          <template #description>
            <p>登录账号以使用更多功能</p>
          </template>
          
          <el-button type="primary" size="small">登录</el-button>
          <el-button size="small">注册</el-button>
        </el-empty>
      </div>
    </div>
    
    <h2 class="section-title">应用设置</h2>
    
    <el-form :model="settings" label-position="top">
      <div class="settings-section">
        <h3 class="section-title">基本设置</h3>
        
        <el-form-item label="主题">
          <el-select v-model="settings.theme" class="full-width">
            <el-option label="浅色" value="light" />
            <el-option label="深色" value="dark" />
            <el-option label="跟随系统" value="auto" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="API 地址">
          <el-input v-model="settings.apiEndpoint" placeholder="服务器地址" />
        </el-form-item>
      </div>
      
      <div class="settings-section">
        <h3 class="section-title">验证码识别</h3>
        
        <el-form-item>
          <el-switch
            v-model="settings.autoRecognize"
            active-text="自动识别验证码"
          />
        </el-form-item>
        
        <el-form-item>
          <el-switch
            v-model="settings.autoFill"
            active-text="自动填充结果"
          />
        </el-form-item>
        
        <el-form-item label="最大重试次数">
          <el-input-number 
            v-model="settings.maxRetries" 
            :min="1" 
            :max="5"
            controls-position="right"
          />
        </el-form-item>
      </div>
      
      <div class="settings-section">
        <h3 class="section-title">通知与日志</h3>
        
        <el-form-item>
          <el-switch
            v-model="settings.showNotifications"
            active-text="显示桌面通知"
          />
        </el-form-item>
        
        <el-form-item label="日志级别">
          <el-select v-model="settings.logLevel" class="full-width">
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

.user-section {
  margin-bottom: 24px;
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.profile-header {
  display: flex;
  gap: 16px;
}

.profile-avatar {
  background-color: var(--el-color-primary);
  color: #fff;
  font-weight: bold;
}

.profile-detail {
  flex: 1;
}

.username {
  font-size: 18px;
  margin: 0 0 4px 0;
  color: #303133;
}

.email {
  font-size: 14px;
  margin: 0 0 12px 0;
  color: #909399;
}

.profile-actions {
  display: flex;
  gap: 8px;
}

.section-title {
  font-size: 18px;
  margin: 16px 0;
  color: #303133;
}

.settings-section {
  margin-bottom: 24px;
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 16px;
}

.settings-section .section-title {
  font-size: 14px;
  margin: 0 0 16px 0;
  color: #409eff;
}

.settings-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.full-width {
  width: 100%;
}

.login-prompt {
  padding: 16px 0;
}
</style> 