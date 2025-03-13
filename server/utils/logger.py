import logging
import json
import os
from logging.handlers import RotatingFileHandler
import sys
from datetime import datetime
from typing import Dict, Any, Optional

# 日志配置
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
LOG_DIR = os.environ.get("LOG_DIR", "logs")
MAX_LOG_SIZE = 10 * 1024 * 1024  # 10MB
BACKUP_COUNT = 5

# 确保日志目录存在
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

class JsonFormatter(logging.Formatter):
    """JSON格式化日志"""
    
    def format(self, record):
        log_record = {
            "timestamp": datetime.now().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # 添加额外信息
        if hasattr(record, "extra") and record.extra:
            log_record.update(record.extra)
        
        # 添加异常信息
        if record.exc_info:
            log_record["exception"] = {
                "type": str(record.exc_info[0].__name__),
                "message": str(record.exc_info[1]),
                "traceback": self.formatException(record.exc_info)
            }
        
        return json.dumps(log_record)

def setup_logger():
    """初始化日志系统"""
    # 获取根日志器
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, LOG_LEVEL))
    
    # 控制台处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(JsonFormatter())
    root_logger.addHandler(console_handler)
    
    # 文件处理器
    file_handler = RotatingFileHandler(
        os.path.join(LOG_DIR, "app.log"),
        maxBytes=MAX_LOG_SIZE,
        backupCount=BACKUP_COUNT
    )
    file_handler.setFormatter(JsonFormatter())
    root_logger.addHandler(file_handler)
    
    # 错误日志处理器
    error_handler = RotatingFileHandler(
        os.path.join(LOG_DIR, "error.log"),
        maxBytes=MAX_LOG_SIZE,
        backupCount=BACKUP_COUNT
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(JsonFormatter())
    root_logger.addHandler(error_handler)
    
    # 禁用第三方库的过多日志
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("aiohttp").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)

def get_logger(name: str):
    """获取指定名称的日志器"""
    logger = logging.getLogger(name)
    
    # 添加额外信息方法
    def _log_with_extra(level, msg, extra=None, **kwargs):
        if extra is None:
            extra = {}
        kwargs["extra"] = {"extra": extra}
        logger.log(level, msg, **kwargs)
    
    # 为日志器添加方法
    logger.debug_extra = lambda msg, extra=None, **kwargs: _log_with_extra(logging.DEBUG, msg, extra, **kwargs)
    logger.info_extra = lambda msg, extra=None, **kwargs: _log_with_extra(logging.INFO, msg, extra, **kwargs)
    logger.warning_extra = lambda msg, extra=None, **kwargs: _log_with_extra(logging.WARNING, msg, extra, **kwargs)
    logger.error_extra = lambda msg, extra=None, **kwargs: _log_with_extra(logging.ERROR, msg, extra, **kwargs)
    logger.critical_extra = lambda msg, extra=None, **kwargs: _log_with_extra(logging.CRITICAL, msg, extra, **kwargs)
    
    return logger 