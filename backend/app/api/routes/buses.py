"""
Bus management CRUD routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.exc import IntegrityError

from app.core.database import get_db
from app.models.bus import Bus
from app.models.user import User
from app.models.enums import UserRole
from app.schemas import BusCreate, BusUpdate, BusResponse, PaginatedResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/buses", tags=["Buses"])


@router.get("", response_model=PaginatedResponse)
async def list_buses(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    status: str = Query("", max_length=20),
    school_id: str = Query("", max_length=36),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List buses with filtering and pagination."""
    query = select(Bus)
    count_query = select(func.count()).select_from(Bus)

    # School-scoped access
    if current_user.role == UserRole.SCHOOL_ADMIN:
        query = query.where(Bus.school_id == current_user.school_id)
        count_query = count_query.where(Bus.school_id == current_user.school_id)
    elif school_id:
        query = query.where(Bus.school_id == school_id)
        count_query = count_query.where(Bus.school_id == school_id)

    if search:
        query = query.where(
            Bus.bus_number.ilike(f"%{search}%") | Bus.registration_number.ilike(f"%{search}%")
        )
        count_query = count_query.where(
            Bus.bus_number.ilike(f"%{search}%") | Bus.registration_number.ilike(f"%{search}%")
        )

    if status:
        query = query.where(Bus.status == status)
        count_query = count_query.where(Bus.status == status)

    total = (await db.execute(count_query)).scalar() or 0
    total_pages = (total + page_size - 1) // page_size

    result = await db.execute(
        query.offset((page - 1) * page_size).limit(page_size).order_by(Bus.created_at.desc())
    )
    buses = result.scalars().all()

    return PaginatedResponse(
        items=[BusResponse.model_validate(b) for b in buses],
        total=total, page=page, page_size=page_size, total_pages=total_pages,
    )


@router.get("/{bus_id}", response_model=BusResponse)
async def get_bus(bus_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Bus).where(Bus.id == bus_id))
    bus = result.scalar_one_or_none()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    return BusResponse.model_validate(bus)


@router.post("", response_model=BusResponse, status_code=201)
async def create_bus(data: BusCreate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    bus = Bus(**data.model_dump())
    db.add(bus)
    try:
        await db.flush()
        await db.refresh(bus)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=400, 
            detail="A bus with this registration number already exists."
        )
    return BusResponse.model_validate(bus)


@router.patch("/{bus_id}", response_model=BusResponse)
async def update_bus(bus_id: str, data: BusUpdate, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Bus).where(Bus.id == bus_id))
    bus = result.scalar_one_or_none()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(bus, key, value)
    try:
        await db.flush()
        await db.refresh(bus)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=400, 
            detail="A bus with this registration number already exists."
        )
    return BusResponse.model_validate(bus)


@router.delete("/{bus_id}", status_code=204)
async def delete_bus(bus_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Bus).where(Bus.id == bus_id))
    bus = result.scalar_one_or_none()
    if not bus:
        raise HTTPException(status_code=404, detail="Bus not found")
    await db.delete(bus)
