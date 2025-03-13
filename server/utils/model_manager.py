import asyncio
from typing import Dict, Any, Optional, List
import numpy as np
from PIL import Image
import io
import os
import torch
from datetime import datetime

from server.utils.logger import get_logger

class ModelManager:
    """模型管理器，负责管理和调用各类验证码识别模型"""
    
    def __init__(self):
        self.logger = get_logger("model-manager")
        self.models = {}
        self.model_locks = {}
        self.model_configs = {
            "character": {
                "path": "model/char/checkpoints/best.pth",
                "config": "model/char/config.py",
                "load_function": self._load_character_model
            }
        }
    
    async def get_model(self, model_type: str):
        """获取或加载模型"""
        if model_type not in self.models:
            # 创建锁，避免并发加载
            if model_type not in self.model_locks:
                self.model_locks[model_type] = asyncio.Lock()
            
            # 获取锁
            async with self.model_locks[model_type]:
                # 再次检查，可能在等待锁的过程中已经加载了
                if model_type not in self.models:
                    self.logger.info(f"加载模型: {model_type}")
                    
                    # 获取模型配置
                    config = self.model_configs.get(model_type)
                    if not config:
                        raise ValueError(f"不支持的模型类型: {model_type}")
                    
                    # 加载模型
                    load_function = config["load_function"]
                    model = await load_function(config)
                    
                    # 缓存模型
                    self.models[model_type] = {
                        "model": model,
                        "config": config,
                        "loaded_time": datetime.now().isoformat(),
                        "inference_count": 0
                    }
        
        # 更新使用计数
        self.models[model_type]["inference_count"] += 1
        
        return self.models[model_type]["model"]
    
    async def _load_character_model(self, config: Dict[str, Any]):
        """加载字符验证码模型"""
        try:
            # 导入模型相关模块
            from model.char.predict import CaptchaPredictor
            
            # 检查模型文件是否存在
            model_path = config["path"]
            if not os.path.exists(model_path):
                self.logger.error(f"模型文件不存在: {model_path}")
                raise FileNotFoundError(f"模型文件不存在: {model_path}")
            
            # 异步加载模型（使用线程池执行IO操作）
            loop = asyncio.get_event_loop()
            predictor = await loop.run_in_executor(None, lambda: CaptchaPredictor(model_path))
            
            # 初始化图像处理
            predictor._init_image_processing()
            
            self.logger.info(f"字符验证码模型加载成功: {model_path}")
            return predictor
        except Exception as e:
            self.logger.error(f"加载字符验证码模型失败: {str(e)}", exc_info=True)
            raise
    
    async def recognize_character_captcha(self, image: Image.Image) -> Dict[str, Any]:
        """识别字符验证码"""
        try:
            # 获取模型
            model = await self.get_model("character")
            
            # 将图像转换为字节流
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='PNG')
            img_bytes = img_byte_arr.getvalue()
            
            # 使用线程池执行预测（避免阻塞事件循环）
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(None, lambda: model.predict(img_bytes))
            
            # 简单的可信度模拟
            confidence = 0.9  # 实际模型应该有自己的置信度估计
            
            return {
                "text": result,
                "confidence": confidence
            }
        except Exception as e:
            self.logger.error(f"字符验证码识别失败: {str(e)}", exc_info=True)
            raise RuntimeError(f"字符验证码识别失败: {str(e)}")
    
    def cleanup(self):
        """清理资源"""
        for model_type, model_info in self.models.items():
            try:
                model = model_info["model"]
                # 释放GPU内存
                if hasattr(model, "model") and hasattr(model.model, "to"):
                    model.model.to("cpu")
                self.logger.info(f"清理模型资源: {model_type}")
            except Exception as e:
                self.logger.error(f"清理模型资源失败: {model_type}, {str(e)}") 