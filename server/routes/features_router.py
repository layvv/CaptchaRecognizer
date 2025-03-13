from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks, Query, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

from server.services.features_service import FeaturesService
from server.utils.logger import get_logger
from server.utils.rate_limiter import check_rate_limit
from server.models.user import UserSession

router = APIRouter()
logger = get_logger("features-router")

# 特征库服务
features_service = FeaturesService()

# 获取验证码特征
@router.get("/get")
async def get_features(
    request: Request,
    feature_type: Optional[str] = Query(None, description="特征类型，如character"),
    user: UserSession = Depends(),
):
    # 限流检查
    await check_rate_limit(request, "features_get", 60, 10)
    
    try:
        # 获取特征库
        features = await features_service.get_features(feature_type)
        
        logger.info(
            f"获取特征库",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "feature_type": feature_type
            }
        )
        
        return features
    
    except Exception as e:
        logger.error(
            f"获取特征库失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "feature_type": feature_type
            },
            exc_info=True
        )
        
        raise HTTPException(status_code=500, detail=f"获取特征库失败: {str(e)}")

# 更新特征（仅管理员）
@router.post("/update")
async def update_features(
    request: Request,
    features: Dict[str, Any] = Body(...),
    user: UserSession = Depends(),
):
    # 权限检查
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    
    # 限流检查
    await check_rate_limit(request, "features_update", 60, 5)
    
    try:
        # 更新特征库
        await features_service.update_features(features)
        
        logger.info(
            f"更新特征库成功",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "feature_type": features.get("type")
            }
        )
        
        return {"success": True}
    
    except Exception as e:
        logger.error(
            f"更新特征库失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id
            },
            exc_info=True
        )
        
        raise HTTPException(status_code=500, detail=f"更新特征库失败: {str(e)}")

# 提交新特征
@router.post("/suggest")
async def suggest_feature(
    request: Request,
    feature: Dict[str, Any] = Body(...),
    user: UserSession = Depends(),
):
    # 限流检查
    await check_rate_limit(request, "features_suggest", 60, 10)
    
    # 添加用户ID
    feature["userId"] = user.user_id
    
    try:
        # 提交特征建议
        suggestion_id = await features_service.suggest_feature(feature)
        
        logger.info(
            f"提交特征建议成功",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "suggestion_id": suggestion_id
            }
        )
        
        return {"success": True, "suggestion_id": suggestion_id}
    
    except Exception as e:
        logger.error(
            f"提交特征建议失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id
            },
            exc_info=True
        )
        
        raise HTTPException(status_code=500, detail=f"提交特征建议失败: {str(e)}") 