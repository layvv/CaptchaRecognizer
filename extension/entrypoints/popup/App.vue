<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { AppHeader } from '@components/common';
import { 
  HomePage, 
  SettingsPage, 
  LogsPage,
  ProfilePage
} from '@pages';
import { useUserStore } from '@stores/user';

const userStore = useUserStore();
const activeTab = ref('home');
const showSettings = ref(false);

// 导航选项
const navOptions = [
  {
    value: 'home',
    label: '首页',
    icon: 'House'
  },
  {
    value: 'logs',
    label: '日志',
    icon: 'Document'
  },
  {
    value: 'profile',
    label: '我的',
    icon: 'User'
  }
];

// 加载用户信息
onMounted(async () => {
  try {
    await userStore.loadUserInfo();
  } catch (error) {
    console.error('加载用户信息失败', error);
  }
});

// 打开设置页面
const openSettings = () => {
  showSettings.value = true;
};

// 关闭设置页面
const closeSettings = () => {
  showSettings.value = false;
};
</script>

<template>
  <div class="app-container">
    <AppHeader>
      <template #right>
        <el-button 
          type="primary"
          circle 
          class="settings-button" 
          @click="openSettings"
        >
          <el-icon><setting /></el-icon>
        </el-button>
      </template>
    </AppHeader>
    
    <!-- 主要内容区域 -->
    <main class="main-content">
      <component :is="
        activeTab === 'home' ? HomePage : 
        activeTab === 'logs' ? LogsPage : 
        activeTab === 'profile' ? ProfilePage :
        HomePage
      " />
    </main>
    
    <!-- 导航栏 -->
    <div class="app-nav">
      <el-segmented v-model="activeTab" size="small" :options="navOptions">
        <template #default="{ item }">
          <div class="nav-item">
            <el-icon>
              <component :is="item.icon" />
            </el-icon>
            <span class="nav-text">{{ item.label }}</span>
          </div>
        </template>
      </el-segmented>
    </div>
    
    <!-- 设置对话框 -->
    <el-drawer
      v-model="showSettings"
      title="应用设置"
      direction="rtl"
      size="90%"
      :with-header="true"
      :before-close="closeSettings"
    >
      <SettingsPage />
    </el-drawer>
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background-color: #f5f7fa;
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}

::-webkit-scrollbar-track {
  background: #f5f7fa;
}
</style>

<style scoped>
.app-container {
  width: 360px;
  height: 580px;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  position: relative;
}

.app-nav {
  padding: 12px 16px;
  border-top: 1px solid #ebeef5;
  background-color: #ffffff;
}

.app-nav .el-segmented {
  width: 100%;
  --el-border-radius-base: 16px;
}

/* 导航项自定义样式 */
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
}

.nav-text {
  font-size: 12px;
}

.settings-button {
  font-size: 18px;
}
</style>
