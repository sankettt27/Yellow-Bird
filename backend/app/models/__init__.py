"""
Models package — imports all models so SQLAlchemy can discover them.
"""

from app.models.school import School
from app.models.user import User
from app.models.driver import Driver
from app.models.parent import Parent
from app.models.bus import Bus
from app.models.route import Route, BusStop, RouteStop, RouteProgress
from app.models.student import Student
from app.models.trip import Trip, TripLocation
from app.models.notification import Notification
from app.models.password_reset import PasswordResetToken
from app.models.enums import (
    UserRole, BusStatus, DriverStatus,
    TripStatus, TripType, NotificationType,
    RouteStatus,
)

__all__ = [
    "School", "User", "Driver", "Parent", "Bus",
    "Route", "BusStop", "RouteStop", "RouteProgress", "Student",
    "Trip", "TripLocation", "Notification", "PasswordResetToken",
    "UserRole", "BusStatus", "DriverStatus",
    "TripStatus", "TripType", "NotificationType",
    "RouteStatus",
]
