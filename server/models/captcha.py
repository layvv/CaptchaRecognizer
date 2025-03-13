from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class CaptchaRequest(BaseModel):
    """验证码识别请求"""
    image: str  # Base64编码的图像
    captcha_type: str = "character"  # character, slide, click
    domain: Optional[str] = None
    url: Optional[str] = None
    locator_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    
class CaptchaResponse(BaseModel):
    """验证码识别响应"""
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    captcha_id: str
    process_time: float
    timestamp: datetime = Field(default_factory=datetime.now)
    
class CaptchaResult(BaseModel):
    """验证码识别结果"""
    captcha_id: str
    captcha_type: str
    text: Optional[str] = None
    positions: Optional[List[Dict[str, int]]] = None  # 点击位置列表
    confidence: float
    timestamp: datetime = Field(default_factory=datetime.now)
    
class CaptchaRecognitionResult(BaseModel):
    """识别服务内部使用的结果模型"""
    success: bool
    captcha_id: str
    captcha_type: str
    result: Dict[str, Any] = {}
    process_time: float
    error: Optional[str] = None
    
class CaptchaProblem(BaseModel):
    """验证码问题报告"""
    image: str  # Base64编码的图像
    domain: str
    captcha_type: str = "character"
    expected_text: Optional[str] = None
    actual_text: Optional[str] = None
    url: Optional[str] = None
    context: Optional[Dict[str, Any]] = None 