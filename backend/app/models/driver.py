"""
Driver model — extends User with driver-specific fields.
"""

from sqlalchemy import String, Date, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, generate_uuid
from app.models.enums import DriverStatus


class Driver(Base, TimestampMixin):
    __tablename__ = "drivers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    license_number: Mapped[str] = mapped_column(String(50), nullable=True)
    license_expiry: Mapped[str | None] = mapped_column(Date, nullable=True)
    assigned_bus_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("buses.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[DriverStatus] = mapped_column(
        Enum(DriverStatus), default=DriverStatus.OFFLINE
    )
    emergency_contact: Mapped[str] = mapped_column(String(20), nullable=True)

    # Relationships
    user = relationship("User", back_populates="driver_profile")
    assigned_bus = relationship("Bus", back_populates="assigned_driver", foreign_keys=[assigned_bus_id])
    trips = relationship("Trip", back_populates="driver")

    def __repr__(self) -> str:
        return f"<Driver(id={self.id}, user_id={self.user_id}, status={self.status})>"
