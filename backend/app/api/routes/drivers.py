"""
Driver management CRUD routes + interconnection endpoints.
"""

import math
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.driver import Driver
from app.models.user import User
from app.models.student import Student
from app.models.parent import Parent
from app.models.bus import Bus
from app.models.route import Route
from app.models.enums import UserRole
from app.schemas import (
    DriverCreate, DriverUpdate, DriverResponse, PaginatedResponse,
    DriverRegistrationRequest, DriverConnectionsResponse, DriverStudentInfo,
)
from app.api.deps import get_current_user, require_school_admin
from app.core.security import hash_password

router = APIRouter(prefix="/drivers", tags=["Drivers"])


@router.post("", response_model=DriverResponse)
async def create_driver(
    data: DriverRegistrationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """Register a new driver. Creates a User and links a Driver profile."""
    # Check if email exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create User
    new_user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=UserRole.DRIVER,
        school_id=current_user.school_id,
        is_active=True
    )
    db.add(new_user)
    await db.flush()

    # Create Driver profile
    new_driver = Driver(
        user_id=new_user.id,
        license_number=data.license_number,
        license_expiry=data.license_expiry,
        assigned_bus_id=data.assigned_bus_id,
        emergency_contact=data.emergency_contact
    )
    db.add(new_driver)
    await db.commit()
    await db.refresh(new_driver)

    # Load relationship for response
    result = await db.execute(
        select(Driver).options(selectinload(Driver.user)).where(Driver.id == new_driver.id)
    )
    return DriverResponse.model_validate(result.scalar_one())


@router.get("", response_model=PaginatedResponse)
async def list_drivers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """List drivers with search and pagination."""
    query = select(Driver).join(Driver.user).options(selectinload(Driver.user))

    if current_user.role == UserRole.SCHOOL_ADMIN:
        query = query.where(User.school_id == current_user.school_id)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                User.full_name.ilike(pattern),
                User.phone.ilike(pattern),
                User.email.ilike(pattern),
                Driver.license_number.ilike(pattern),
            )
        )

    if status_filter:
        query = query.where(Driver.status == status_filter)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Driver.created_at.desc())
    result = await db.execute(query)
    drivers = result.scalars().all()

    return PaginatedResponse(
        items=[DriverResponse.model_validate(d) for d in drivers],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/me", response_model=DriverResponse)
async def get_my_driver_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the driver profile for the currently authenticated user."""
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Not a driver")

    result = await db.execute(
        select(Driver).options(selectinload(Driver.user)).where(Driver.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    return DriverResponse.model_validate(driver)


@router.patch("/me", response_model=DriverResponse)
async def update_my_driver_profile(
    data: DriverUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update driver-specific profile fields (license_number, emergency_contact, etc.)."""
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Not a driver")

    result = await db.execute(
        select(Driver).options(selectinload(Driver.user)).where(Driver.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ("license_number", "license_expiry", "emergency_contact"):
            setattr(driver, key, value)

    await db.commit()
    await db.refresh(driver)
    return DriverResponse.model_validate(driver)


@router.get("/me/connections", response_model=DriverConnectionsResponse)
async def get_my_connections(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Full interconnection view for a driver:
    Driver → Bus → Students → Parents + Stops
    """
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Not a driver")

    # Get driver with bus and route
    result = await db.execute(
        select(Driver)
        .options(
            selectinload(Driver.user),
            selectinload(Driver.assigned_bus).selectinload(Bus.assigned_route),
        )
        .where(Driver.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")

    bus = driver.assigned_bus
    route = bus.assigned_route if bus else None

    # Get students on this bus with parents and stops
    students_info = []
    if bus:
        result = await db.execute(
            select(Student)
            .options(
                selectinload(Student.parent).selectinload(Parent.user),
                selectinload(Student.pickup_stop),
                selectinload(Student.drop_stop),
            )
            .where(Student.assigned_bus_id == bus.id)
        )
        students = result.scalars().all()

        for s in students:
            parent = s.parent
            parent_user = parent.user if parent else None
            students_info.append(DriverStudentInfo(
                student_id=s.id,
                student_name=s.full_name,
                class_name=s.class_name,
                section=s.section,
                roll_number=s.roll_number,
                pickup_stop_name=s.pickup_stop.name if s.pickup_stop else None,
                drop_stop_name=s.drop_stop.name if s.drop_stop else None,
                parent_name=parent_user.full_name if parent_user else None,
                parent_phone=parent_user.phone if parent_user else None,
                parent_email=parent_user.email if parent_user else None,
            ))

    return DriverConnectionsResponse(
        driver_name=current_user.full_name,
        bus_number=bus.bus_number if bus else None,
        route_name=route.name if route else None,
        students=students_info,
    )


@router.get("/{driver_id}", response_model=DriverResponse)
async def get_driver(
    driver_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    result = await db.execute(
        select(Driver).options(selectinload(Driver.user)).where(Driver.id == driver_id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return DriverResponse.model_validate(driver)


@router.get("/{driver_id}/connections", response_model=DriverConnectionsResponse)
async def get_driver_connections(
    driver_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """Admin view: see all students/parents connected to a specific driver."""
    result = await db.execute(
        select(Driver)
        .options(
            selectinload(Driver.user),
            selectinload(Driver.assigned_bus).selectinload(Bus.assigned_route),
        )
        .where(Driver.id == driver_id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    bus = driver.assigned_bus
    route = bus.assigned_route if bus else None

    students_info = []
    if bus:
        result = await db.execute(
            select(Student)
            .options(
                selectinload(Student.parent).selectinload(Parent.user),
                selectinload(Student.pickup_stop),
                selectinload(Student.drop_stop),
            )
            .where(Student.assigned_bus_id == bus.id)
        )
        students = result.scalars().all()

        for s in students:
            parent = s.parent
            parent_user = parent.user if parent else None
            students_info.append(DriverStudentInfo(
                student_id=s.id,
                student_name=s.full_name,
                class_name=s.class_name,
                section=s.section,
                roll_number=s.roll_number,
                pickup_stop_name=s.pickup_stop.name if s.pickup_stop else None,
                drop_stop_name=s.drop_stop.name if s.drop_stop else None,
                parent_name=parent_user.full_name if parent_user else None,
                parent_phone=parent_user.phone if parent_user else None,
                parent_email=parent_user.email if parent_user else None,
            ))

    return DriverConnectionsResponse(
        driver_name=driver.user.full_name,
        bus_number=bus.bus_number if bus else None,
        route_name=route.name if route else None,
        students=students_info,
    )


@router.patch("/{driver_id}", response_model=DriverResponse)
async def update_driver(
    driver_id: str,
    data: DriverUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    result = await db.execute(
        select(Driver).options(selectinload(Driver.user)).where(Driver.id == driver_id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(driver, key, value)

    await db.flush()
    return DriverResponse.model_validate(driver)
