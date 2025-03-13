from fastapi import FastAPI, Request, Response, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
import uuid
from datetime import datetime

from server.routes import captcha_router, locator_router, features_router, stats_router
from server.utils.logger import setup_logger, get_logger
from server.utils.rate_limiter import RateLimiter
from server.models.user import UserSession
from server.database.redis_client import redis_client

# 初始化应用
app = FastAPI(
    title="验证码识别系统API",
    description="高性能验证码识别服务，支持字符型验证码等多种类型",
    version="1.0.0"
)

# 设置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 生产环境应该限制来源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化日志
setup_logger()
logger = get_logger("app")

# 初始化限流器
rate_limiter = RateLimiter(redis_client)

# 注册路由
app.include_router(captcha_router.router, prefix="/v1/captcha", tags=["验证码"])
app.include_router(locator_router.router, prefix="/v1/locator", tags=["定位器"])
app.include_router(features_router.router, prefix="/v1/features", tags=["特征"])
app.include_router(stats_router.router, prefix="/v1/stats", tags=["统计"])

# 请求ID中间件
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    request.state.start_time = time.time()
    
    # 提取用户ID
    user_id = request.headers.get("X-User-ID")
    request.state.user_id = user_id or "anonymous"
    
    # 处理请求
    response = await call_next(request)
    
    # 添加请求ID和处理时间到响应
    process_time = time.time() - request.state.start_time
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(process_time)
    
    # 记录请求信息
    logger.info(
        f"请求处理完成",
        extra={
            "request_id": request_id,
            "user_id": request.state.user_id,
            "method": request.method,
            "url": str(request.url),
            "status_code": response.status_code,
            "process_time": process_time
        }
    )
    
    return response

# 异常处理
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    logger.error(
        f"HTTP异常: {exc.detail}",
        extra={
            "request_id": getattr(request.state, "request_id", "unknown"),
            "status_code": exc.status_code,
            "url": str(request.url)
        }
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"message": exc.detail}
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(
        f"系统异常: {str(exc)}",
        extra={
            "request_id": getattr(request.state, "request_id", "unknown"),
            "url": str(request.url),
            "exception": str(exc)
        },
        exc_info=True
    )
    return JSONResponse(
        status_code=500,
        content={"message": "服务器内部错误"}
    )

# 获取用户会话
async def get_user_session(request: Request) -> UserSession:
    user_id = request.state.user_id
    if not user_id or user_id == "anonymous":
        return UserSession(user_id="anonymous", role="anonymous")
    
    # 从Redis获取用户会话
    user_data = await redis_client.get(f"user:{user_id}")
    if user_data:
        # 反序列化用户数据
        return UserSession.parse_raw(user_data)
    
    # 创建新的匿名会话
    return UserSession(user_id=user_id, role="user")

# 健康检查路由
@app.get("/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

# 主路由
@app.get("/")
async def root():
    return {
        "title": "验证码识别系统API",
        "version": "1.0.0",
        "documentation": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.main:app", host="0.0.0.0", port=8000, reload=True) 