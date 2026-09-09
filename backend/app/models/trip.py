"""
Trip and TripLocation models for tracking bus journeys.
"""

from sqlalchemy import String, Float, ForeignKey, Enum, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime

from app.core.database import Base, TimestampMixin, generate_uuid
from app.models.enums import TripStatus, TripType


class Trip(Base, TimestampMixin):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    bus_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("buses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    driver_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("drivers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    route_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("routes.id", ondelete="SET NULL"), nullable=True
    )
    status: Mapped[TripStatus] = mapped_column(
        Enum(TripStatus), default=TripStatus.SCHEDULED
    )
    trip_type: Mapped[TripType] = mapped_column(
        Enum(TripType), default=TripType.PICKUP
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    distance_km: Mapped[float] = mapped_column(Float, default=0.0)
    avg_speed_kmh: Mapped[float] = mapped_column(Float, default=0.0)

    # Relationships
    bus = relationship("Bus", back_populates="trips")
    driver = relationship("Driver", back_populates="trips")
    route = relationship("Route", back_populates="trips")
    locations = relationship(
        "TripLocation", back_populates="trip", cascade="all, delete-orphan",
        order_by="TripLocation.recorded_at"
    )
    notifications = relationship("Notification", back_populates="trip")
    route_progress = relationship("RouteProgress", back_populates="trip", uselist=False, cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Trip(id={self.id}, status={self.status})>"


class TripLocation(Base):
    """Individual GPS coordinate recorded during a trip."""
    __tablename__ = "trip_locations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    trip_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, index=True
    )
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    speed: Mapped[float] = mapped_column(Float, default=0.0)
    heading: Mapped[float] = mapped_column(Float, default=0.0)
    accuracy: Mapped[float] = mapped_column(Float, default=0.0)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # Relationships
    trip = relationship("Trip", back_populates="locations")

    def __repr__(self) -> str:
        return f"<TripLocation(trip={self.trip_id}, lat={self.latitude}, lng={self.longitude})>"
