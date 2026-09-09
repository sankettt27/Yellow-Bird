"""
Notification model — in-app notifications for all user roles.
"""

from sqlalchemy import String, Text, Boolean, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, generate_uuid
from app.models.enums import NotificationType


class Notification(Base, TimestampMixin):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    school_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=True, index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    trip_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="SET NULL"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=True)
    type: Mapped[NotificationType] = mapped_column(
        Enum(NotificationType), default=NotificationType.GENERAL
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    school = relationship("School", back_populates="notifications")
    user = relationship("User", back_populates="notifications")
    trip = relationship("Trip", back_populates="notifications")

    def __repr__(self) -> str:
        return f"<Notification(id={self.id}, type={self.type}, read={self.is_read})>"
