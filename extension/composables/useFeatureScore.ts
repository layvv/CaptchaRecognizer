import { ref, reactive, computed } from 'vue';
import { 
  FeatureScore,
  FeatureDetail,
  FeatureRule,
  FeatureRuleSet,
  AttributeKeywordConfig,
  DimensionRuleConfig
} from '../types/captcha/feature';
import { FeatureType } from '../types/captcha/enums';

/**
 * 检查属性关键词匹配
 * @param element 目标元素
 * @param config 配置
 */
function checkAttributeKeywords(element: Element, config: AttributeKeywordConfig): number {
  if (!element.hasAttribute(config.attribute)) {
    return 0;
  }

  const attrValue = element.getAttribute(config.attribute) || '';
  const valueToCheck = config.caseSensitive ? attrValue : attrValue.toLowerCase();
  
  // 精确匹配
  if (config.exactMatch) {
    for (const keyword of config.keywords) {
      const keywordToCheck = config.caseSensitive ? keyword : keyword.toLowerCase();
      if (valueToCheck === keywordToCheck) {
        return config.weight;
      }
    }
    return 0;
  }
  
  // 部分匹配
  let matchCount = 0;
  for (const keyword of config.keywords) {
    const keywordToCheck = config.caseSensitive ? keyword : keyword.toLowerCase();
    if (valueToCheck.includes(keywordToCheck)) {
      matchCount++;
    }
  }
  
  if (matchCount === 0) {
    return 0;
  }
  
  // 按匹配关键词数量加权计算分数
  return (matchCount / config.keywords.length) * config.weight;
}

/**
 * 检查维度规则
 * @param element 目标元素
 * @param config 配置
 */
function checkDimensions(element: Element, config: DimensionRuleConfig): number {
  const rect = element.getBoundingClientRect();
  let score = 0;
  const maxScore = 100;
  
  // 检查宽度
  if (rect.width >= config.minWidth && rect.width <= config.maxWidth) {
    score += 25;
  } else {
    // 距离目标范围越近得分越高
    const distanceFromRange = Math.min(
      Math.abs(rect.width - config.minWidth),
      Math.abs(rect.width - config.maxWidth)
    );
    const widthRange = config.maxWidth - config.minWidth;
    score += Math.max(0, 25 * (1 - distanceFromRange / widthRange));
  }
  
  // 检查高度
  if (rect.height >= config.minHeight && rect.height <= config.maxHeight) {
    score += 25;
  } else {
    // 距离目标范围越近得分越高
    const distanceFromRange = Math.min(
      Math.abs(rect.height - config.minHeight),
      Math.abs(rect.height - config.maxHeight)
    );
    const heightRange = config.maxHeight - config.minHeight;
    score += Math.max(0, 25 * (1 - distanceFromRange / heightRange));
  }
  
  // 检查宽高比
  if (config.idealRatio && config.ratioTolerance) {
    const ratio = rect.width / rect.height;
    const ratioDiff = Math.abs(ratio - config.idealRatio);
    if (ratioDiff <= config.ratioTolerance) {
      score += 50 * (1 - ratioDiff / config.ratioTolerance);
    }
  } else {
    score += 50; // 如果没有宽高比要求，默认加上剩余分数
  }
  
  return Math.min(score, maxScore);
}

/**
 * 特征评分系统composable
 */
export function useFeatureScore() {
  // 默认规则集
  const defaultRules: FeatureRule[] = [
    {
      type: FeatureType.ATTRIBUTE,
      name: '验证码ID匹配',
      description: '检查元素ID是否包含验证码相关关键词',
      maxScore: 100,
      minScore: 60,
      test: (element) => checkAttributeKeywords(element, {
        attribute: 'id',
        keywords: ['captcha', 'verify', 'verification', '验证码', '验证'],
        weight: 100,
        caseSensitive: false
      })
    },
    {
      type: FeatureType.ATTRIBUTE,
      name: '验证码类名匹配',
      description: '检查元素class是否包含验证码相关关键词',
      maxScore: 100,
      minScore: 60,
      test: (element) => checkAttributeKeywords(element, {
        attribute: 'class',
        keywords: ['captcha', 'verify', 'verification', '验证码', '验证'],
        weight: 100,
        caseSensitive: false
      })
    },
    {
      type: FeatureType.DIMENSION,
      name: '验证码图片尺寸',
      description: '检查元素尺寸是否符合典型验证码大小',
      maxScore: 100,
      minScore: 70,
      test: (element) => checkDimensions(element, {
        minWidth: 100,
        maxWidth: 400,
        minHeight: 30,
        maxHeight: 200,
        idealRatio: 3,
        ratioTolerance: 1.5
      })
    }
  ];
  
  // 默认规则集
  const defaultRuleSet: FeatureRuleSet = {
    name: '默认验证码规则集',
    description: '通用验证码特征评分规则',
    rules: defaultRules,
    requiredScore: 70,
    maxScore: 300
  };
  
  // 规则集
  const ruleSet = ref<FeatureRuleSet>(defaultRuleSet);
  
  // 评分结果
  const scoreResult = reactive<FeatureScore>({
    total: 0,
    details: [],
    passed: false
  });
  
  // 是否通过评分
  const isPassed = computed(() => scoreResult.passed);
  
  // 分数百分比
  const scorePercentage = computed(() => 
    ruleSet.value.maxScore > 0 
      ? Math.round((scoreResult.total / ruleSet.value.maxScore) * 100) 
      : 0
  );
  
  /**
   * 评估元素
   * @param element 目标元素
   * @param context 上下文信息
   */
  function evaluateElement(element: Element, context?: any): FeatureScore {
    const details: FeatureDetail[] = [];
    let totalScore = 0;
    
    // 应用每条规则
    for (const rule of ruleSet.value.rules) {
      const score = rule.test(element, context);
      const passed = score >= rule.minScore;
      
      details.push({
        type: rule.type,
        name: rule.name,
        score,
        maxScore: rule.maxScore,
        description: rule.description,
        passed
      });
      
      totalScore += score;
    }
    
    // 更新评分结果
    scoreResult.total = totalScore;
    scoreResult.details = details;
    scoreResult.passed = totalScore >= ruleSet.value.requiredScore;
    
    return scoreResult;
  }
  
  /**
   * 设置规则集
   * @param newRuleSet 新规则集
   */
  function setRuleSet(newRuleSet: FeatureRuleSet) {
    ruleSet.value = newRuleSet;
  }
  
  /**
   * 添加规则
   * @param rule 新规则
   */
  function addRule(rule: FeatureRule) {
    ruleSet.value.rules.push(rule);
    ruleSet.value.maxScore += rule.maxScore;
  }
  
  /**
   * 移除规则
   * @param index 规则索引
   */
  function removeRule(index: number) {
    if (index >= 0 && index < ruleSet.value.rules.length) {
      const rule = ruleSet.value.rules[index];
      ruleSet.value.maxScore -= rule.maxScore;
      ruleSet.value.rules.splice(index, 1);
    }
  }
  
  /**
   * 创建属性关键词规则
   */
  function createAttributeRule(
    name: string, 
    description: string,
    config: AttributeKeywordConfig, 
    maxScore = 100, 
    minScore = 60
  ): FeatureRule {
    return {
      type: FeatureType.ATTRIBUTE,
      name,
      description,
      maxScore,
      minScore,
      test: (element) => checkAttributeKeywords(element, config)
    };
  }
  
  /**
   * 创建维度规则
   */
  function createDimensionRule(
    name: string,
    description: string,
    config: DimensionRuleConfig,
    maxScore = 100,
    minScore = 60
  ): FeatureRule {
    return {
      type: FeatureType.DIMENSION,
      name,
      description,
      maxScore,
      minScore,
      test: (element) => checkDimensions(element, config)
    };
  }
  
  /**
   * 重置评分结果
   */
  function resetScore() {
    scoreResult.total = 0;
    scoreResult.details = [];
    scoreResult.passed = false;
  }
  
  /**
   * 重置规则集为默认值
   */
  function resetRuleSet() {
    ruleSet.value = defaultRuleSet;
  }
  
  return {
    ruleSet,
    scoreResult,
    isPassed,
    scorePercentage,
    evaluateElement,
    setRuleSet,
    addRule,
    removeRule,
    createAttributeRule,
    createDimensionRule,
    resetScore,
    resetRuleSet
  };
} 