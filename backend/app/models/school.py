"""
School model — represents a registered school/institution on the platform.
"""

from sqlalchemy import String, Text, JSON, Float
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, generate_uuid


class School(Base, TimestampMixin):
    __tablename__ = "schools"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    address: Mapped[str] = mapped_column(Text, nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=True)
    state: Mapped[str] = mapped_column(String(100), nullable=True)
    country: Mapped[str] = mapped_column(String(100), default="India")
    zip_code: Mapped[str] = mapped_column(String(20), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    website: Mapped[str] = mapped_column(String(255), nullable=True)
    logo_url: Mapped[str] = mapped_column(String(500), nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=True)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    is_active: Mapped[bool] = mapped_column(default=True)

    # Relationships
    users = relationship("User", back_populates="school", cascade="all, delete-orphan")
    buses = relationship("Bus", back_populates="school", cascade="all, delete-orphan")
    routes = relationship("Route", back_populates="school", cascade="all, delete-orphan")
    bus_stops = relationship("BusStop", back_populates="school", cascade="all, delete-orphan")
    students = relationship("Student", back_populates="school", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="school", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<School(id={self.id}, name={self.name})>"
