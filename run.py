import uvicorn
import os
import asyncio
import signal
import sys

from server.main import app
from server.utils.logger import get_logger

logger = get_logger("runner")

# 获取配置
HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", 8000))
WORKERS = int(os.environ.get("WORKERS", 1))
RELOAD = os.environ.get("RELOAD", "true").lower() == "true"

def handle_exit(signum, frame):
    """处理退出信号"""
    logger.info("接收到退出信号，正在关闭服务...")
    sys.exit(0)

if __name__ == "__main__":
    # 注册信号处理
    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)
    
    try:
        logger.info(f"启动服务 - 主机: {HOST}, 端口: {PORT}, 工作进程: {WORKERS}, 热重载: {RELOAD}")
        
        # 启动服务
        uvicorn.run(
            "server.main:app",
            host=HOST,
            port=PORT,
            workers=WORKERS,
            reload=RELOAD,
            log_level="info"
        )
    except Exception as e:
        logger.error(f"服务启动失败: {str(e)}", exc_info=True)
        sys.exit(1) 