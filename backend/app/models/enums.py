"""
Shared enums used across multiple models.
"""

import enum


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "super_admin"
    SCHOOL_ADMIN = "school_admin"
    DRIVER = "driver"
    PARENT = "parent"


class BusStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"
    ON_TRIP = "on_trip"


class DriverStatus(str, enum.Enum):
    AVAILABLE = "available"
    ON_TRIP = "on_trip"
    OFFLINE = "offline"
    ON_LEAVE = "on_leave"


class TripStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TripType(str, enum.Enum):
    PICKUP = "pickup"
    DROP = "drop"
    MORNING = "morning"
    EVENING = "evening"


class NotificationType(str, enum.Enum):
    TRIP_STARTED = "trip_started"
    TRIP_ENDED = "trip_ended"
    BUS_NEAR_STOP = "bus_near_stop"
    BUS_DELAYED = "bus_delayed"
    OVERSPEED = "overspeed"
    EMERGENCY = "emergency"
    GENERAL = "general"


class RouteStatus(str, enum.Enum):
    DRAFT = "draft"
    CONFIRMED = "confirmed"
    ACTIVE = "active"
    ARCHIVED = "archived"

