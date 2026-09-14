"""
Pydantic schemas for authentication and user management.
"""

from pydantic import BaseModel, Field
from datetime import datetime
from app.models.enums import UserRole


# ─── Auth ────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str
    password: str = Field(..., min_length=6)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)


# ─── User ────────────────────────────────────────────────────
class UserBase(BaseModel):
    email: str
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str | None = None
    role: UserRole = UserRole.PARENT
    school_id: str | None = None
    is_active: bool = True


class UserCreate(UserBase):
    password: str = Field(..., min_length=6)


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    school_id: str | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    phone: str | None
    avatar_url: str | None
    role: UserRole
    school_id: str | None
    is_active: bool
    last_login: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── School ──────────────────────────────────────────────────
class SchoolBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    address: str | None = None
    city: str | None = None
    state: str | None = None
    country: str = "India"
    zip_code: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    latitude: float | None = None
    longitude: float | None = None


class SchoolCreate(SchoolBase):
    pass


class SchoolUpdate(BaseModel):
    name: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    phone: str | None = None
    email: str | None = None
    website: str | None = None
    logo_url: str | None = None
    is_active: bool | None = None


class SchoolResponse(SchoolBase):
    id: str
    logo_url: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Bus ─────────────────────────────────────────────────────
class BusBase(BaseModel):
    bus_number: str = Field(..., min_length=1, max_length=50)
    registration_number: str | None = None
    model: str | None = None
    capacity: int = Field(default=40, ge=1, le=100)
    status: str | None = "active"


class BusCreate(BusBase):
    school_id: str
    assigned_route_id: str | None = None


class BusUpdate(BaseModel):
    bus_number: str | None = None
    registration_number: str | None = None
    model: str | None = None
    capacity: int | None = None
    assigned_route_id: str | None = None
    status: str | None = None


class BusResponse(BusBase):
    id: str
    school_id: str
    assigned_route_id: str | None
    status: str
    current_speed: float
    current_latitude: float | None
    current_longitude: float | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Driver ──────────────────────────────────────────────────
class DriverCreate(BaseModel):
    user_id: str
    license_number: str | None = None
    license_expiry: str | None = None
    assigned_bus_id: str | None = None
    emergency_contact: str | None = None


class DriverRegistrationRequest(BaseModel):
    email: str
    password: str
    full_name: str
    phone: str | None = None
    license_number: str | None = None
    license_expiry: str | None = None
    assigned_bus_id: str | None = None
    emergency_contact: str | None = None


class DriverUpdate(BaseModel):
    license_number: str | None = None
    license_expiry: str | None = None
    assigned_bus_id: str | None = None
    status: str | None = None
    emergency_contact: str | None = None


class DriverResponse(BaseModel):
    id: str
    user_id: str
    license_number: str | None
    license_expiry: str | None
    assigned_bus_id: str | None
    status: str
    emergency_contact: str | None
    created_at: datetime
    user: UserResponse | None = None

    model_config = {"from_attributes": True}


# ─── Parent ──────────────────────────────────────────────────
class ParentCreate(BaseModel):
    user_id: str
    address: str | None = None
    alternate_phone: str | None = None


class ParentRegistrationRequest(BaseModel):
    """Admin creates a new parent: user account + parent profile in one step."""
    email: str
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=255)
    phone: str | None = None
    address: str | None = None
    alternate_phone: str | None = None


class ParentUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    address: str | None = None
    alternate_phone: str | None = None
    is_active: bool | None = None


class ParentResponse(BaseModel):
    id: str
    user_id: str
    address: str | None
    alternate_phone: str | None
    created_at: datetime
    user: UserResponse | None = None

    model_config = {"from_attributes": True}


# ─── Student ─────────────────────────────────────────────────
class StudentBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    class_name: str | None = None
    section: str | None = None
    roll_number: str | None = None


class StudentCreate(StudentBase):
    school_id: str
    parent_id: str | None = None
    pickup_stop_id: str | None = None
    drop_stop_id: str | None = None
    assigned_bus_id: str | None = None


class StudentUpdate(BaseModel):
    full_name: str | None = None
    class_name: str | None = None
    section: str | None = None
    roll_number: str | None = None
    parent_id: str | None = None
    pickup_stop_id: str | None = None
    drop_stop_id: str | None = None
    assigned_bus_id: str | None = None


class StudentResponse(StudentBase):
    id: str
    school_id: str
    parent_id: str | None
    pickup_stop_id: str | None
    drop_stop_id: str | None
    assigned_bus_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Route ───────────────────────────────────────────────────
class RouteBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: str | None = None
    estimated_duration_mins: float | None = None
    estimated_distance_km: float | None = None


class RouteCreate(RouteBase):
    school_id: str


class RouteUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    estimated_duration_mins: float | None = None
    estimated_distance_km: float | None = None
    is_active: bool | None = None


class RouteResponse(RouteBase):
    id: str
    school_id: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Bus Stop ────────────────────────────────────────────────
class BusStopBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    address: str | None = None


class BusStopCreate(BusStopBase):
    school_id: str


class BusStopUpdate(BaseModel):
    name: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    address: str | None = None


class BusStopResponse(BusStopBase):
    id: str
    school_id: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Route Stop ──────────────────────────────────────────────
class RouteStopCreate(BaseModel):
    route_id: str
    stop_id: str
    sequence_order: int = Field(..., ge=1)
    estimated_arrival: str | None = None


class RouteStopResponse(BaseModel):
    id: str
    route_id: str
    stop_id: str
    sequence_order: int
    estimated_arrival: str | None
    stop: BusStopResponse | None = None

    model_config = {"from_attributes": True}


# ─── Trip ────────────────────────────────────────────────────
class TripCreate(BaseModel):
    bus_id: str
    driver_id: str
    route_id: str | None = None
    trip_type: str = "pickup"


class TripResponse(BaseModel):
    id: str
    bus_id: str
    driver_id: str
    route_id: str | None
    status: str
    trip_type: str
    started_at: datetime | None
    ended_at: datetime | None
    distance_km: float
    avg_speed_kmh: float
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── GPS Location ────────────────────────────────────────────
class LocationUpdate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    speed: float = Field(default=0.0, ge=0)
    heading: float = Field(default=0.0, ge=0, le=360)
    accuracy: float = Field(default=0.0, ge=0)
    trip_id: str | None = None


class LocationBroadcast(BaseModel):
    bus_id: str
    driver_id: str
    latitude: float
    longitude: float
    speed: float
    heading: float
    accuracy: float
    timestamp: str


# ─── Notification ────────────────────────────────────────────
class NotificationResponse(BaseModel):
    id: str
    title: str
    message: str | None
    type: str
    is_read: bool
    trip_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Dashboard Stats ────────────────────────────────────────
class DashboardStats(BaseModel):
    total_schools: int = 0
    total_buses: int = 0
    active_buses: int = 0
    total_drivers: int = 0
    online_drivers: int = 0
    total_students: int = 0
    total_parents: int = 0
    total_routes: int = 0
    today_trips: int = 0
    active_trips: int = 0
    total_distance_km: float = 0.0


# ─── Paginated Response ─────────────────────────────────────
class PaginatedResponse(BaseModel):
    items: list = []
    total: int = 0
    page: int = 1
    page_size: int = 20
    total_pages: int = 0


# ─── Interconnection Schemas ────────────────────────────────
class ChildBusInfo(BaseModel):
    """A student with full bus/driver/route/stop context for parent view."""
    student_id: str
    student_name: str
    class_name: str | None
    section: str | None
    roll_number: str | None
    bus_id: str | None
    bus_number: str | None
    bus_registration: str | None
    bus_status: str | None
    driver_name: str | None
    driver_phone: str | None
    driver_id: str | None
    route_name: str | None
    route_id: str | None
    pickup_stop_name: str | None
    pickup_stop_lat: float | None
    pickup_stop_lng: float | None
    drop_stop_name: str | None
    drop_stop_lat: float | None
    drop_stop_lng: float | None
    bus_latitude: float | None
    bus_longitude: float | None
    school_lat: float | None
    school_lng: float | None
    last_trip_started_at: datetime | None = None
    last_trip_ended_at: datetime | None = None


class ParentBusInfoResponse(BaseModel):
    """Full interconnection view for a parent."""
    parent_name: str
    children: list[ChildBusInfo]


class DriverStudentInfo(BaseModel):
    """A student riding the driver's bus."""
    student_id: str
    student_name: str
    class_name: str | None
    section: str | None
    roll_number: str | None
    pickup_stop_name: str | None
    drop_stop_name: str | None
    parent_name: str | None
    parent_phone: str | None
    parent_email: str | None


class DriverConnectionsResponse(BaseModel):
    """Full interconnection view for a driver."""
    driver_name: str
    bus_number: str | None
    route_name: str | None
    students: list[DriverStudentInfo]


# ─── School Self-Registration ──────────────────────────────
class SendEmailOTPRequest(BaseModel):
    email: str


class VerifyEmailOTPRequest(BaseModel):
    email: str
    otp_code: str


class RegisterSchoolRequest(BaseModel):
    email: str
    otp_code: str
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2, max_length=255)
    school_name: str = Field(..., min_length=2, max_length=255)
    phone: str | None = None

