"""
Users management routes — CRUD for admin user management.
Accessible by SUPER_ADMIN (all users) and SCHOOL_ADMIN (own school users).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.core.database import get_db
from app.core.security import hash_password
from app.models.user import User
from app.models.driver import Driver
from app.models.parent import Parent
from app.models.enums import UserRole
from app.schemas import UserCreate, UserUpdate, UserResponse, PaginatedResponse
from app.api.deps import get_current_user, require_school_admin

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("", response_model=PaginatedResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    role: str | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """List users with pagination, search, and filters."""
    query = select(User)

    # SCHOOL_ADMIN can only see users of their school
    if current_user.role == UserRole.SCHOOL_ADMIN:
        query = query.where(User.school_id == current_user.school_id)

    if search:
        pattern = f"%{search}%"
        query = query.where(
            or_(
                User.full_name.ilike(pattern),
                User.email.ilike(pattern),
                User.phone.ilike(pattern),
            )
        )

    if role:
        query = query.where(User.role == role)

    if is_active is not None:
        query = query.where(User.is_active == is_active)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    # Paginate
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(User.created_at.desc())
    result = await db.execute(query)
    users = result.scalars().all()

    import math
    return PaginatedResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """Create a new user. School admins can only create users for their own school."""
    # School admins can only create users for their own school
    if current_user.role == UserRole.SCHOOL_ADMIN:
        if data.school_id and data.school_id != current_user.school_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only create users for your own school",
            )
        data = data.model_copy(update={"school_id": current_user.school_id})

    # Check for duplicate email
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists",
        )

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        phone=data.phone,
        role=data.role,
        school_id=data.school_id,
        is_active=data.is_active,
    )
    db.add(user)
    await db.flush()

    # Auto-create linked profile
    if data.role == UserRole.DRIVER:
        db.add(Driver(user_id=user.id))
    elif data.role == UserRole.PARENT:
        db.add(Parent(user_id=user.id))

    await db.flush()
    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """Get a single user by ID."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # School admin scope check
    if current_user.role == UserRole.SCHOOL_ADMIN and user.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Access denied")

    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """Update a user's profile or active status."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # School admin scope check
    if current_user.role == UserRole.SCHOOL_ADMIN and user.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Access denied")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(user, key, value)

    await db.flush()
    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_user(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    """Deactivate a user (soft delete — sets is_active=False)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Cannot deactivate yourself
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    # School admin scope check
    if current_user.role == UserRole.SCHOOL_ADMIN and user.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Access denied")

    user.is_active = False
    await db.flush()
