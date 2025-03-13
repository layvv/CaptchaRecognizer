from typing import Optional
import time
from fastapi import HTTPException, Request
from datetime import datetime

from server.database.redis_client import redis_client
from server.utils.logger import get_logger

logger = get_logger("rate-limiter")

class RateLimiter:
    """速率限制器"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
    
    async def check_rate(self, key: str, period: int, max_requests: int) -> bool:
        """
        检查是否超出速率限制
        
        参数：
            key: 限流键
            period: 时间窗口(秒)
            max_requests: 最大请求数
        
        返回：
            bool: 是否允许请求
        """
        current = int(time.time())
        period_key = f"{key}:{current // period}"
        
        # 获取当前计数
        count = await self.redis.get(period_key)
        count = int(count) if count else 0
        
        if count >= max_requests:
            return False
        
        # 递增计数
        await self.redis.incr(period_key)
        
        # 设置过期时间
        await self.redis.expire(period_key, period)
        
        return True

# 全局限流器
rate_limiter = RateLimiter(redis_client)

async def check_rate_limit(request: Request, key_prefix: str, period: int, max_requests: int):
    """检查请求速率限制"""
    # 构建键（基于用户ID或IP）
    user_id = getattr(request.state, "user_id", "anonymous")
    ip = request.client.host
    
    # 用户限流
    user_key = f"ratelimit:{key_prefix}:user:{user_id}"
    if not await rate_limiter.check_rate(user_key, period, max_requests):
        logger.warning(
            f"用户请求限流触发",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user_id,
                "endpoint": str(request.url),
                "rate_key": key_prefix
            }
        )
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试")
    
    # IP限流（防止未登录用户滥用）
    ip_key = f"ratelimit:{key_prefix}:ip:{ip}"
    if not await rate_limiter.check_rate(ip_key, period, max_requests * 2):  # IP限流更宽松一些
        logger.warning(
            f"IP请求限流触发",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "ip": ip,
                "endpoint": str(request.url),
                "rate_key": key_prefix
            }
        )
        raise HTTPException(status_code=429, detail="请求过于频繁，请稍后再试") 