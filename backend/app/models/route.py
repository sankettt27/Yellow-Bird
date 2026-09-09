"""
Route, BusStop, RouteStop, and RouteProgress models for managing transit routes.
Enhanced with landmark detection, route geometry, versioning, and live progress tracking.
"""

from sqlalchemy import String, Integer, Float, Text, Time, ForeignKey, Enum, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, generate_uuid
from app.models.enums import RouteStatus


class Route(Base, TimestampMixin):
    __tablename__ = "routes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    school_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    estimated_duration_mins: Mapped[float] = mapped_column(Float, nullable=True)
    estimated_distance_km: Mapped[float] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)

    # New fields for route management
    status: Mapped[RouteStatus] = mapped_column(
        Enum(RouteStatus), default=RouteStatus.DRAFT
    )
    route_geometry: Mapped[str | None] = mapped_column(Text, nullable=True)  # Encoded polyline
    version: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    school = relationship("School", back_populates="routes")
    buses = relationship("Bus", back_populates="assigned_route")
    route_stops = relationship(
        "RouteStop", back_populates="route", cascade="all, delete-orphan",
        order_by="RouteStop.sequence_order"
    )
    trips = relationship("Trip", back_populates="route")
    progress_records = relationship("RouteProgress", back_populates="route", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self) -> str:
        return f"<Route(id={self.id}, name={self.name}, status={self.status})>"


class BusStop(Base, TimestampMixin):
    __tablename__ = "bus_stops"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    school_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=True)

    # Enhanced fields for landmark detection
    landmark: Mapped[str | None] = mapped_column(String(255), nullable=True)   # "Near ABC Temple"
    locality: Mapped[str | None] = mapped_column(String(255), nullable=True)   # "College Road"
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)       # "Nashik"
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True) # "422101"
    created_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    school = relationship("School", back_populates="bus_stops")
    route_stops = relationship("RouteStop", back_populates="stop")
    pickup_students = relationship("Student", back_populates="pickup_stop", foreign_keys="Student.pickup_stop_id")
    drop_students = relationship("Student", back_populates="drop_stop", foreign_keys="Student.drop_stop_id")
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self) -> str:
        return f"<BusStop(id={self.id}, name={self.name})>"


class RouteStop(Base):
    """Junction table linking routes to stops with ordering."""
    __tablename__ = "route_stops"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    route_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("routes.id", ondelete="CASCADE"), nullable=False
    )
    stop_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("bus_stops.id", ondelete="CASCADE"), nullable=False
    )
    sequence_order: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_arrival: Mapped[str | None] = mapped_column(Time, nullable=True)

    # New fields for per-leg route data
    distance_from_prev_km: Mapped[float] = mapped_column(Float, nullable=True, default=0.0)
    duration_from_prev_mins: Mapped[float] = mapped_column(Float, nullable=True, default=0.0)

    # Relationships
    route = relationship("Route", back_populates="route_stops")
    stop = relationship("BusStop", back_populates="route_stops")


class RouteProgress(Base, TimestampMixin):
    """Tracks live stop-by-stop progress during an active trip."""
    __tablename__ = "route_progress"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    trip_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    route_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("routes.id", ondelete="CASCADE"), nullable=False
    )
    current_stop_index: Mapped[int] = mapped_column(Integer, default=0)  # Index in route_stops order
    completed_stops: Mapped[dict] = mapped_column(JSON, default=list)     # [{stop_id, completed_at}]
    status: Mapped[str] = mapped_column(String(20), default="in_progress")  # "in_progress" | "completed"

    # Relationships
    trip = relationship("Trip", back_populates="route_progress")
    route = relationship("Route", back_populates="progress_records")
