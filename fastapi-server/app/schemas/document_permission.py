from typing import Optional
from pydantic import BaseModel, ConfigDict, field_validator
from datetime import datetime

class DocumentPermissionBase(BaseModel):
    documentId: str
    userId: int
    role: str

class DocumentPermissionCreate(BaseModel):
    email: str  # We'll use email to find the user
    role: str

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ["editor", "viewer"]:
            raise ValueError("Role must be either 'editor' or 'viewer'")
        return v

class DocumentPermissionUpdate(BaseModel):
    role: Optional[str] = None

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ["editor", "viewer"]:
            raise ValueError("Role must be either 'editor' or 'viewer'")
        return v

class DocumentPermission(DocumentPermissionBase):
    id: int
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True)

class DocumentPermissionWithUser(DocumentPermission):
    userEmail: str
    userName: str
    userPicture: Optional[str] = None
