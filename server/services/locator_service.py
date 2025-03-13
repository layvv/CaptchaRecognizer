import json
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime

from server.database.redis_client import redis_client
from server.utils.logger import get_logger

class LocatorService:
    """验证码定位器服务"""
    
    def __init__(self):
        self.logger = get_logger("locator-service")
    
    async def get_locator(self, domain: str) -> Optional[Dict[str, Any]]:
        """获取指定域名的验证码定位器"""
        try:
            # 从Redis获取定位器
            locator_json = await redis_client.get(f"locator:{domain}")
            if not locator_json:
                return None
            
            # 解析JSON
            locator = json.loads(locator_json)
            
            # 增加使用计数
            await redis_client.hincrby(f"locator:stats:{domain}", "usageCount", 1)
            
            return locator
        except Exception as e:
            self.logger.error(f"获取定位器失败: {domain}, {str(e)}")
            return None
    
    async def save_locator(self, locator: Dict[str, Any]) -> str:
        """保存验证码定位器"""
        try:
            domain = locator.get("domain")
            if not domain:
                raise ValueError("定位器缺少domain字段")
            
            # 生成或使用已有的ID
            locator_id = locator.get("id", str(uuid.uuid4()))
            locator["id"] = locator_id
            
            # 设置更新时间
            locator["updatedAt"] = datetime.now().isoformat()
            
            # 保存到Redis
            await redis_client.set(f"locator:{domain}", json.dumps(locator))
            
            # 更新统计信息
            await redis_client.hset(
                f"locator:stats:{domain}",
                mapping={
                    "lastUpdated": datetime.now().isoformat(),
                    "id": locator_id
                }
            )
            
            # 添加到域名列表
            await redis_client.sadd("locator:domains", domain)
            
            return locator_id
        except Exception as e:
            self.logger.error(f"保存定位器失败: {str(e)}")
            raise
    
    async def get_popular_locators(self, limit: int = 10) -> List[Dict[str, Any]]:
        """获取热门网站的定位器"""
        try:
            # 获取所有域名
            domains = await redis_client.smembers("locator:domains")
            
            # 获取每个域名的使用计数
            domain_stats = []
            for domain in domains:
                stats = await redis_client.hgetall(f"locator:stats:{domain}")
                if stats:
                    domain_stats.append({
                        "domain": domain,
                        "usageCount": int(stats.get("usageCount", 0)),
                        "successCount": int(stats.get("successCount", 0)),
                        "lastUpdated": stats.get("lastUpdated")
                    })
            
            # 按使用次数排序
            domain_stats.sort(key=lambda x: x["usageCount"], reverse=True)
            
            # 获取前N个热门域名的定位器
            popular_locators = []
            for stat in domain_stats[:limit]:
                locator = await self.get_locator(stat["domain"])
                if locator:
                    # 添加统计信息
                    locator["stats"] = {
                        "usageCount": stat["usageCount"],
                        "successCount": stat["successCount"],
                        "lastUpdated": stat["lastUpdated"]
                    }
                    popular_locators.append(locator)
            
            return popular_locators
        except Exception as e:
            self.logger.error(f"获取热门定位器失败: {str(e)}")
            raise
    
    async def verify_locator(self, locator_id: str, success: bool, user_id: str) -> bool:
        """验证定位器的有效性"""
        try:
            # 查找定位器
            domain = None
            async for key in redis_client.scan_iter(match="locator:*"):
                locator_json = await redis_client.get(key)
                if locator_json:
                    locator_data = json.loads(locator_json)
                    if locator_data.get("id") == locator_id:
                        domain = locator_data.get("domain")
                        break
            
            if not domain:
                self.logger.error(f"无法找到定位器: {locator_id}")
                return False
            
            # 更新统计
            if success:
                await redis_client.hincrby(f"locator:stats:{domain}", "successCount", 1)
            else:
                await redis_client.hincrby(f"locator:stats:{domain}", "errorCount", 1)
            
            # 记录验证历史
            verification = {
                "locatorId": locator_id,
                "userId": user_id,
                "success": success,
                "timestamp": datetime.now().isoformat()
            }
            
            await redis_client.lpush(f"locator:verifications:{locator_id}", json.dumps(verification))
            await redis_client.ltrim(f"locator:verifications:{locator_id}", 0, 99)  # 保留最近100条记录
            
            return True
        except Exception as e:
            self.logger.error(f"验证定位器失败: {locator_id}, {str(e)}")
            return False 