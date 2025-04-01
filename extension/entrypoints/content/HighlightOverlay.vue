<template>
  <div 
    v-if="visible" 
    class="captcha-recognizer-highlight" 
    :style="positionStyle"
  >
    <div class="captcha-recognizer-highlight-inner"></div>
    <!-- 四个角的装饰 -->
    <div class="captcha-recognizer-highlight-corner top-left"></div>
    <div class="captcha-recognizer-highlight-corner top-right"></div>
    <div class="captcha-recognizer-highlight-corner bottom-left"></div>
    <div class="captcha-recognizer-highlight-corner bottom-right"></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  visible: boolean;
  rect?: DOMRect | null;
}

const props = defineProps<Props>();

// 计算高亮层的位置样式
const positionStyle = computed(() => {
  if (!props.rect) {
    return { display: 'none' };
  }
  
  return {
    display: 'block',
    left: `${window.scrollX + props.rect.left}px`,
    top: `${window.scrollY + props.rect.top}px`,
    width: `${props.rect.width}px`,
    height: `${props.rect.height}px`
  };
});
</script>

<style>
.captcha-recognizer-highlight {
  position: absolute;
  pointer-events: none;
  border: 2px solid #4285f4;
  border-radius: 3px;
  z-index: 999998;
  box-shadow: 0 0 12px rgba(66, 133, 244, 0.5);
  transition: all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1);
  will-change: left, top, width, height; /* 优化性能 */
}

.captcha-recognizer-highlight-inner {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 3px;
  background: repeating-linear-gradient(
    45deg,
    rgba(66, 133, 244, 0.05),
    rgba(66, 133, 244, 0.05) 10px,
    rgba(66, 133, 244, 0.08) 10px,
    rgba(66, 133, 244, 0.08) 20px
  );
  animation: pulse 1.5s infinite ease-in-out;
}

@keyframes pulse {
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 0.6;
  }
}

.captcha-recognizer-highlight-corner {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 1px;
  background-color: #4285f4;
  transition: all 0.3s ease;
}

/* 角落位置 */
.top-left {
  top: -4px;
  left: -4px;
}

.top-right {
  top: -4px;
  right: -4px;
}

.bottom-left {
  bottom: -4px;
  left: -4px;
}

.bottom-right {
  bottom: -4px;
  right: -4px;
}
</style> 