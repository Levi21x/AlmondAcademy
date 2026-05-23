from datetime import date, datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import StudentCategory, StudentMode, TeachingStyle


class ApiError(BaseModel):
    error: bool = True
    message: str
    code: str
    details: Dict[str, Any] = Field(default_factory=dict)


class ApiSuccess(BaseModel):
    success: bool = True
    data: Dict[str, Any]


class VerifyTokenResponse(BaseModel):
    valid: bool
    user_id: str
    email: EmailStr


class StudentProfileBase(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    college_name: Optional[str] = None
    university_name: Optional[str] = None
    current_year: Optional[int] = Field(default=None, ge=1, le=5)
    mode: StudentMode = "mbbs"
    student_category: StudentCategory
    teaching_style: TeachingStyle = "conversational"
    onboarding_completed: bool = False


class StudentProfileCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    college_name: Optional[str] = None
    university_name: Optional[str] = None
    current_year: Optional[int] = Field(default=None, ge=1, le=5)
    mode: StudentMode
    student_category: StudentCategory
    teaching_style: TeachingStyle
    onboarding_completed: bool


class StudentProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=120)
    college_name: Optional[str] = None
    university_name: Optional[str] = None
    current_year: Optional[int] = Field(default=None, ge=1, le=5)
    mode: Optional[StudentMode] = None
    student_category: Optional[StudentCategory] = None
    teaching_style: Optional[TeachingStyle] = None
    onboarding_completed: Optional[bool] = None


class StudentProfileOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    user_id: str
    full_name: str
    college_name: Optional[str] = None
    university_name: Optional[str] = None
    current_year: Optional[int] = None
    mode: StudentMode
    student_category: Optional[StudentCategory] = None
    teaching_style: TeachingStyle
    onboarding_completed: bool
    created_at: datetime
    updated_at: datetime


class DailyUsageOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    user_id: str
    date: date
    questions_asked: int
    voice_minutes_used: int
    crisis_mode_used: bool
    created_at: datetime
