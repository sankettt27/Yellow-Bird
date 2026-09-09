"""
Parent model — extends User with parent-specific fields.
"""

from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, generate_uuid


class Parent(Base, TimestampMixin):
    __tablename__ = "parents"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    address: Mapped[str] = mapped_column(Text, nullable=True)
    alternate_phone: Mapped[str] = mapped_column(String(20), nullable=True)

    # Relationships
    user = relationship("User", back_populates="parent_profile")
    children = relationship("Student", back_populates="parent", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Parent(id={self.id}, user_id={self.user_id})>"
