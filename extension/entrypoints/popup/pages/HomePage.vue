<script setup lang="ts">
import { ref } from 'vue';
import { StatusCard, ActionButtons } from '../../../components/common';
import { RecognitionResult } from '../../../components/captcha';
import { useCaptchaStore } from '../../../stores/captcha';

const captchaStore = useCaptchaStore();

// 模拟网站历史记录
const recentSites = ref([
  { domain: 'example.com', url: 'https://example.com/login', date: '2023-3-27' },
  { domain: 'test.site.cn', url: 'https://test.site.cn/register', date: '2023-3-26' },
  { domain: 'demo.app', url: 'https://demo.app/auth', date: '2023-3-25' }
]);

// 模拟使用统计数据
const statistics = ref({
  todayCount: 12,
  totalCount: 245,
  successRate: 92.5
});
</script>

<template>
  <div class="home-page">
    <!-- 状态卡片 -->
    <StatusCard />
    
    <!-- 操作按钮 -->
    <ActionButtons />
    
    <!-- 识别结果 -->
    <RecognitionResult v-if="captchaStore.recognitionResult" />
    
    <!-- 当前网站信息 -->
    <div class="website-info" v-if="captchaStore.currentInfoSet">
      <div class="info-header">
        <h3 class="title">当前网站</h3>
      </div>
      <div class="info-content">
        <div class="info-item">
          <div class="label">网站:</div>
          <div class="value url-value">
            {{ captchaStore.currentInfoSet.websiteDomain }}
          </div>
        </div>
        
        <div class="info-item">
          <div class="label">选择器:</div>
          <div class="value code-value">
            {{ captchaStore.currentInfoSet.captchaSelector }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- 使用统计 -->
    <div class="stats-section">
      <div class="info-header">
        <h3 class="title">使用统计</h3>
      </div>
      
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-value">{{ statistics.todayCount }}</div>
          <div class="stat-label">今日使用</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ statistics.totalCount }}</div>
          <div class="stat-label">总使用次数</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-value">{{ statistics.successRate }}%</div>
          <div class="stat-label">识别成功率</div>
        </div>
      </div>
    </div>
    
    <!-- 最近访问网站 -->
    <div class="recent-sites">
      <div class="info-header">
        <h3 class="title">最近访问</h3>
      </div>
      
      <div class="sites-list">
        <div v-for="(site, index) in recentSites" :key="index" class="site-item">
          <el-icon><link /></el-icon>
          <div class="site-info">
            <div class="site-domain">{{ site.domain }}</div>
            <div class="site-date">{{ site.date }}</div>
          </div>
          <el-button size="small" type="primary" text>
            <el-icon><position /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  padding: 16px;
}

.website-info,
.stats-section,
.recent-sites {
  background-color: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
  margin-top: 16px;
}

.info-header {
  margin-bottom: 12px;
}

.title {
  font-size: 14px;
  margin: 0;
  font-weight: 500;
  color: #303133;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: flex-start;
}

.label {
  width: 60px;
  font-size: 13px;
  color: #909399;
}

.value {
  flex: 1;
  font-size: 13px;
  word-break: break-all;
}

.url-value {
  color: #409eff;
}

.code-value {
  font-family: monospace;
  background-color: #ecf5ff;
  padding: 2px 4px;
  border-radius: 3px;
  color: #409eff;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.stat-card {
  background-color: #fff;
  border-radius: 6px;
  padding: 12px 8px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: var(--el-color-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.sites-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.site-item {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #fff;
  border-radius: 6px;
  padding: 10px 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.site-item .el-icon {
  color: #909399;
}

.site-info {
  flex: 1;
  min-width: 0;
}

.site-domain {
  font-size: 14px;
  margin-bottom: 2px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-date {
  font-size: 12px;
  color: #909399;
}
</style> 