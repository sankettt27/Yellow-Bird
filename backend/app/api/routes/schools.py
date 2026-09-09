"""
School management CRUD routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models.school import School
from app.models.user import User
from app.models.enums import UserRole
from app.schemas import SchoolCreate, SchoolUpdate, SchoolResponse, PaginatedResponse
from app.api.deps import get_current_user, require_super_admin

router = APIRouter(prefix="/schools", tags=["Schools"])


@router.get("/public")
async def get_public_registered_schools(
    db: AsyncSession = Depends(get_db),
):
    """
    Public endpoint returning active admin-registered schools for selection
    during parent/driver registration & settings profile updates.
    Includes coordinates (latitude, longitude) and logo_url for parent auto-detection.
    """
    result = await db.execute(
        select(School)
        .where(School.is_active == True)
        .order_by(School.name.asc())
    )
    schools = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "city": s.city or "",
            "state": s.state or "",
            "address": s.address or "",
            "latitude": s.latitude,
            "longitude": s.longitude,
            "logo_url": s.logo_url,
            "phone": s.phone,
            "email": s.email,
        }
        for s in schools
    ]


@router.get("", response_model=PaginatedResponse)
async def list_schools(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str = Query("", max_length=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all schools with pagination and search."""
    query = select(School)
    count_query = select(func.count()).select_from(School)

    if search:
        query = query.where(School.name.ilike(f"%{search}%"))
        count_query = count_query.where(School.name.ilike(f"%{search}%"))

    # School admins only see their own school
    if current_user.role == UserRole.SCHOOL_ADMIN:
        query = query.where(School.id == current_user.school_id)
        count_query = count_query.where(School.id == current_user.school_id)

    total = (await db.execute(count_query)).scalar() or 0
    total_pages = (total + page_size - 1) // page_size

    result = await db.execute(
        query.offset((page - 1) * page_size).limit(page_size).order_by(School.created_at.desc())
    )
    schools = result.scalars().all()

    return PaginatedResponse(
        items=[SchoolResponse.model_validate(s) for s in schools],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{school_id}", response_model=SchoolResponse)
async def get_school(
    school_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single school by ID."""
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    return SchoolResponse.model_validate(school)


@router.post("", response_model=SchoolResponse, status_code=201)
async def create_school(
    data: SchoolCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Create a new school (Super Admin only)."""
    school = School(**data.model_dump())
    db.add(school)
    await db.flush()
    return SchoolResponse.model_validate(school)


@router.patch("/{school_id}", response_model=SchoolResponse)
async def update_school(
    school_id: str,
    data: SchoolUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a school's details."""
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(school, key, value)

    await db.flush()
    return SchoolResponse.model_validate(school)


@router.delete("/{school_id}", status_code=204)
async def delete_school(
    school_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_super_admin),
):
    """Delete a school (Super Admin only)."""
    result = await db.execute(select(School).where(School.id == school_id))
    school = result.scalar_one_or_none()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
    await db.delete(school)
