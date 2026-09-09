"""
Student model — represents an enrolled student linked to parent, school, and bus.
"""

from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, generate_uuid


class Student(Base, TimestampMixin):
    __tablename__ = "students"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    school_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("schools.id", ondelete="CASCADE"), nullable=False, index=True
    )
    parent_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("parents.id", ondelete="SET NULL"), nullable=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    class_name: Mapped[str] = mapped_column(String(50), nullable=True)
    section: Mapped[str] = mapped_column(String(10), nullable=True)
    roll_number: Mapped[str] = mapped_column(String(20), nullable=True)
    pickup_stop_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("bus_stops.id", ondelete="SET NULL"), nullable=True
    )
    drop_stop_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("bus_stops.id", ondelete="SET NULL"), nullable=True
    )
    assigned_bus_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("buses.id", ondelete="SET NULL"), nullable=True
    )

    # Relationships
    school = relationship("School", back_populates="students")
    parent = relationship("Parent", back_populates="children")
    pickup_stop = relationship("BusStop", back_populates="pickup_students", foreign_keys=[pickup_stop_id])
    drop_stop = relationship("BusStop", back_populates="drop_students", foreign_keys=[drop_stop_id])
    assigned_bus = relationship("Bus", back_populates="students")

    def __repr__(self) -> str:
        return f"<Student(id={self.id}, name={self.full_name})>"
