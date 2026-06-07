from datetime import datetime
from typing import List
from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class User(Base):
    __tablename__ = "User"  # Matches Prisma/PostgreSQL exactly

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    googleId: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    picture: Mapped[str] = mapped_column(String, nullable=True)
    
    # Relationships
    documents: Mapped[List["Document"]] = relationship(
        "Document", back_populates="owner", cascade="all, delete-orphan"
    )
    
    # Timestamps
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
