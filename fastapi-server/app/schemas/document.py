from typing import Optional, Any, Dict
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class DocumentBase(BaseModel):
    title: str = "Untitled Document"
    data: Dict[str, Any] = {}

class DocumentCreate(DocumentBase):
    id: str  # UUID from frontend

class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class DocumentTitleUpdate(BaseModel):
    title: str

class Document(DocumentBase):
    id: str
    _id: Optional[str] = None # Added for frontend compatibility
    ownerId: int
    createdAt: datetime
    updatedAt: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

class DocumentWithContent(Document):
    content: Dict[str, Any]  # Alias for 'data' used in some frontend responses
