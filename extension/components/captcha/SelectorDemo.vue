<template>
  <div class="selector-demo">
    <div class="control-panel">
      <h2>验证码元素选择器</h2>
      
      <div class="info-message" v-if="!selectorState.selectedElement">
        <div class="message-icon">
          <el-icon size="24"><InfoFilled /></el-icon>
        </div>
        <div class="message-text">
          <p>请将鼠标移动到目标验证码上，然后点击以选择</p>
          <p class="hint">按<kbd>ESC</kbd>键取消选择，<kbd>Enter</kbd>键确认选择</p>
        </div>
      </div>
      
      <div v-if="selectorState.hoveredElement && !selectorState.selectedElement" class="hover-info">
        <h3>悬停元素</h3>
        <div class="info-item">
          <span class="label">元素:</span>
          <span class="value">{{ hoveredElementTag }}</span>
        </div>
      </div>
      
      <div v-if="selectorState.selectedElement" class="element-info">
        <h3>已选择元素</h3>
        
        <div class="info-item">
          <span class="label">元素:</span>
          <span class="value">{{ selectedElementTag }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">选择器:</span>
          <span class="value code">{{ selectorState.selectedElement.selector }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">XPath:</span>
          <span class="value code">{{ selectorState.selectedElement.xpath }}</span>
        </div>
        
        <div class="info-item">
          <span class="label">尺寸:</span>
          <span class="value">
            {{ Math.round(selectorState.selectedElement.boundingRect.width) }}x{{ Math.round(selectorState.selectedElement.boundingRect.height) }}
          </span>
        </div>
        
        <div class="info-item">
          <span class="label">可见性:</span>
          <span class="value" :class="{ 'text-success': selectorState.selectedElement.isVisible, 'text-error': !selectorState.selectedElement.isVisible }">
            {{ selectorState.selectedElement.isVisible ? '可见' : '不可见' }}
          </span>
        </div>
        
        <div class="attributes">
          <h4>属性</h4>
          <div v-for="(value, name) in selectorState.selectedElement.attributes" :key="name" class="attribute-item">
            <span class="attribute-name">{{ name }}:</span>
            <span class="attribute-value">{{ value }}</span>
          </div>
        </div>
      </div>
      
      <div v-if="selectorState.selectedElement" class="feature-score">
        <h3>特征评分</h3>
        
        <div class="score-overview">
          <div class="score-circle" :class="{ passed: scoreResult.passed }">
            <span class="score-value">{{ scoreResult.total }}</span>
            <span class="score-max">/ {{ ruleSet.maxScore }}</span>
          </div>
          
          <div class="score-text">
            <span class="score-label">评分结果:</span>
            <span class="score-status" :class="{ passed: scoreResult.passed }">
              {{ scoreResult.passed ? '通过' : '未通过' }}
            </span>
            <span class="score-percentage">{{ scorePercentage }}%</span>
          </div>
        </div>
        
        <div class="score-details">
          <h4>评分详情</h4>
          <div v-for="(detail, index) in scoreResult.details" :key="index" class="detail-item" :class="{ passed: detail.passed }">
            <div class="detail-header">
              <span class="detail-name">{{ detail.name }}</span>
              <span class="detail-score">{{ detail.score }} / {{ detail.maxScore }}</span>
            </div>
            <div class="detail-description">{{ detail.description }}</div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${(detail.score / detail.maxScore) * 100}%` }"></div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="actions" v-if="selectorState.selectedElement">
        <button class="primary-button" @click="saveCaptchaInfo" :disabled="!scoreResult.passed">
          保存验证码信息
        </button>
        <button class="secondary-button" @click="clearSelection">
          重新选择
        </button>
      </div>
      
      <div class="actions" v-else>
        <button class="secondary-button" @click="cancelSelection">
          取消选择
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useElementSelector } from '../../composables/useElementSelector';
import { useFeatureScore } from '../../composables/useFeatureScore';
import { captchaApi } from '../../api/captcha';
import { CaptchaInfoSetStatus, CaptchaType, FeatureType } from '../../types/captcha/enums';
import { InfoFilled } from '@element-plus/icons-vue';

// 元素选择器
const { state: selectorState, stopSelector } = useElementSelector();

// 特征评分系统
const { 
  ruleSet, 
  scoreResult, 
  scorePercentage, 
  evaluateElement 
} = useFeatureScore();

// 选中元素标签
const selectedElementTag = computed(() => {
  if (!selectorState.selectedElement) return '';
  const element = selectorState.selectedElement.element;
  return `<${element.tagName.toLowerCase()}>` + (element.id ? ` #${element.id}` : '');
});

// 悬停元素标签
const hoveredElementTag = computed(() => {
  if (!selectorState.hoveredElement) return '';
  return `<${selectorState.hoveredElement.tagName.toLowerCase()}>` + (selectorState.hoveredElement.id ? ` #${selectorState.hoveredElement.id}` : '');
});

// 清除选择
function clearSelection() {
  selectorState.selectedElement = null;
}

// 取消选择
function cancelSelection() {
  stopSelector();
  window.parent.postMessage({ action: 'cancelSelection' }, '*');
}

// 保存验证码信息
async function saveCaptchaInfo() {
  if (!selectorState.selectedElement || !scoreResult.passed) return;
  
  try {
    const element = selectorState.selectedElement;
    const url = window.location.href;
    const domain = window.location.hostname;
    
    // 构建验证码信息
    const captchaInfo = {
      websiteUrl: url,
      websiteDomain: domain,
      captchaType: CaptchaType.TEXT,
      captchaSelector: element.selector,
      captchaAttributes: element.attributes,
      captchaDimensions: {
        width: element.boundingRect.width,
        height: element.boundingRect.height
      },
      featureScore: {
        total: scoreResult.total,
        details: {
          attributeScore: scoreResult.details.filter(d => d.type === FeatureType.ATTRIBUTE).reduce((sum, d) => sum + d.score, 0),
          dimensionScore: scoreResult.details.filter(d => d.type === FeatureType.DIMENSION).reduce((sum, d) => sum + d.score, 0),
          contextScore: scoreResult.details.filter(d => d.type === FeatureType.CONTEXT).reduce((sum, d) => sum + d.score, 0),
          keywordScore: scoreResult.details.filter(d => d.type === FeatureType.KEYWORD).reduce((sum, d) => sum + d.score, 0)
        }
      },
      relatedElements: [],
      screenshot: '', // 空字符串而不是null
      createdAt: new Date().toISOString(),
      status: CaptchaInfoSetStatus.PENDING
    };
    
    // 提交信息
    const result = await captchaApi.submitInfoSet(captchaInfo);
    console.log('提交成功:', result);
    
    // 显示成功消息
    alert(`验证码信息已保存! ID: ${result.id}`);
    
    // 清除选择
    clearSelection();
    stopSelector();
    
    // 通知父窗口
    window.parent.postMessage({ action: 'captchaInfoSaved', id: result.id }, '*');
  } catch (error) {
    console.error('提交验证码信息失败:', error);
    alert('提交验证码信息失败!');
  }
}

// 监听元素悬停和选择事件
onMounted(() => {
  // 评估选中元素
  useElementSelector().setEvents({
    onSelect: (info) => {
      evaluateElement(info.element);
    },
    onHover: (element) => {
      // 可以在这里添加悬停时的评分预览
      if (element) {
        // evaluateElement(element);
      }
    }
  });
});
</script>

<style scoped>
.selector-demo {
  font-family: 'Arial', sans-serif;
  color: #2c3e50;
}

.control-panel {
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 20px;
  max-width: 500px;
}

h2 {
  margin-top: 0;
  color: #42b883;
  text-align: center;
  margin-bottom: 15px;
}

h3 {
  margin-top: 20px;
  color: #34495e;
  font-size: 1.2em;
}

h4 {
  margin-top: 15px;
  color: #7f8c8d;
  font-size: 1em;
}

.info-message {
  display: flex;
  align-items: center;
  background-color: #ecf8ff;
  padding: 15px;
  border-radius: 8px;
  margin: 15px 0;
  border-left: 4px solid #409eff;
}

.message-icon {
  color: #409eff;
  margin-right: 15px;
}

.message-text {
  flex: 1;
}

.message-text p {
  margin: 0 0 5px 0;
}

.message-text .hint {
  font-size: 12px;
  color: #606266;
}

kbd {
  background-color: #f2f2f2;
  border: 1px solid #ccc;
  border-radius: 3px;
  padding: 1px 4px;
  font-family: monospace;
}

.hover-info {
  background-color: #f0f9eb;
  padding: 12px;
  border-radius: 8px;
  margin: 15px 0;
  border-left: 4px solid #67c23a;
}

.status-info {
  margin: 15px 0;
  display: flex;
  gap: 15px;
}

.status-item {
  display: flex;
  align-items: center;
}

.label {
  font-weight: bold;
  margin-right: 5px;
}

.value {
  color: #7f8c8d;
}

.value.active {
  color: #42b883;
  font-weight: bold;
}

.controls {
  display: flex;
  gap: 10px;
  margin: 15px 0;
}

button {
  padding: 8px 16px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: background-color 0.3s;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.primary-button {
  background-color: #42b883;
  color: white;
}

.primary-button:hover:not(:disabled) {
  background-color: #3aa876;
}

.secondary-button {
  background-color: #e0e0e0;
  color: #2c3e50;
}

.secondary-button:hover:not(:disabled) {
  background-color: #d0d0d0;
}

.element-info {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.info-item {
  margin-bottom: 10px;
  display: flex;
  align-items: flex-start;
}

.info-item .label {
  min-width: 70px;
}

.code {
  font-family: monospace;
  background-color: #f8f8f8;
  padding: 2px 4px;
  border-radius: 3px;
  word-break: break-all;
}

.text-success {
  color: #42b883;
}

.text-error {
  color: #e74c3c;
}

.attributes {
  margin-top: 15px;
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
  max-height: 150px;
  overflow-y: auto;
}

.attribute-item {
  margin-bottom: 5px;
  font-size: 0.9em;
}

.attribute-name {
  font-weight: bold;
  color: #e74c3c;
}

.attribute-value {
  word-break: break-all;
}

.feature-score {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.score-overview {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.score-circle {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 4px solid #e74c3c;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin-right: 20px;
}

.score-circle.passed {
  border-color: #42b883;
}

.score-value {
  font-size: 1.5em;
  font-weight: bold;
}

.score-max {
  font-size: 0.8em;
  color: #7f8c8d;
}

.score-text {
  display: flex;
  flex-direction: column;
}

.score-label {
  font-weight: bold;
  margin-bottom: 5px;
}

.score-status {
  font-size: 1.2em;
  font-weight: bold;
  color: #e74c3c;
}

.score-status.passed {
  color: #42b883;
}

.score-percentage {
  font-size: 0.9em;
  color: #7f8c8d;
}

.score-details {
  margin-top: 20px;
}

.detail-item {
  background-color: #f8f8f8;
  border-left: 3px solid #e74c3c;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 0 4px 4px 0;
}

.detail-item.passed {
  border-left-color: #42b883;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
}

.detail-name {
  font-weight: bold;
}

.detail-score {
  font-weight: bold;
}

.detail-description {
  font-size: 0.9em;
  color: #7f8c8d;
  margin-bottom: 8px;
}

.progress-bar {
  height: 6px;
  background-color: #ddd;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #42b883;
  transition: width 0.3s;
}

.actions {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style> 