from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, DateTime, ForeignKey, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.document import Document

class DocumentPermission(Base):
    __tablename__ = "DocumentPermission"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    documentId: Mapped[str] = mapped_column(ForeignKey("Document.id", ondelete="CASCADE"), nullable=False)
    userId: Mapped[int] = mapped_column(ForeignKey("User.id", ondelete="CASCADE"), nullable=False)
    role: Mapped[str] = mapped_column(String, nullable=False)  # "editor" or "viewer"

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="permissions")
    user: Mapped["User"] = relationship("User", back_populates="permissions")

    # Unique constraint: one permission per document per user
    __table_args__ = (
        UniqueConstraint("documentId", "userId", name="uq_document_user_permission"),
    )

    # Timestamps
    createdAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updatedAt: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
