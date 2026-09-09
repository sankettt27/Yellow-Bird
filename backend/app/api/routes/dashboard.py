"""
Dashboard statistics route — aggregates data for role-specific dashboards.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timezone, timedelta

from app.core.database import get_db
from app.models import School, Bus, User, Driver, Student, Trip, Route
from app.models.enums import UserRole, BusStatus, DriverStatus, TripStatus
from app.schemas import DashboardStats
from app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get aggregate statistics for the dashboard based on user role."""
    stats = DashboardStats()

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    if current_user.role == UserRole.SUPER_ADMIN:
        # Platform-wide stats
        stats.total_schools = (await db.execute(select(func.count()).select_from(School))).scalar() or 0
        stats.total_buses = (await db.execute(select(func.count()).select_from(Bus))).scalar() or 0
        stats.active_buses = (await db.execute(
            select(func.count()).select_from(Bus).where(Bus.status.in_([BusStatus.ACTIVE, BusStatus.ON_TRIP]))
        )).scalar() or 0
        stats.total_drivers = (await db.execute(select(func.count()).select_from(Driver))).scalar() or 0
        stats.online_drivers = (await db.execute(
            select(func.count()).select_from(Driver).where(Driver.status.in_([DriverStatus.AVAILABLE, DriverStatus.ON_TRIP]))
        )).scalar() or 0
        stats.total_students = (await db.execute(select(func.count()).select_from(Student))).scalar() or 0
        stats.total_routes = (await db.execute(select(func.count()).select_from(Route))).scalar() or 0
        stats.today_trips = (await db.execute(
            select(func.count()).select_from(Trip).where(Trip.created_at >= today_start)
        )).scalar() or 0
        stats.active_trips = (await db.execute(
            select(func.count()).select_from(Trip).where(Trip.status == TripStatus.IN_PROGRESS)
        )).scalar() or 0

    elif current_user.role == UserRole.SCHOOL_ADMIN:
        # School-scoped stats
        sid = current_user.school_id
        stats.total_buses = (await db.execute(
            select(func.count()).select_from(Bus).where(Bus.school_id == sid)
        )).scalar() or 0
        stats.active_buses = (await db.execute(
            select(func.count()).select_from(Bus).where(
                Bus.school_id == sid,
                Bus.status.in_([BusStatus.ACTIVE, BusStatus.ON_TRIP])
            )
        )).scalar() or 0
        stats.total_students = (await db.execute(
            select(func.count()).select_from(Student).where(Student.school_id == sid)
        )).scalar() or 0
        stats.total_routes = (await db.execute(
            select(func.count()).select_from(Route).where(Route.school_id == sid)
        )).scalar() or 0

        # Count drivers linked through users in this school
        driver_ids_q = select(User.id).where(User.school_id == sid, User.role == UserRole.DRIVER)
        stats.total_drivers = (await db.execute(
            select(func.count()).select_from(Driver).where(Driver.user_id.in_(driver_ids_q))
        )).scalar() or 0

        # Count parents
        parent_ids_q = select(User.id).where(User.school_id == sid, User.role == UserRole.PARENT)
        stats.total_parents = (await db.execute(
            select(func.count()).select_from(User).where(User.school_id == sid, User.role == UserRole.PARENT)
        )).scalar() or 0

    return stats
