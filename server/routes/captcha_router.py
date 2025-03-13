from fastapi import APIRouter, Depends, Request, HTTPException, BackgroundTasks, Body
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import time
from datetime import datetime

from server.models.captcha import CaptchaRequest, CaptchaResponse, CaptchaResult, CaptchaProblem
from server.services.captcha_service import CaptchaService
from server.services.stats_service import StatsService
from server.utils.logger import get_logger
from server.utils.rate_limiter import check_rate_limit
from server.models.user import UserSession

router = APIRouter()
logger = get_logger("captcha-router")

# 验证码服务
captcha_service = CaptchaService()
stats_service = StatsService()

# 识别验证码
@router.post("/recognize", response_model=CaptchaResponse)
async def recognize_captcha(
    request: Request,
    captcha_req: CaptchaRequest,
    background_tasks: BackgroundTasks,
    user: UserSession = Depends(),
):
    # 限流检查
    await check_rate_limit(request, "captcha_recognize", 60, 10)
    
    start_time = time.time()
    
    # 记录请求
    captcha_id = await captcha_service.log_captcha_request(
        user_id=user.user_id,
        image_data=captcha_req.image,
        captcha_type=captcha_req.type
    )
    
    # 识别验证码
    try:
        result = await captcha_service.recognize(
            image_data=captcha_req.image,
            captcha_type=captcha_req.type
        )
        
        # 记录处理时间
        process_time = time.time() - start_time
        
        # 后台更新统计
        background_tasks.add_task(
            stats_service.log_recognition,
            user_id=user.user_id,
            captcha_type=captcha_req.type,
            success=True,
            process_time=process_time
        )
        
        return CaptchaResponse(
            success=True,
            captcha_id=captcha_id,
            text=result.text,
            confidence=result.confidence,
            process_time=process_time
        )
    
    except Exception as e:
        # 记录错误
        logger.error(
            f"验证码识别失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "captcha_type": captcha_req.type
            },
            exc_info=True
        )
        
        # 后台更新统计
        background_tasks.add_task(
            stats_service.log_recognition,
            user_id=user.user_id,
            captcha_type=captcha_req.type,
            success=False,
            error=str(e)
        )
        
        raise HTTPException(status_code=500, detail=f"验证码识别失败: {str(e)}")

# 解析验证码定位器
@router.post("/resolve", response_model=str)
async def resolve_captcha(
    request: Request,
    locator: Dict[str, Any] = Body(...),
    background_tasks: BackgroundTasks,
    user: UserSession = Depends(),
):
    # 限流检查
    await check_rate_limit(request, "captcha_resolve", 60, 20)
    
    # 验证定位器格式
    if not locator.get("captcha") or not locator.get("domain"):
        raise HTTPException(status_code=400, detail="无效的验证码定位器")
    
    start_time = time.time()
    
    try:
        # 解析验证码
        captcha_result = await captcha_service.resolve_from_locator(locator)
        
        # 更新统计
        background_tasks.add_task(
            captcha_service.update_locator_stats,
            locator=locator,
            success=True,
            result=captcha_result.text
        )
        
        # 记录处理时间
        process_time = time.time() - start_time
        
        logger.info(
            f"验证码解析成功",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "domain": locator.get("domain"),
                "type": locator.get("type"),
                "process_time": process_time
            }
        )
        
        return captcha_result.text
    
    except Exception as e:
        # 记录错误
        logger.error(
            f"验证码解析失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "domain": locator.get("domain")
            },
            exc_info=True
        )
        
        # 更新统计
        background_tasks.add_task(
            captcha_service.update_locator_stats,
            locator=locator,
            success=False,
            error=str(e)
        )
        
        raise HTTPException(status_code=500, detail=f"验证码解析失败: {str(e)}")

# 报告验证码识别结果
@router.post("/report")
async def report_captcha_result(
    request: Request,
    result: CaptchaResult,
    background_tasks: BackgroundTasks,
    user: UserSession = Depends(),
):
    # 限流检查
    await check_rate_limit(request, "captcha_report", 60, 30)
    
    try:
        # 记录结果
        await captcha_service.log_captcha_result(
            captcha_id=result.captcha_id,
            success=result.success,
            error_info=result.error_info
        )
        
        # 更新统计
        background_tasks.add_task(
            stats_service.update_recognition_result,
            captcha_id=result.captcha_id,
            success=result.success
        )
        
        return {"success": True}
    
    except Exception as e:
        logger.error(
            f"记录验证码结果失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "captcha_id": result.captcha_id
            },
            exc_info=True
        )
        
        raise HTTPException(status_code=500, detail=f"记录验证码结果失败: {str(e)}")

# 提交问题验证码
@router.post("/problem")
async def submit_problem_captcha(
    request: Request,
    problem: CaptchaProblem,
    background_tasks: BackgroundTasks,
    user: UserSession = Depends(),
):
    # 限流检查
    await check_rate_limit(request, "captcha_problem", 60, 10)
    
    try:
        # 保存问题验证码
        problem_id = await captcha_service.save_problem_captcha(
            image_data=problem.image,
            domain=problem.domain,
            captcha_type=problem.type,
            expected_text=problem.expected_text,
            actual_text=problem.actual_text,
            url=problem.url,
            user_id=user.user_id,
            context=problem.context
        )
        
        logger.info(
            f"问题验证码已提交",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "domain": problem.domain,
                "problem_id": problem_id
            }
        )
        
        return {"success": True, "problem_id": problem_id}
    
    except Exception as e:
        logger.error(
            f"提交问题验证码失败: {str(e)}",
            extra={
                "request_id": getattr(request.state, "request_id", "unknown"),
                "user_id": user.user_id,
                "domain": problem.domain
            },
            exc_info=True
        )
        
        raise HTTPException(status_code=500, detail=f"提交问题验证码失败: {str(e)}") 