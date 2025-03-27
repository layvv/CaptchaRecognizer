<template>
  <div v-if="visible" class="floating-info" :style="position">
    <div class="info-header">
      <span class="element-tag">{{ elementTag }}</span>
      <span v-if="score !== null" class="score" :class="getScoreClass(score)">{{ score }}</span>
    </div>
    
    <div v-if="dimensions" class="info-row">
      <span class="info-label">尺寸:</span>
      <span class="info-value">{{ dimensions.width }}×{{ dimensions.height }}</span>
    </div>
    
    <div v-if="id" class="info-row">
      <span class="info-label">ID:</span>
      <span class="info-value id-value">{{ id }}</span>
    </div>
    
    <div v-if="className" class="info-row">
      <span class="info-label">类名:</span>
      <span class="info-value class-value">{{ className }}</span>
    </div>
    
    <div class="tip">
      <span class="key-tip"><kbd>点击</kbd>选择此元素</span>
      <span class="key-tip"><kbd>ESC</kbd>取消选择</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineProps, withDefaults } from 'vue';

const props = withDefaults(defineProps<{
  element: HTMLElement | null;
  visible: boolean;
  score?: number | null;
  x?: number;
  y?: number;
}>(), {
  score: null,
  x: 0,
  y: 0
});

// 元素标签
const elementTag = computed(() => {
  if (!props.element) return '';
  return `<${props.element.tagName.toLowerCase()}>`;
});

// 元素ID
const id = computed(() => {
  if (!props.element) return '';
  return props.element.id;
});

// 元素类名
const className = computed(() => {
  if (!props.element) return '';
  return props.element.className;
});

// 元素尺寸
const dimensions = computed(() => {
  if (!props.element) return null;
  const rect = props.element.getBoundingClientRect();
  return {
    width: Math.round(rect.width),
    height: Math.round(rect.height)
  };
});

// 位置样式
const position = computed(() => {
  // 计算相对于视口的位置，避免超出屏幕
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  
  const infoWidth = 220; // 估计宽度
  const infoHeight = 150; // 估计高度
  
  // 默认显示在鼠标右下方
  let left = props.x + 15;
  let top = props.y + 15;
  
  // 如果会超出右边界，显示在左侧
  if (left + infoWidth > viewportWidth) {
    left = props.x - infoWidth - 15;
  }
  
  // 如果会超出下边界，显示在上方
  if (top + infoHeight > viewportHeight) {
    top = props.y - infoHeight - 15;
  }
  
  return {
    left: `${left}px`,
    top: `${top}px`
  };
});

// 获取分数的CSS类
function getScoreClass(score: number) {
  if (score >= 80) return 'score-high';
  if (score >= 50) return 'score-medium';
  return 'score-low';
}
</script>

<style scoped>
.floating-info {
  position: fixed;
  z-index: 2147483647;
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 10px;
  font-family: 'Arial', sans-serif;
  font-size: 12px;
  width: 220px;
  pointer-events: none;
  border: 1px solid #ebeef5;
  backdrop-filter: blur(4px);
  color: #333;
}

.info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 8px;
}

.element-tag {
  font-family: monospace;
  font-weight: bold;
  font-size: 14px;
  color: #409eff;
}

.score {
  font-weight: bold;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
}

.score-high {
  background-color: #f0f9eb;
  color: #67c23a;
}

.score-medium {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.score-low {
  background-color: #fef0f0;
  color: #f56c6c;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 4px;
}

.info-label {
  width: 40px;
  color: #909399;
  margin-right: 8px;
}

.info-value {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.id-value {
  color: #f56c6c;
  font-family: monospace;
}

.class-value {
  color: #409eff;
  font-family: monospace;
}

.tip {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
  font-size: 10px;
  color: #909399;
  display: flex;
  justify-content: space-between;
}

kbd {
  background-color: #f2f2f2;
  border: 1px solid #ddd;
  border-radius: 3px;
  padding: 1px 4px;
  font-family: monospace;
}
</style> 