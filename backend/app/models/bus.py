"""
Bus model — represents a school bus vehicle.
"""

from sqlalchemy import String, Integer, ForeignKey, Enum, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, generate_uuid
from app.models.enums import BusStatus


class Bus(Base, TimestampMixin):
    __tablename__ = "buses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    school_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True
    )
    bus_number: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    registration_number: Mapped[str] = mapped_column(String(50), nullable=True, unique=True)
    model: Mapped[str] = mapped_column(String(100), nullable=True)
    capacity: Mapped[int] = mapped_column(Integer, default=40)
    assigned_route_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("routes.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[BusStatus] = mapped_column(
        Enum(BusStatus), default=BusStatus.INACTIVE
    )
    current_speed: Mapped[float] = mapped_column(Float, default=0.0)
    current_latitude: Mapped[float] = mapped_column(Float, nullable=True)
    current_longitude: Mapped[float] = mapped_column(Float, nullable=True)

    # Relationships
    school = relationship("School", back_populates="buses")
    assigned_driver = relationship(
        "Driver", back_populates="assigned_bus", uselist=False,
        foreign_keys="Driver.assigned_bus_id"
    )
    assigned_route = relationship("Route", back_populates="buses")
    trips = relationship("Trip", back_populates="bus")
    students = relationship("Student", back_populates="assigned_bus")

    def __repr__(self) -> str:
        return f"<Bus(id={self.id}, number={self.bus_number}, status={self.status})>"
