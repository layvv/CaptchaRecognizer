from fastapi import APIRouter, Depends, Request, HTTPException, Query
from typing import Dict, Any, List

from server.services.stats_service import StatsService
from server.utils.logger import get_logger
from server.utils.rate_limiter import check_rate_limit
from server.models.user import UserSession

router = APIRouter()
logger = get_logger("stats-router")

# 统计服务
stats_service = StatsService()

# 获取每日统计
@router.get("/daily")
async def get_daily_stats(
    request: Request,
    days: int = Query(7, ge=1, le=30),
    user: UserSession = Depends(),
):
    # 限流检查
    await check_rate_limit(request, "stats_daily", 60, 10)
    
    try:
        # 获取每日统计
        stats = await stats_service.get_daily_stats(days)
        
        return stats
    
    except Exception as e:
        logger.error(
            f"获取每日统计失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "days": days
            },
            exc_info=True
        )
        
        raise HTTPException(status_code=500, detail=f"获取每日统计失败: {str(e)}")

# 获取小时统计
@router.get("/hourly")
async def get_hourly_stats(
    request: Request,
    hours: int = Query(24, ge=1, le=72),
    user: UserSession = Depends(),
):
    # 限流检查
    await check_rate_limit(request, "stats_hourly", 60, 10)
    
    try:
        # 获取小时统计
        stats = await stats_service.get_hourly_stats(hours)
        
        return stats
    
    except Exception as e:
        logger.error(
            f"获取小时统计失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "hours": hours
            },
            exc_info=True
        )
        
        raise HTTPException(status_code=500, detail=f"获取小时统计失败: {str(e)}")

# 获取用户统计
@router.get("/user")
async def get_user_stats(
    request: Request,
    user: UserSession = Depends(),
):
    # 限流检查
    await check_rate_limit(request, "stats_user", 60, 10)
    
    try:
        # 获取用户统计
        user_key = f"stats:user:{user.user_id}"
        user_stats = await stats_service.redis_client.hgetall(user_key)
        
        if not user_stats:
            user_stats = {
                "total": 0,
                "success": 0,
                "error": 0
            }
        else:
            # 转换数字字段
            for key in ["total", "success", "error"]:
                if key in user_stats:
                    user_stats[key] = int(user_stats[key])
        
        return user_stats
    
    except Exception as e:
        logger.error(
            f"获取用户统计失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id
            },
            exc_info=True
        )
        
        raise HTTPException(status_code=500, detail=f"获取用户统计失败: {str(e)}") 