export function getSelector(element) {
    const path = [];
    while (element && element !== document.documentElement) {
        let selector = getElementSelector(element);
        path.unshift(selector);
        element = element.parentElement;
    }
    return path.join(' > ');
}

function getElementSelector(element) {
    // 优先选择ID选择器
    if (element.id && !isDynamicValue(element.id)) {
        const idSelector = `#${CSS.escape(element.id)}`;
        if (isUniqueSelector(idSelector, element)) {
            return idSelector;
        }
    }

    // 处理类名选择器
    const validClasses = Array.from(element.classList)
        .filter(c => !isDynamicClass(c))
        .map(c => `.${CSS.escape(c)}`);

    if (validClasses.length > 0) {
        const classSelector = element.tagName.toLowerCase() + validClasses.join('');
        if (isUniqueSelector(classSelector, element)) {
            return classSelector;
        }
    }

    // 属性选择器处理（核心扩展部分）
    const attributeSelector = getAttributeSelector(element);
    if (attributeSelector) {
        return attributeSelector;
    }

    // 最终降级到位置选择器
    return getPositionSelector(element);
}

// 属性选择器生成逻辑
function getAttributeSelector(element) {
    // 优先考虑的属性列表（可配置）
    const priorityAttributes = [
        'name',
        'type',
        'data-testid',
        'data-qa',
        'role',
        'placeholder',
        'alt',
        'title'
    ];

    // 尝试找到唯一属性组合
    for (const attr of priorityAttributes) {
        const value = element.getAttribute(attr);
        if (value && !isDynamicValue(value)) {
            const selector = `${element.tagName.toLowerCase()}[${attr}="${CSS.escape(value)}"]`;
            if (isUniqueSelector(selector, element)) {
                return selector;
            }
        }
    }

    // 尝试属性组合
    const attrPairs = [];
    for (const attr of priorityAttributes) {
        const value = element.getAttribute(attr);
        if (value && !isDynamicValue(value)) {
            attrPairs.push(`[${attr}="${CSS.escape(value)}"]`);
            if (attrPairs.length >= 2) break; // 最多组合两个属性
        }
    }

    if (attrPairs.length > 0) {
        const comboSelector = element.tagName.toLowerCase() + attrPairs.join('');
        if (isUniqueSelector(comboSelector, element)) {
            return comboSelector;
        }
    }

    return null;
}

// 位置选择器降级方案
function getPositionSelector(element) {
    const tagName = element.tagName.toLowerCase();
    const siblings = Array.from(element.parentElement.children)
        .filter(el => el.tagName === element.tagName);

    if (siblings.length === 1) {
        return tagName;
    }

    const index = siblings.indexOf(element) + 1;
    return `${tagName}:nth-of-type(${index})`;
}

// 唯一性验证
function isUniqueSelector(selector, element) {
    try {
        return element.parentElement.querySelectorAll(selector).length === 1;
    } catch (e) {
        return false; // 处理非法选择器
    }
}

// 动态值检测（可配置规则）
function isDynamicValue(value) {
    return (
        /_\d{3,}/.test(value) ||      // 包含长数字后缀
        /[\-]{2}/.test(value) ||      // 包含连字符
        /[a-f0-9]{32}/i.test(value) || // 类似哈希值
        value.length > 50             // 过长字符串
    );
}

// 动态类名检测
function isDynamicClass(className) {
    return (
        className.startsWith('js-') ||
        /^[A-Z]/g.test(className) ||   // Vue作用域类名
        /_$/.test(className) ||        // BEM修饰符
        isDynamicValue(className)
    );
}