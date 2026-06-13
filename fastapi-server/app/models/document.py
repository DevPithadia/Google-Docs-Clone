from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User

class Document(Base):
    __tablename__ = "Document"  # Matches Prisma/PostgreSQL exactly

    id: Mapped[str] = mapped_column(String, primary_key=True)  # UUID from frontend
    title: Mapped[str] = mapped_column(String, default="Untitled Document", nullable=False)
    data: Mapped[dict] = mapped_column(JSON, default={}, nullable=False)
    
    # Foreign Key
    ownerId: Mapped[int] = mapped_column(ForeignKey("User.id", ondelete="CASCADE"), index=True, nullable=False)
    
    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="documents")
    
    # Timestamps
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
