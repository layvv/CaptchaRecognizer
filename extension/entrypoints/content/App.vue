<template>
  <div class="captcha-recognizer-app">
    <!-- 验证码选择器面板 -->
    <CaptchaSelector
      v-if="state.isSelecting"
      :elementInfo="elementInfo"
      :matchResult="matchResult"
      :selected="state.isElementSelected"
      @cancel="appState.stopSelecting"
      @reselect="appState.reselectElement"
      @select="handleSelect"
    />
    
    <!-- 高亮覆盖层 -->
    <HighlightOverlay
      :visible="showHighlight"
      :rect="highlightRect"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, onBeforeUnmount } from 'vue';
import { loggerService } from '@/services/logger';
import { CaptchaType } from '@/types';
import CaptchaSelector from './CaptchaSelector.vue';
import HighlightOverlay from './HighlightOverlay.vue';
import { setupContentScriptState } from './state';

// 注入状态管理
const appState = inject('appState') as ReturnType<typeof setupContentScriptState>;
const { state, elementInfo, matchResult } = appState;

// 计算高亮矩形区域
const highlightRect = computed(() => {
  if (state.selectedElement) {
    return state.selectedElement.getBoundingClientRect();
  }
  
  if (state.hoveredElement) {
    return state.hoveredElement.getBoundingClientRect();
  }
  
  return null;
});

// 计算是否显示高亮
const showHighlight = computed(() => {
  return state.isSelecting && (state.hoveredElement !== null || state.selectedElement !== null);
});

// 处理选择
const handleSelect = (type: CaptchaType) => {
  appState.handleSelect(type);
};
</script>

<style>
/* 基础样式 */
.captcha-recognizer-app {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #333;
  line-height: 1.5;
}
</style>