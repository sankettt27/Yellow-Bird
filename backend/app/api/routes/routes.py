"""
Routes and Bus Stops management CRUD routes.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.route import Route, BusStop, RouteStop
from app.models.user import User
from app.models.enums import UserRole
from app.schemas import (
    RouteCreate, RouteUpdate, RouteResponse,
    BusStopCreate, BusStopUpdate, BusStopResponse,
    RouteStopCreate, RouteStopResponse, PaginatedResponse
)
from app.api.deps import get_current_user, require_school_admin

router = APIRouter(prefix="/routes", tags=["Routes & Bus Stops"])


# ─── Routes CRUD ──────────────────────────────────────────
@router.get("", response_model=PaginatedResponse)
async def list_routes(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None),
    is_active: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    query = select(Route)
    if current_user.role == UserRole.SCHOOL_ADMIN:
        query = query.where(Route.school_id == current_user.school_id)

    if search:
        query = query.where(Route.name.ilike(f"%{search}%"))

    if is_active is not None:
        query = query.where(Route.is_active == is_active)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size).order_by(Route.created_at.desc())
    result = await db.execute(query)
    routes = result.scalars().all()

    import math
    return PaginatedResponse(
        items=[RouteResponse.model_validate(r) for r in routes],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.post("", response_model=RouteResponse, status_code=status.HTTP_201_CREATED)
async def create_route(
    data: RouteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    if current_user.role == UserRole.SCHOOL_ADMIN:
        data = data.model_copy(update={"school_id": current_user.school_id})

    route = Route(**data.model_dump())
    db.add(route)
    await db.flush()
    return RouteResponse.model_validate(route)


@router.patch("/{route_id}", response_model=RouteResponse)
async def update_route(
    route_id: str,
    data: RouteUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    if current_user.role == UserRole.SCHOOL_ADMIN and route.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Access denied")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(route, key, value)

    await db.flush()
    return RouteResponse.model_validate(route)


@router.delete("/{route_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_route(
    route_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    result = await db.execute(select(Route).where(Route.id == route_id))
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    if current_user.role == UserRole.SCHOOL_ADMIN and route.school_id != current_user.school_id:
        raise HTTPException(status_code=403, detail="Access denied")
    await db.delete(route)


@router.get("/{route_id}/stops", response_model=list[RouteStopResponse])
async def list_route_stops(
    route_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all stops for a specific route, ordered by sequence_order."""
    result = await db.execute(
        select(RouteStop)
        .options(selectinload(RouteStop.stop))
        .where(RouteStop.route_id == route_id)
        .order_by(RouteStop.sequence_order.asc())
    )
    return [RouteStopResponse.model_validate(rs) for rs in result.scalars().all()]


# ─── Bus Stops ─────────────────────────────────────────────
@router.get("/stops/all", response_model=list[BusStopResponse])
async def list_all_stops(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    query = select(BusStop)
    if current_user.role == UserRole.SCHOOL_ADMIN:
        query = query.where(BusStop.school_id == current_user.school_id)
    result = await db.execute(query.order_by(BusStop.name.asc()))
    stops = result.scalars().all()
    return [BusStopResponse.model_validate(s) for s in stops]


@router.post("/stops", response_model=BusStopResponse, status_code=status.HTTP_201_CREATED)
async def create_stop(
    data: BusStopCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_school_admin),
):
    if current_user.role == UserRole.SCHOOL_ADMIN:
        data = data.model_copy(update={"school_id": current_user.school_id})

    stop = BusStop(**data.model_dump())
    db.add(stop)
    await db.flush()
    return BusStopResponse.model_validate(stop)
