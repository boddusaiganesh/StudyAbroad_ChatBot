from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    id: int
    email: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class ChatRequest(BaseModel):
    question: str
    country: Optional[str] = None


class ChatResponse(BaseModel):
    answer: str
    country: Optional[str] = None


class ChatHistoryItem(BaseModel):
    id: int
    question: str
    answer: str
    country: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
