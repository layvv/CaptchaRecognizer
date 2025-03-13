import uuid
import base64
import time
import io
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
import numpy as np
from PIL import Image

from server.models.captcha import CaptchaRecognitionResult
from server.database.redis_client import redis_client
from server.utils.logger import get_logger
from server.utils.model_manager import ModelManager
from server.services.locator_service import LocatorService

class CaptchaService:
    def __init__(self):
        self.logger = get_logger("captcha-service")
        self.model_manager = ModelManager()
        self.locator_service = LocatorService()
    
    async def recognize(self, image_data: str, captcha_type: str = "character") -> CaptchaRecognitionResult:
        """识别验证码图像"""
        try:
            # 解析Base64图像
            if image_data.startswith("data:image"):
                # 处理data URL
                image_data = image_data.split(",", 1)[1]
            
            # 解码图像
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
            
            # 根据验证码类型调用相应的模型
            if captcha_type == "character":
                # 字符验证码识别
                result = await self.model_manager.recognize_character_captcha(image)
                return CaptchaRecognitionResult(
                    text=result["text"],
                    confidence=result["confidence"]
                )
            else:
                raise ValueError(f"不支持的验证码类型: {captcha_type}")
        
        except Exception as e:
            self.logger.error(f"验证码识别失败: {str(e)}", exc_info=True)
            raise
    
    async def log_captcha_request(self, user_id: str, image_data: str, captcha_type: str) -> str:
        """记录验证码识别请求"""
        captcha_id = str(uuid.uuid4())
        
        # 保存验证码请求信息
        captcha_record = {
            "id": captcha_id,
            "userId": user_id,
            "type": captcha_type,
            "timestamp": datetime.now().isoformat(),
            "status": "pending"
        }
        
        # 保存基本信息到Redis
        await redis_client.set(f"captcha:request:{captcha_id}", json.dumps(captcha_record))
        
        # 保存图像数据到单独的键（避免冗余存储）
        await redis_client.set(f"captcha:image:{captcha_id}", image_data)
        
        # 设置过期时间（7天）
        await redis_client.expire(f"captcha:request:{captcha_id}", 60 * 60 * 24 * 7)
        await redis_client.expire(f"captcha:image:{captcha_id}", 60 * 60 * 24 * 7)
        
        return captcha_id
    
    async def log_captcha_result(self, captcha_id: str, success: bool, error_info: Optional[str] = None) -> None:
        """记录验证码识别结果"""
        # 获取请求记录
        captcha_record_json = await redis_client.get(f"captcha:request:{captcha_id}")
        if not captcha_record_json:
            raise ValueError(f"验证码请求不存在: {captcha_id}")
        
        captcha_record = json.loads(captcha_record_json)
        
        # 更新状态
        captcha_record["status"] = "success" if success else "failed"
        captcha_record["completed"] = datetime.now().isoformat()
        
        if error_info:
            captcha_record["errorInfo"] = error_info
        
        # 保存更新后的记录
        await redis_client.set(f"captcha:request:{captcha_id}", json.dumps(captcha_record))
    
    async def resolve_from_locator(self, locator: Dict[str, Any]) -> CaptchaRecognitionResult:
        """从定位器解析验证码"""
        # 验证定位器
        if not locator.get("captcha") or not locator.get("captcha", {}).get("imgBase64"):
            raise ValueError("定位器缺少验证码图像数据")
        
        captcha_type = locator.get("type", "character")
        image_data = locator["captcha"]["imgBase64"]
        
        # 识别验证码
        return await self.recognize(image_data, captcha_type)
    
    async def update_locator_stats(self, locator: Dict[str, Any], success: bool, result: Optional[str] = None, error: Optional[str] = None) -> None:
        """更新定位器统计信息"""
        try:
            # 获取定位器
            domain = locator.get("domain")
            if not domain:
                return
            
            stored_locator = await self.locator_service.get_locator(domain)
            if not stored_locator:
                # 如果不存在，创建新定位器
                stored_locator = locator.copy()
                stored_locator.setdefault("tryCount", 0)
                stored_locator.setdefault("successCount", 0)
                stored_locator.setdefault("errorCount", 0)
            
            # 更新统计
            stored_locator["tryCount"] = stored_locator.get("tryCount", 0) + 1
            stored_locator["lastResolveTime"] = datetime.now().isoformat()
            
            if success:
                stored_locator["successCount"] = stored_locator.get("successCount", 0) + 1
                stored_locator["lastResult"] = result
            else:
                stored_locator["errorCount"] = stored_locator.get("errorCount", 0) + 1
                stored_locator.setdefault("errors", [])
                
                # 限制错误历史数量
                errors = stored_locator["errors"]
                errors.append({
                    "timestamp": datetime.now().isoformat(),
                    "error": error
                })
                
                # 最多保留10条错误记录
                if len(errors) > 10:
                    stored_locator["errors"] = errors[-10:]
            
            # 保存更新后的定位器
            await self.locator_service.save_locator(stored_locator)
        
        except Exception as e:
            self.logger.error(f"更新定位器统计失败: {str(e)}", exc_info=True)
    
    async def save_problem_captcha(
        self,
        image_data: str,
        domain: str,
        captcha_type: str,
        expected_text: Optional[str],
        actual_text: Optional[str],
        url: Optional[str],
        user_id: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """保存问题验证码"""
        problem_id = str(uuid.uuid4())
        
        problem_record = {
            "id": problem_id,
            "domain": domain,
            "type": captcha_type,
            "expectedText": expected_text,
            "actualText": actual_text,
            "url": url,
            "userId": user_id,
            "timestamp": datetime.now().isoformat(),
            "status": "pending",
            "context": context or {}
        }
        
        # 保存基本信息
        await redis_client.set(f"captcha:problem:{problem_id}", json.dumps(problem_record))
        
        # 保存图像数据
        await redis_client.set(f"captcha:problem:image:{problem_id}", image_data)
        
        # 设置过期时间（30天）
        await redis_client.expire(f"captcha:problem:{problem_id}", 60 * 60 * 24 * 30)
        await redis_client.expire(f"captcha:problem:image:{problem_id}", 60 * 60 * 24 * 30)
        
        # 添加到问题列表
        await redis_client.lpush("captcha:problem:list", problem_id)
        await redis_client.ltrim("captcha:problem:list", 0, 999)  # 最多保留1000个问题
        
        return problem_id 