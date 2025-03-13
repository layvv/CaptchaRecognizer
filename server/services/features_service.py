import json
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

from server.database.redis_client import redis_client
from server.utils.logger import get_logger

class FeaturesService:
    """验证码特征管理服务"""
    
    def __init__(self):
        self.logger = get_logger("features-service")
        self.feature_types = ["character", "slide", "click"]
    
    async def get_features(self, feature_type: Optional[str] = None) -> Dict[str, Any]:
        """获取特征库"""
        try:
            results = {}
            
            # 如果指定了类型，只返回该类型的特征
            if feature_type:
                if feature_type not in self.feature_types:
                    raise ValueError(f"不支持的特征类型: {feature_type}")
                
                feature_json = await redis_client.get(f"features:{feature_type}")
                if feature_json:
                    results[feature_type] = json.loads(feature_json)
                else:
                    results[feature_type] = self._get_default_features(feature_type)
            else:
                # 返回所有类型的特征
                for ft in self.feature_types:
                    feature_json = await redis_client.get(f"features:{ft}")
                    if feature_json:
                        results[ft] = json.loads(feature_json)
                    else:
                        results[ft] = self._get_default_features(ft)
            
            return results
        except Exception as e:
            self.logger.error(f"获取特征库失败: {str(e)}")
            raise
    
    async def update_features(self, features: Dict[str, Any], user_id: str) -> bool:
        """更新特征库"""
        try:
            # 验证数据结构
            for feature_type, feature_data in features.items():
                if feature_type not in self.feature_types:
                    raise ValueError(f"不支持的特征类型: {feature_type}")
                
                # 添加元数据
                feature_data["updatedAt"] = datetime.now().isoformat()
                feature_data["updatedBy"] = user_id
                
                # 保存到Redis
                await redis_client.set(f"features:{feature_type}", json.dumps(feature_data))
                
                # 记录更新历史
                history = {
                    "userId": user_id,
                    "timestamp": datetime.now().isoformat(),
                    "action": "update"
                }
                await redis_client.lpush(f"features:history:{feature_type}", json.dumps(history))
                await redis_client.ltrim(f"features:history:{feature_type}", 0, 99)  # 保留最近100条记录
            
            return True
        except Exception as e:
            self.logger.error(f"更新特征库失败: {str(e)}")
            raise
    
    async def suggest_feature(self, feature: Dict[str, Any]) -> str:
        """提交特征建议"""
        try:
            suggestion_id = str(uuid.uuid4())
            
            # 添加元数据
            feature["id"] = suggestion_id
            feature["timestamp"] = datetime.now().isoformat()
            feature["status"] = "pending"
            
            # 保存到Redis
            await redis_client.set(f"features:suggestion:{suggestion_id}", json.dumps(feature))
            
            # 添加到建议列表
            await redis_client.lpush("features:suggestions", suggestion_id)
            await redis_client.ltrim("features:suggestions", 0, 999)  # 保留最近1000条建议
            
            return suggestion_id
        except Exception as e:
            self.logger.error(f"提交特征建议失败: {str(e)}")
            raise
    
    def _get_default_features(self, feature_type: str) -> Dict[str, Any]:
        """获取默认的特征配置"""
        if feature_type == "character":
            return {
                "imgAttributes": [
                    {"key": "id", "patterns": ["captcha", "validate", "verifycode", "verification"]},
                    {"key": "class", "patterns": ["captcha", "validate", "verifycode", "verification"]},
                    {"key": "name", "patterns": ["captcha", "validate", "verifycode", "verification"]},
                    {"key": "alt", "patterns": ["captcha", "validate", "verifycode", "verification"]},
                    {"key": "src", "patterns": ["captcha", "validate", "verifycode", "verification", "code"]}
                ],
                "imgProperties": {
                    "maxWidth": 200,
                    "maxHeight": 100,
                    "minWidth": 30,
                    "minHeight": 15
                },
                "contextAttributes": [
                    {"element": "form", "key": "id", "patterns": ["login", "register", "form"]},
                    {"element": "input", "key": "placeholder", "patterns": ["verification", "code", "captcha"]}
                ],
                "priorities": [
                    {"strategy": "form", "weight": 5},
                    {"strategy": "nearInput", "weight": 4},
                    {"strategy": "attributes", "weight": 3},
                    {"strategy": "size", "weight": 2}
                ]
            }
        elif feature_type == "slide":
            return {
                "containerAttributes": [
                    {"key": "class", "patterns": ["slider", "drag", "verify"]}
                ],
                "priorities": []
            }
        elif feature_type == "click":
            return {
                "containerAttributes": [
                    {"key": "class", "patterns": ["click-captcha", "click-verify"]}
                ],
                "priorities": []
            }
        else:
            return {} 