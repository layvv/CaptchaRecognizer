import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta

from server.database.redis_client import redis_client
from server.utils.logger import get_logger

class StatsService:
    """统计服务"""
    
    def __init__(self):
        self.logger = get_logger("stats-service")
    
    async def log_recognition(
        self,
        user_id: str,
        captcha_type: str,
        success: bool,
        process_time: float,
        captcha_id: str,
        domain: Optional[str] = None
    ):
        """记录验证码识别事件"""
        try:
            now = datetime.now()
            date_key = now.strftime("%Y-%m-%d")
            hour_key = now.strftime("%Y-%m-%d-%H")
            
            # 更新日统计
            day_key = f"stats:day:{date_key}"
            await redis_client.hincrby(day_key, "total", 1)
            await redis_client.hincrby(day_key, f"type:{captcha_type}", 1)
            await redis_client.hincrby(day_key, "success" if success else "error", 1)
            
            # 更新小时统计
            hour_key = f"stats:hour:{hour_key}"
            await redis_client.hincrby(hour_key, "total", 1)
            await redis_client.hincrby(hour_key, f"type:{captcha_type}", 1)
            await redis_client.hincrby(hour_key, "success" if success else "error", 1)
            
            # 更新域名统计
            if domain:
                domain_key = f"stats:domain:{domain}"
                await redis_client.hincrby(domain_key, "total", 1)
                await redis_client.hincrby(domain_key, "success" if success else "error", 1)
                await redis_client.hset(domain_key, "lastUpdated", now.isoformat())
            
            # 更新用户统计
            user_key = f"stats:user:{user_id}"
            await redis_client.hincrby(user_key, "total", 1)
            await redis_client.hincrby(user_key, "success" if success else "error", 1)
            await redis_client.hset(user_key, "lastUpdated", now.isoformat())
            
            # 记录处理时间到列表
            time_key = f"stats:time:{date_key}"
            await redis_client.lpush(time_key, str(process_time))
            await redis_client.ltrim(time_key, 0, 9999)  # 保留最近10000条记录
            
            # 设置过期时间（保留30天）
            await redis_client.expire(day_key, 60 * 60 * 24 * 30)
            await redis_client.expire(hour_key, 60 * 60 * 24 * 30)
            await redis_client.expire(time_key, 60 * 60 * 24 * 30)
        except Exception as e:
            self.logger.error(f"记录统计信息失败: {str(e)}")
    
    async def get_daily_stats(self, days: int = 7) -> List[Dict[str, Any]]:
        """获取每日统计"""
        try:
            result = []
            now = datetime.now()
            
            for i in range(days):
                date = now - timedelta(days=i)
                date_key = date.strftime("%Y-%m-%d")
                day_key = f"stats:day:{date_key}"
                
                stats = await redis_client.hgetall(day_key)
                if stats:
                    # 转换数字字段
                    for key in ["total", "success", "error"]:
                        if key in stats:
                            stats[key] = int(stats[key])
                    
                    # 添加日期
                    stats["date"] = date_key
                    result.append(stats)
                else:
                    # 无数据的日期
                    result.append({
                        "date": date_key,
                        "total": 0,
                        "success": 0,
                        "error": 0
                    })
            
            # 按日期排序
            result.sort(key=lambda x: x["date"])
            return result
        except Exception as e:
            self.logger.error(f"获取每日统计失败: {str(e)}")
            raise
    
    async def get_hourly_stats(self, hours: int = 24) -> List[Dict[str, Any]]:
        """获取小时统计"""
        try:
            result = []
            now = datetime.now()
            
            for i in range(hours):
                hour = now - timedelta(hours=i)
                hour_key = hour.strftime("%Y-%m-%d-%H")
                hour_stats_key = f"stats:hour:{hour_key}"
                
                stats = await redis_client.hgetall(hour_stats_key)
                if stats:
                    # 转换数字字段
                    for key in ["total", "success", "error"]:
                        if key in stats:
                            stats[key] = int(stats[key])
                    
                    # 添加时间
                    stats["hour"] = hour_key
                    result.append(stats)
                else:
                    # 无数据的小时
                    result.append({
                        "hour": hour_key,
                        "total": 0,
                        "success": 0,
                        "error": 0
                    })
            
            # 按时间排序
            result.sort(key=lambda x: x["hour"])
            return result
        except Exception as e:
            self.logger.error(f"获取小时统计失败: {str(e)}")
            raise 