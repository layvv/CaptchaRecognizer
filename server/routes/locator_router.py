from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks, Query, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import time
from datetime import datetime

from server.services.locator_service import LocatorService
from server.utils.logger import get_logger
from server.utils.rate_limiter import check_rate_limit
from server.models.user import UserSession
from server.models.locator import LocatorResponse

router = APIRouter()
logger = get_logger("locator-router")

# 定位器服务
locator_service = LocatorService()

# 获取验证码定位器
@router.get("/get", response_model=Dict[str, Any])
async def get_locator(
    request: Request,
    domain: str = Query(..., description="网站域名"),
    user: UserSession = Depends(),
):
    # 限流检查
    await check_rate_limit(request, "locator_get", 60, 30)
    
    try:
        # 获取定位器
        locator = await locator_service.get_locator(domain)
        
        logger.info(
            f"获取定位器",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "domain": domain,
                "found": locator is not None
            }
        )
        
        if not locator:
            return {}
        
        return locator
    
    except Exception as e:
        logger.error(
            f"获取定位器失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "domain": domain
            },
            exc_info=True
        )
        
        raise HTTPException(status_code=500, detail=f"获取定位器失败: {str(e)}")

# 保存验证码定位器
@router.post("/save", response_model=LocatorResponse)
async def save_locator(
    request: Request,
    locator: Dict[str, Any] = Body(...),
    background_tasks: BackgroundTasks,
    user: UserSession = Depends(),
):
    # 限流检查
    await check_rate_limit(request, "locator_save", 60, 20)
    
    # 验证定位器格式
    if not locator.get("domain") or not locator.get("captcha"):
        raise HTTPException(status_code=400, detail="无效的验证码定位器")
    
    # 添加用户ID
    if "userId" not in locator:
        locator["userId"] = user.user_id
    
    try:
        # 保存定位器
        locator_id = await locator_service.save_locator(locator)
        
        # 记录成功
        logger.info(
            f"保存定位器成功",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "domain": locator.get("domain"),
                "locator_id": locator_id
            }
        )
        
        return LocatorResponse(success=True, locator_id=locator_id)
    
    except Exception as e:
        logger.error(
            f"保存定位器失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "domain": locator.get("domain")
            },
            exc_info=True
        )
        
        raise HTTPException(status_code=500, detail=f"保存定位器失败: {str(e)}")

# 上传验证码定位器
@router.post("/upload", response_model=LocatorResponse)
async def upload_locator(
    request: Request,
    locator: Dict[str, Any] = Body(...),
    background_tasks: BackgroundTasks,
    user: UserSession = Depends(),
):
    # 需要验证用户权限
    if user.role not in ["admin", "contributor"]:
        raise HTTPException(status_code=403, detail="没有上传权限")
    
    # 限流检查
    await check_rate_limit(request, "locator_upload", 60, 10)
    
    # 验证定位器格式
    if not locator.get("domain") or not locator.get("captcha"):
        raise HTTPException(status_code=400, detail="无效的验证码定位器")
    
    # 添加用户ID
    locator["userId"] = user.user_id
    locator["verified"] = user.role == "admin"  # 管理员上传的自动验证
    
    try:
        # 保存并发布定位器
        locator_id = await locator_service.publish_locator(locator)
        
        # 记录成功
        logger.info(
            f"上传定位器成功",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "domain": locator.get("domain"),
                "locator_id": locator_id,
                "verified": locator["verified"]
            }
        )
        
        return LocatorResponse(success=True, locator_id=locator_id)
    
    except Exception as e:
        logger.error(
            f"上传定位器失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "domain": locator.get("domain")
            },
            exc_info=True
        )
        
        raise HTTPException(status_code=500, detail=f"上传定位器失败: {str(e)}")

# 获取热门网站的定位器
@router.get("/popular", response_model=List[Dict[str, Any]])
async def get_popular_locators(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    user: UserSession = Depends(),
):
    # 限流检查
    await check_rate_limit(request, "locator_popular", 60, 10)
    
    try:
        # 获取热门定位器
        locators = await locator_service.get_popular_locators(limit)
        
        return locators
    
    except Exception as e:
        logger.error(
            f"获取热门定位器失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "limit": limit
            },
            exc_info=True
        )
        
        raise HTTPException(status_code=500, detail=f"获取热门定位器失败: {str(e)}") 