#!/usr/bin/env python3
"""
验证码数据集生成入口脚本（简化版）
"""

from model.char.data.generator import CaptchaGenerator


def main():
    
    # 初始化生成器
    generator = CaptchaGenerator()
    print(f"🚀 开始生成数据集")
    generator.generate_dataset()
    print("✅ 数据集生成完成！")

if __name__ == '__main__':
    main()