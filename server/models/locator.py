from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class LocatorBase(BaseModel):
    """定位器基类"""
    domain: str
    type: str = "character"  # character, slide, click
    captcha: Dict[str, Any]
    submit: Optional[Dict[str, Any]] = None
    input: Optional[Dict[str, Any]] = None
    refresh: Optional[Dict[str, Any]] = None
    
class LocatorCreate(LocatorBase):
    """创建定位器请求"""
    user_id: str

class LocatorResponse(LocatorBase):
    """定位器响应"""
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    usage_count: int = 0
    success_rate: float = 0.0
    
class LocatorVerify(BaseModel):
    """定位器验证请求"""
    locator_id: str
    success: bool
    feedback: Optional[str] = None 