"""
Admin Portal Settings Router — Manages school profile, GPS thresholds, alert rules, and security.
Fully persisted to the Database.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified

from app.core.database import get_db
from app.core.config import get_settings
from app.api.deps import get_current_user, require_role, require_school_admin
from app.models.user import User
from app.models.school import School
from app.models.enums import UserRole

router = APIRouter(prefix="/settings", tags=["Admin Settings"])

# Default system settings fallback
DEFAULT_SETTINGS = {
    "gps_update_interval_seconds": 3,
    "overspeed_limit_kmh": 60.0,
    "geofence_radius_meters": 500,
    "enforce_single_device_session": True,
    "notify_trip_start": True,
    "notify_stop_proximity": True,
    "notify_trip_end": True,
    "enable_email_alerts": True,
    "enable_push_alerts": True,
    "jwt_expire_minutes": 480,
    "require_strong_passwords": True,
    "timezone": "Asia/Kolkata",
}


from pydantic import BaseModel, Field, field_validator


class UpdateSchoolProfileSchema(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    timezone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator("latitude", "longitude", mode="before")
    @classmethod
    def parse_float_fields(cls, v):
        if v is None or v == "" or v == "null":
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return None


class UpdateGPSSettingsSchema(BaseModel):
    gps_update_interval_seconds: Optional[int] = Field(None, ge=1, le=60)
    overspeed_limit_kmh: Optional[float] = Field(None, ge=20.0, le=150.0)
    geofence_radius_meters: Optional[int] = Field(None, ge=50, le=5000)
    enforce_single_device_session: Optional[bool] = None

    @field_validator("gps_update_interval_seconds", "geofence_radius_meters", mode="before")
    @classmethod
    def parse_int_fields(cls, v):
        if v is None or v == "" or v == "null":
            return None
        try:
            return int(v)
        except (ValueError, TypeError):
            return None

    @field_validator("overspeed_limit_kmh", mode="before")
    @classmethod
    def parse_float_fields(cls, v):
        if v is None or v == "" or v == "null":
            return None
        try:
            return float(v)
        except (ValueError, TypeError):
            return None


class UpdateNotificationSettingsSchema(BaseModel):
    notify_trip_start: Optional[bool] = None
    notify_stop_proximity: Optional[bool] = None
    notify_trip_end: Optional[bool] = None
    enable_email_alerts: Optional[bool] = None
    enable_push_alerts: Optional[bool] = None


class FullAdminSettingsUpdateSchema(BaseModel):
    school: Optional[UpdateSchoolProfileSchema] = None
    gps: Optional[UpdateGPSSettingsSchema] = None
    notifications: Optional[UpdateNotificationSettingsSchema] = None


async def _get_or_find_school(db: AsyncSession, current_user: User) -> School:
    """Helper to locate the school for current user, falling back to first active school in DB or creating one if missing."""
    if current_user.school_id:
        res = await db.execute(select(School).where(School.id == current_user.school_id))
        school = res.scalar_one_or_none()
        if school:
            return school

    # Fallback for superadmin or unlinked admin
    res = await db.execute(select(School).where(School.is_active == True).order_by(School.created_at.asc()).limit(1))
    school = res.scalar_one_or_none()

    if not school:
        school = School(
            name="Greenfield International School",
            address="123 Education Boulevard, Sector 42",
            city="New Delhi",
            state="Delhi",
            country="India",
            zip_code="110042",
            phone="+91-11-2345-6789",
            email="admin@greenfield.edu.in",
            website="https://greenfield.edu.in",
            latitude=20.005,
            longitude=73.785,
            is_active=True,
            settings=dict(DEFAULT_SETTINGS),
        )
        db.add(school)
        await db.commit()
        await db.refresh(school)

    if not current_user.school_id:
        current_user.school_id = school.id
        await db.commit()

    return school


@router.get("")
async def get_admin_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """
    Fetch complete settings for the Admin Portal (persisted in DB).
    """
    config_defaults = get_settings()
    school = await _get_or_find_school(db, current_user)

    saved_settings = dict(DEFAULT_SETTINGS)
    if school and school.settings:
        saved_settings.update(school.settings)

    school_info = {
        "id": school.id if school else "",
        "name": school.name if school else "Greenfield International School",
        "address": school.address or "123 Education Boulevard, Sector 42",
        "city": school.city or "New Delhi",
        "state": school.state or "Delhi",
        "country": school.country if school else "India",
        "zip_code": school.zip_code or "110042",
        "phone": school.phone or "+91-11-2345-6789",
        "email": school.email or "admin@greenfield.edu.in",
        "website": school.website or "https://greenfield.edu.in",
        "timezone": saved_settings.get("timezone", "Asia/Kolkata"),
        "latitude": school.latitude if (school and school.latitude is not None) else 20.005,
        "longitude": school.longitude if (school and school.longitude is not None) else 73.785,
    }

    return {
        "school": school_info,
        "gps": {
            "gps_update_interval_seconds": saved_settings.get("gps_update_interval_seconds", config_defaults.GPS_UPDATE_INTERVAL_SECONDS),
            "overspeed_limit_kmh": saved_settings.get("overspeed_limit_kmh", config_defaults.OVERSPEED_LIMIT_KMH),
            "geofence_radius_meters": saved_settings.get("geofence_radius_meters", 500),
            "enforce_single_device_session": saved_settings.get("enforce_single_device_session", True),
        },
        "notifications": {
            "notify_trip_start": saved_settings.get("notify_trip_start", True),
            "notify_stop_proximity": saved_settings.get("notify_stop_proximity", True),
            "notify_trip_end": saved_settings.get("notify_trip_end", True),
            "enable_email_alerts": saved_settings.get("enable_email_alerts", True),
            "enable_push_alerts": saved_settings.get("enable_push_alerts", True),
        },
        "security": {
            "jwt_expire_minutes": saved_settings.get("jwt_expire_minutes", 480),
            "require_strong_passwords": saved_settings.get("require_strong_passwords", True),
            "app_version": config_defaults.APP_VERSION,
        },
    }


@router.put("")
async def update_admin_settings(
    payload: FullAdminSettingsUpdateSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """
    Update Admin Portal settings and persist to database.
    """
    school = await _get_or_find_school(db, current_user)
    if not school:
        raise HTTPException(status_code=404, detail="No active school found to update settings for.")

    # Current settings dict from DB
    current_school_settings = dict(school.settings or {})

    # 1. Update School metadata in DB
    if payload.school:
        if payload.school.name is not None:
            school.name = payload.school.name
        if payload.school.address is not None:
            school.address = payload.school.address
        if payload.school.city is not None:
            school.city = payload.school.city
        if payload.school.state is not None:
            school.state = payload.school.state
        if payload.school.phone is not None:
            school.phone = payload.school.phone
        if payload.school.email is not None:
            school.email = payload.school.email
        if payload.school.website is not None:
            school.website = payload.school.website
        if payload.school.timezone is not None:
            current_school_settings["timezone"] = payload.school.timezone
        if payload.school.latitude is not None:
            school.latitude = payload.school.latitude
        if payload.school.longitude is not None:
            school.longitude = payload.school.longitude

    # 2. Update GPS Settings in JSON
    if payload.gps:
        gps_dict = payload.gps.model_dump(exclude_unset=True)
        current_school_settings.update(gps_dict)

    # 3. Update Notification Settings in JSON
    if payload.notifications:
        notif_dict = payload.notifications.model_dump(exclude_unset=True)
        current_school_settings.update(notif_dict)

    # Assign updated dictionary back to school.settings for SQLAlchemy JSON tracking
    school.settings = dict(current_school_settings)
    flag_modified(school, "settings")

    await db.commit()
    await db.refresh(school)

    return {"message": "Admin Portal settings updated and saved successfully"}

