from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class UserSession(BaseModel):
    """用户会话模型"""
    user_id: str
    role: str = "user"  # user, admin, anonymous
    username: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.now)
    last_active: datetime = Field(default_factory=datetime.now)
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class UserProfile(BaseModel):
    """用户资料模型"""
    user_id: str
    username: Optional[str] = None
    email: Optional[str] = None
    role: str = "user"
    created_at: datetime
    last_active: datetime
    
    # 统计信息
    total_captchas: int = 0
    success_captchas: int = 0
    error_captchas: int = 0
    
    # 贡献信息
    contributions: int = 0
    locators_created: int = 0
    problems_reported: int = 0
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class UserPreference(BaseModel):
    """用户偏好设置"""
    user_id: str
    auto_solve: bool = True
    notification: bool = True
    theme: str = "light"
    keyboard_shortcuts: bool = True
    custom_settings: Optional[dict] = None 