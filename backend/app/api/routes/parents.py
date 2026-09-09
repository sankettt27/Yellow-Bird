"""
Parent interconnection routes — lets parents see their children's bus, driver, route info.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import io
import openpyxl

from app.core.database import get_db
from app.models.user import User
from app.models.parent import Parent
from app.models.student import Student
from app.models.bus import Bus
from app.models.driver import Driver
from app.models.route import Route, BusStop
from app.models.trip import Trip
from app.models.enums import UserRole, TripStatus
from app.schemas import (
    ParentResponse, ParentBusInfoResponse, ChildBusInfo, StudentResponse,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/parents", tags=["Parents"])


@router.get("/me", response_model=ParentResponse)
async def get_my_parent_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the parent profile for the currently authenticated user."""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Not a parent account")

    result = await db.execute(
        select(Parent).options(selectinload(Parent.user)).where(Parent.user_id == current_user.id)
    )
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")
    return ParentResponse.model_validate(parent)


@router.get("/me/children", response_model=list[StudentResponse])
async def get_my_children(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all children of the current parent."""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Not a parent account")

    # Get parent profile
    result = await db.execute(
        select(Parent).where(Parent.user_id == current_user.id)
    )
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Get children
    result = await db.execute(
        select(Student).where(Student.parent_id == parent.id)
    )
    students = result.scalars().all()
    return [StudentResponse.model_validate(s) for s in students]


@router.get("/me/bus-info", response_model=ParentBusInfoResponse)
async def get_my_bus_info(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Full interconnection view for a parent:
    Parent → Children → Bus → Driver + Route + Stops + Live GPS
    """
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Not a parent account")

    # Get parent
    result = await db.execute(
        select(Parent).where(Parent.user_id == current_user.id)
    )
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent profile not found")

    # Get children with all related entities loaded
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.assigned_bus).selectinload(Bus.assigned_driver).selectinload(Driver.user),
            selectinload(Student.assigned_bus).selectinload(Bus.assigned_route),
            selectinload(Student.pickup_stop),
            selectinload(Student.drop_stop),
            selectinload(Student.school),
        )
        .where(Student.parent_id == parent.id)
    )
    children = result.scalars().all()

    child_infos = []
    for child in children:
        bus = child.assigned_bus
        driver = bus.assigned_driver if bus else None
        driver_user = driver.user if driver else None
        route = bus.assigned_route if bus else None
        pickup = child.pickup_stop
        drop = child.drop_stop

        last_trip_started_at = None
        last_trip_ended_at = None
        if bus:
            trip_res = await db.execute(
                select(Trip)
                .where(Trip.bus_id == bus.id, Trip.status == TripStatus.COMPLETED)
                .order_by(Trip.ended_at.desc().nullslast(), Trip.created_at.desc())
                .limit(1)
            )
            last_trip = trip_res.scalar_one_or_none()
            if last_trip:
                last_trip_started_at = last_trip.started_at
                last_trip_ended_at = last_trip.ended_at

        child_infos.append(ChildBusInfo(
            student_id=child.id,
            student_name=child.full_name,
            class_name=child.class_name,
            section=child.section,
            roll_number=child.roll_number,
            bus_id=bus.id if bus else None,
            bus_number=bus.bus_number if bus else None,
            bus_registration=bus.registration_number if bus else None,
            bus_status=bus.status.value if bus else None,
            driver_name=driver_user.full_name if driver_user else None,
            driver_phone=driver_user.phone if driver_user else None,
            driver_id=driver.id if driver else None,
            route_name=route.name if route else None,
            route_id=route.id if route else None,
            pickup_stop_name=pickup.name if pickup else None,
            pickup_stop_lat=pickup.latitude if pickup else None,
            pickup_stop_lng=pickup.longitude if pickup else None,
            drop_stop_name=drop.name if drop else None,
            drop_stop_lat=drop.latitude if drop else None,
            drop_stop_lng=drop.longitude if drop else None,
            bus_latitude=bus.current_latitude if bus else None,
            bus_longitude=bus.current_longitude if bus else None,
            school_lat=child.school.latitude if child.school else None,
            school_lng=child.school.longitude if child.school else None,
            last_trip_started_at=last_trip_started_at,
            last_trip_ended_at=last_trip_ended_at,
        ))

    return ParentBusInfoResponse(
        parent_name=current_user.full_name,
        children=child_infos,
    )


# ─── Admin: Parent Management ────────────────────────────────

from app.schemas import ParentRegistrationRequest, ParentUpdate, PaginatedResponse
from app.api.deps import require_school_admin
from app.core.security import hash_password
from sqlalchemy import func, or_
import math


@router.get("", response_model=PaginatedResponse)
async def list_parents(
    page: int = 1,
    page_size: int = 20,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """Admin: List all parents with pagination and search."""
    query = (
        select(Parent)
        .options(selectinload(Parent.user))
    )

    # School-admin scoping
    if current_user.role == UserRole.SCHOOL_ADMIN:
        query = query.join(Parent.user).where(User.school_id == current_user.school_id)

    if search:
        pattern = f"%{search}%"
        query = query.join(Parent.user, isouter=True).where(
            or_(
                User.full_name.ilike(pattern),
                User.email.ilike(pattern),
                User.phone.ilike(pattern),
            )
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Parent.created_at.desc())
    result = await db.execute(query)
    parents = result.scalars().unique().all()

    return PaginatedResponse(
        items=[ParentResponse.model_validate(p) for p in parents],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total else 0,
    )


@router.post("", response_model=ParentResponse, status_code=201)
async def create_parent(
    data: ParentRegistrationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """Admin: Register a new parent (creates user + parent profile in one step)."""
    # Check for existing email
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create user account
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=UserRole.PARENT,
        school_id=current_user.school_id,
        is_active=True,
    )
    db.add(user)
    await db.flush()

    # Create parent profile
    parent = Parent(
        user_id=user.id,
        address=data.address,
        alternate_phone=data.alternate_phone,
    )
    db.add(parent)
    await db.commit()

    # Reload with relationships
    result = await db.execute(
        select(Parent).options(selectinload(Parent.user)).where(Parent.id == parent.id)
    )
    parent = result.scalar_one()
    return ParentResponse.model_validate(parent)


@router.patch("/{parent_id}", response_model=ParentResponse)
async def update_parent(
    parent_id: str,
    data: ParentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """Admin: Update parent details (user fields + parent-specific fields)."""
    result = await db.execute(
        select(Parent).options(selectinload(Parent.user)).where(Parent.id == parent_id)
    )
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    # Update user fields
    if data.full_name is not None:
        parent.user.full_name = data.full_name
    if data.phone is not None:
        parent.user.phone = data.phone
    if data.is_active is not None:
        parent.user.is_active = data.is_active

    # Update parent-specific fields
    if data.address is not None:
        parent.address = data.address
    if data.alternate_phone is not None:
        parent.alternate_phone = data.alternate_phone

    await db.commit()

    # Reload
    result = await db.execute(
        select(Parent).options(selectinload(Parent.user)).where(Parent.id == parent_id)
    )
    parent = result.scalar_one()
    return ParentResponse.model_validate(parent)


@router.get("/{parent_id}/connections")
async def get_parent_connections(
    parent_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """
    Admin: View all connections for a specific parent.
    Returns: parent info + children + each child's bus, driver, route, stops.
    """
    result = await db.execute(
        select(Parent).options(selectinload(Parent.user)).where(Parent.id == parent_id)
    )
    parent = result.scalar_one_or_none()
    if not parent:
        raise HTTPException(status_code=404, detail="Parent not found")

    # Get children with all related entities
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.assigned_bus).selectinload(Bus.assigned_driver).selectinload(Driver.user),
            selectinload(Student.assigned_bus).selectinload(Bus.assigned_route),
            selectinload(Student.pickup_stop),
            selectinload(Student.drop_stop),
        )
        .where(Student.parent_id == parent.id)
    )
    children = result.scalars().all()

    child_list = []
    for child in children:
        bus = child.assigned_bus
        driver = bus.assigned_driver if bus else None
        driver_user = driver.user if driver else None
        route = bus.assigned_route if bus else None

        child_list.append({
            "student_id": child.id,
            "student_name": child.full_name,
            "class_name": child.class_name,
            "section": child.section,
            "bus_number": bus.bus_number if bus else None,
            "bus_status": bus.status.value if bus else None,
            "driver_name": driver_user.full_name if driver_user else None,
            "driver_phone": driver_user.phone if driver_user else None,
            "route_name": route.name if route else None,
            "pickup_stop": child.pickup_stop.name if child.pickup_stop else None,
            "drop_stop": child.drop_stop.name if child.drop_stop else None,
        })

    return {
        "parent_id": parent.id,
        "parent_name": parent.user.full_name,
        "parent_email": parent.user.email,
        "parent_phone": parent.user.phone,
        "address": parent.address,
        "children_count": len(children),
        "children": child_list,
    }

@router.post("/upload")
async def upload_parents(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """Admin: Bulk upload parents via Excel file (.xlsx)"""
    if not file.filename.endswith('.xlsx'):
        raise HTTPException(status_code=400, detail="Only .xlsx files are supported")
        
    try:
        from app.core.security import hash_password
        
        contents = await file.read()
        workbook = openpyxl.load_workbook(io.BytesIO(contents), data_only=True)
        sheet = workbook.active
        
        # Define expected columns
        expected_cols = ["Parent Name", "Email", "Password"]
        
        # Read header
        header = [cell.value for cell in sheet[1]]
        
        # Map indices safely
        col_indices = {}
        for expected in expected_cols:
            try:
                # find case-insensitive matching header
                idx = next(i for i, h in enumerate(header) if h and str(h).strip().lower() == expected.lower())
                col_indices[expected] = idx
            except StopIteration:
                raise HTTPException(status_code=400, detail=f"Missing required column: {expected}")
                
        skipped_count = 0
        added_count = 0
        
        for row in sheet.iter_rows(min_row=2, values_only=True):
            # Check if row is empty
            if all(cell is None for cell in row):
                continue
                
            name = row[col_indices["Parent Name"]]
            email = row[col_indices["Email"]]
            password = row[col_indices["Password"]]
            
            if not email or not password or not name:
                continue # Skip rows with missing essential data
                
            email_str = str(email).strip().lower()
            password_str = str(password).strip()
            name_str = str(name).strip()
                
            # Check for existing user by email
            existing = await db.execute(select(User).where(User.email == email_str))
            if existing.scalar_one_or_none():
                skipped_count += 1
                continue
                
            # Create user account
            user = User(
                email=email_str,
                password_hash=hash_password(password_str),
                full_name=name_str,
                role=UserRole.PARENT,
                school_id=current_user.school_id,
                is_active=True,
            )
            db.add(user)
            await db.flush() # flush to get user.id
            
            # Create parent profile
            parent = Parent(
                user_id=user.id,
            )
            db.add(parent)
            
            added_count += 1
            
        await db.commit()
        return {"message": f"Successfully imported {added_count} parents. Skipped {skipped_count} duplicates/existing emails."}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process Excel file: {str(e)}")
