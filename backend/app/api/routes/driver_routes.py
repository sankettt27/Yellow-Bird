"""
Driver Route Creation & Management API.
Handles pickup point creation, route drafting, stop ordering, 
route calculation, confirmation, and live progress tracking.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.geocoding import reverse_geocode
from app.core.routing import calculate_road_route, haversine_distance
from app.models import (
    Route, BusStop, RouteStop, RouteProgress,
    Driver, Bus, Student, School, User, Trip,
)
from app.models.enums import UserRole, RouteStatus, TripStatus
from app.api.deps import get_current_user
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/driver-routes", tags=["Driver Route Management"])


# ─── Pydantic Schemas ────────────────────────────────────────────

class PickupPointCreate(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    name: str | None = None  # Optional override; auto-generated from reverse geocoding if blank
    address: str | None = None


class PickupPointResponse(BaseModel):
    id: str
    name: str
    latitude: float
    longitude: float
    address: str | None
    landmark: str | None
    locality: str | None
    city: str | None
    postal_code: str | None
    school_id: str
    created_at: datetime
    model_config = {"from_attributes": True}


class DraftRouteCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: str | None = None


class LiveStopInput(BaseModel):
    latitude: float
    longitude: float
    name: str

class LiveRouteBuildRequest(BaseModel):
    trip_id: str
    stops: list[LiveStopInput]

class StopAddRequest(BaseModel):
    stop_id: str
    sequence_order: int = Field(..., ge=1)


class ReorderRequest(BaseModel):
    stop_ids: list[str]  # Ordered list of stop IDs


class RoutePreviewResponse(BaseModel):
    route_id: str
    name: str
    status: str
    stops: list[dict]
    total_distance_km: float | None
    total_duration_mins: float | None
    route_geometry: str | None
    school: dict | None


class RouteProgressResponse(BaseModel):
    trip_id: str
    route_id: str
    current_stop_index: int
    completed_stops: list
    status: str
    next_stop: dict | None
    prev_stop: dict | None
    stops_remaining: int
    total_stops: int


# ─── Helpers ─────────────────────────────────────────────────────

async def _get_driver_context(db: AsyncSession, current_user: User):
    """Get the driver profile, assigned bus, and school for the current user."""
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Only drivers can access this endpoint")
    
    result = await db.execute(
        select(Driver)
        .options(selectinload(Driver.assigned_bus))
        .where(Driver.user_id == current_user.id)
    )
    driver = result.scalar_one_or_none()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver profile not found")
    if not driver.assigned_bus:
        raise HTTPException(status_code=400, detail="No bus assigned to this driver")
    
    return driver


# ─── Pickup Points ───────────────────────────────────────────────

@router.post("/pickup-points", response_model=PickupPointResponse, status_code=status.HTTP_201_CREATED)
async def create_pickup_point(
    data: PickupPointCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new pickup point from GPS coordinates.
    Automatically reverse-geocodes to get landmark, street, locality.
    """
    driver = await _get_driver_context(db, current_user)
    school_id = driver.assigned_bus.school_id
    
    # Reverse geocode
    geo = await reverse_geocode(data.latitude, data.longitude)
    
    stop = BusStop(
        school_id=school_id,
        name=data.name or geo.get("name", f"Pickup Point ({data.latitude:.4f}, {data.longitude:.4f})"),
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.address or geo.get("display_name"),
        landmark=geo.get("landmark"),
        locality=geo.get("locality"),
        city=geo.get("city"),
        postal_code=geo.get("postal_code"),
        created_by=current_user.id,
    )
    db.add(stop)
    await db.flush()
    
    logger.info(f"Pickup point created: {stop.name} by driver {current_user.full_name}")
    return PickupPointResponse.model_validate(stop)


@router.get("/pickup-points", response_model=list[PickupPointResponse])
async def list_pickup_points(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all pickup points for the driver's school."""
    driver = await _get_driver_context(db, current_user)
    school_id = driver.assigned_bus.school_id
    
    result = await db.execute(
        select(BusStop)
        .where(BusStop.school_id == school_id)
        .order_by(BusStop.created_at.desc())
    )
    stops = result.scalars().all()
    return [PickupPointResponse.model_validate(s) for s in stops]


@router.patch("/pickup-points/{stop_id}", response_model=PickupPointResponse)
async def update_pickup_point(
    stop_id: str,
    data: PickupPointCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an existing pickup point's location. Re-geocodes automatically."""
    await _get_driver_context(db, current_user)
    
    result = await db.execute(select(BusStop).where(BusStop.id == stop_id))
    stop = result.scalar_one_or_none()
    if not stop:
        raise HTTPException(status_code=404, detail="Pickup point not found")
    
    # Re-geocode if coordinates changed
    if stop.latitude != data.latitude or stop.longitude != data.longitude:
        geo = await reverse_geocode(data.latitude, data.longitude)
        stop.latitude = data.latitude
        stop.longitude = data.longitude
        stop.address = data.address or geo.get("display_name")
        stop.landmark = geo.get("landmark")
        stop.locality = geo.get("locality")
        stop.city = geo.get("city")
        stop.postal_code = geo.get("postal_code")
        if not data.name:
            stop.name = geo.get("name", stop.name)
    
    if data.name:
        stop.name = data.name
    
    await db.flush()
    return PickupPointResponse.model_validate(stop)


@router.delete("/pickup-points/{stop_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pickup_point(
    stop_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a pickup point."""
    await _get_driver_context(db, current_user)
    
    result = await db.execute(select(BusStop).where(BusStop.id == stop_id))
    stop = result.scalar_one_or_none()
    if not stop:
        raise HTTPException(status_code=404, detail="Pickup point not found")
    
    await db.delete(stop)
    await db.flush()


# ─── Route Draft Creation ────────────────────────────────────────

@router.post("/draft", status_code=status.HTTP_201_CREATED)
async def create_draft_route(
    data: DraftRouteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new draft route for the driver's bus."""
    driver = await _get_driver_context(db, current_user)
    bus = driver.assigned_bus
    
    route = Route(
        school_id=bus.school_id,
        name=data.name,
        description=data.description,
        status=RouteStatus.DRAFT,
        version=1,
        created_by=current_user.id,
    )
    db.add(route)
    await db.flush()
    
    # Assign route to bus
    bus.assigned_route_id = route.id
    await db.flush()
    
    return {"id": route.id, "name": route.name, "status": route.status.value}


# ─── Route Stop Management ──────────────────────────────────────

@router.post("/{route_id}/stops")
async def add_stop_to_route(
    route_id: str,
    data: StopAddRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Add a pickup point as a stop in the route at a specific sequence position."""
    await _get_driver_context(db, current_user)
    
    # Verify route exists
    result = await db.execute(
        select(Route).options(selectinload(Route.route_stops)).where(Route.id == route_id)
    )
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Verify stop exists
    stop_result = await db.execute(select(BusStop).where(BusStop.id == data.stop_id))
    if not stop_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Pickup point not found")
    
    # Shift existing stops if inserting in the middle
    for rs in route.route_stops:
        if rs.sequence_order >= data.sequence_order:
            rs.sequence_order += 1
    
    route_stop = RouteStop(
        route_id=route_id,
        stop_id=data.stop_id,
        sequence_order=data.sequence_order,
    )
    db.add(route_stop)
    await db.flush()
    
    return {"message": "Stop added", "route_stop_id": route_stop.id}


@router.delete("/{route_id}/stops/{stop_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_stop_from_route(
    route_id: str,
    stop_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Remove a stop from the route. Renumbers remaining stops."""
    await _get_driver_context(db, current_user)
    
    result = await db.execute(
        select(RouteStop).where(RouteStop.route_id == route_id, RouteStop.stop_id == stop_id)
    )
    route_stop = result.scalar_one_or_none()
    if not route_stop:
        raise HTTPException(status_code=404, detail="Route stop not found")
    
    removed_order = route_stop.sequence_order
    await db.delete(route_stop)
    
    # Renumber remaining stops
    remaining = await db.execute(
        select(RouteStop)
        .where(RouteStop.route_id == route_id, RouteStop.sequence_order > removed_order)
    )
    for rs in remaining.scalars().all():
        rs.sequence_order -= 1
    
    await db.flush()


@router.patch("/{route_id}/reorder")
async def reorder_stops(
    route_id: str,
    data: ReorderRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reorder stops according to the provided stop_ids list. Also recalculates route."""
    await _get_driver_context(db, current_user)
    
    result = await db.execute(
        select(Route)
        .options(selectinload(Route.route_stops).selectinload(RouteStop.stop))
        .where(Route.id == route_id)
    )
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Build a lookup of route_stops by stop_id
    rs_by_stop_id = {rs.stop_id: rs for rs in route.route_stops}
    
    for i, stop_id in enumerate(data.stop_ids):
        rs = rs_by_stop_id.get(stop_id)
        if rs:
            rs.sequence_order = i + 1
    
    await db.flush()
    
    # Recalculate route with OSRM
    route_data = await _calculate_and_store_route(db, route)
    
    return {
        "message": "Stops reordered",
        "total_distance_km": route_data.get("total_distance_km"),
        "total_duration_mins": route_data.get("total_duration_mins"),
        "route_geometry": route_data.get("geometry"),
        "source": route_data.get("source"),
    }


async def _calculate_and_store_route(db: AsyncSession, route: Route) -> dict:
    """Calculate road route for all stops + school and store geometry."""
    # Reload stops in order
    result = await db.execute(
        select(RouteStop)
        .options(selectinload(RouteStop.stop))
        .where(RouteStop.route_id == route.id)
        .order_by(RouteStop.sequence_order)
    )
    ordered_stops = result.scalars().all()
    
    if not ordered_stops:
        return {"total_distance_km": 0, "total_duration_mins": 0, "geometry": None, "source": "none"}
    
    # Get school coordinates (last waypoint)
    school_result = await db.execute(select(School).where(School.id == route.school_id))
    school = school_result.scalar_one_or_none()
    
    # Build waypoints: stops in order + school
    waypoints = [(rs.stop.latitude, rs.stop.longitude) for rs in ordered_stops]
    if school and school.latitude and school.longitude:
        waypoints.append((school.latitude, school.longitude))
    
    # Calculate route
    route_data = await calculate_road_route(waypoints)
    
    # Store results
    route.route_geometry = route_data.get("geometry")
    route.estimated_distance_km = route_data.get("total_distance_km")
    route.estimated_duration_mins = route_data.get("total_duration_mins")
    
    # Update per-leg distances on route_stops
    legs = route_data.get("legs", [])
    for i, rs in enumerate(ordered_stops):
        if i < len(legs):
            rs.distance_from_prev_km = legs[i].get("distance_km", 0)
            rs.duration_from_prev_mins = legs[i].get("duration_mins", 0)
    
    await db.flush()
    return route_data


# ─── Route Preview ───────────────────────────────────────────────

@router.get("/{route_id}/preview", response_model=RoutePreviewResponse)
async def preview_route(
    route_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get full route preview with all stops, distances, geometry, and school."""
    result = await db.execute(
        select(Route)
        .options(
            selectinload(Route.route_stops).selectinload(RouteStop.stop),
            selectinload(Route.school),
        )
        .where(Route.id == route_id)
    )
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Get students assigned to each stop
    stops_data = []
    for rs in sorted(route.route_stops, key=lambda x: x.sequence_order):
        # Get students at this stop
        stu_result = await db.execute(
            select(Student).where(Student.pickup_stop_id == rs.stop_id)
        )
        students = stu_result.scalars().all()
        
        stops_data.append({
            "sequence": rs.sequence_order,
            "stop_id": rs.stop_id,
            "route_stop_id": rs.id,
            "name": rs.stop.name,
            "landmark": rs.stop.landmark,
            "locality": rs.stop.locality,
            "latitude": rs.stop.latitude,
            "longitude": rs.stop.longitude,
            "address": rs.stop.address,
            "distance_from_prev_km": rs.distance_from_prev_km,
            "duration_from_prev_mins": rs.duration_from_prev_mins,
            "students": [{"id": s.id, "name": s.full_name, "class": s.class_name} for s in students],
            "student_count": len(students),
        })
    
    school_data = None
    if route.school:
        school_data = {
            "name": route.school.name,
            "latitude": route.school.latitude,
            "longitude": route.school.longitude,
            "address": route.school.address,
        }
    
    return RoutePreviewResponse(
        route_id=route.id,
        name=route.name,
        status=route.status.value,
        stops=stops_data,
        total_distance_km=route.estimated_distance_km,
        total_duration_mins=route.estimated_duration_mins,
        route_geometry=route.route_geometry,
        school=school_data,
    )


# ─── Route Confirmation ─────────────────────────────────────────

@router.post("/{route_id}/confirm")
async def confirm_route(
    route_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Confirm and activate a draft route.
    Validates all stops have coordinates, at least one stop exists.
    """
    driver = await _get_driver_context(db, current_user)
    
    result = await db.execute(
        select(Route)
        .options(selectinload(Route.route_stops).selectinload(RouteStop.stop))
        .where(Route.id == route_id)
    )
    route = result.scalar_one_or_none()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Validation
    errors = []
    if not route.route_stops:
        errors.append("Route has no stops")
    
    for rs in route.route_stops:
        if not rs.stop or not rs.stop.latitude or not rs.stop.longitude:
            errors.append(f"Stop '{rs.stop.name if rs.stop else 'unknown'}' has invalid coordinates")
    
    if errors:
        raise HTTPException(status_code=400, detail={"errors": errors})
    
    # Calculate route if not already done
    if not route.route_geometry:
        await _calculate_and_store_route(db, route)
    
    # Activate route
    route.status = RouteStatus.ACTIVE
    route.is_active = True
    
    # Assign route to driver's bus
    bus = driver.assigned_bus
    bus.assigned_route_id = route.id
    
    await db.flush()
    
    logger.info(f"Route '{route.name}' confirmed and activated by {current_user.full_name}")
    
    return {
        "message": "Route confirmed and activated",
        "route_id": route.id,
        "status": route.status.value,
        "total_stops": len(route.route_stops),
        "total_distance_km": route.estimated_distance_km,
        "total_duration_mins": route.estimated_duration_mins,
    }


# ─── Driver's Active Route ──────────────────────────────────────

@router.get("/my-route")
async def get_my_route(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the driver's currently active route with all stops and geometry."""
    driver = await _get_driver_context(db, current_user)
    bus = driver.assigned_bus
    
    if not bus.assigned_route_id:
        return {"route": None}
    
    result = await db.execute(
        select(Route)
        .options(
            selectinload(Route.route_stops).selectinload(RouteStop.stop),
            selectinload(Route.school),
        )
        .where(Route.id == bus.assigned_route_id)
    )
    route = result.scalar_one_or_none()
    if not route:
        return {"route": None}
    
    stops = []
    for rs in sorted(route.route_stops, key=lambda x: x.sequence_order):
        stops.append({
            "sequence": rs.sequence_order,
            "stop_id": rs.stop_id,
            "name": rs.stop.name,
            "landmark": rs.stop.landmark,
            "locality": rs.stop.locality,
            "latitude": rs.stop.latitude,
            "longitude": rs.stop.longitude,
            "address": rs.stop.address,
            "distance_from_prev_km": rs.distance_from_prev_km,
            "duration_from_prev_mins": rs.duration_from_prev_mins,
        })
    
    school = None
    if route.school:
        school = {
            "name": route.school.name,
            "latitude": route.school.latitude,
            "longitude": route.school.longitude,
        }
    
    return {
        "route": {
            "id": route.id,
            "name": route.name,
            "status": route.status.value,
            "total_distance_km": route.estimated_distance_km,
            "total_duration_mins": route.estimated_duration_mins,
            "route_geometry": route.route_geometry,
            "stops": stops,
            "school": school,
        }
    }


# ─── Route Progress Tracking ────────────────────────────────────

@router.post("/progress/init")
async def init_route_progress(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Initialize route progress for the current active trip.
    Call this when a trip starts and a route is assigned.
    """
    driver = await _get_driver_context(db, current_user)
    bus = driver.assigned_bus
    
    if not bus.assigned_route_id:
        raise HTTPException(status_code=400, detail="No route assigned to bus")
    
    # Find active trip
    trip_result = await db.execute(
        select(Trip).where(
            Trip.bus_id == bus.id,
            Trip.status == TripStatus.IN_PROGRESS,
        )
    )
    trip = trip_result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=400, detail="No active trip found")
    
    # Check if progress already exists
    existing = await db.execute(
        select(RouteProgress).where(RouteProgress.trip_id == trip.id)
    )
    if existing.scalar_one_or_none():
        return {"message": "Route progress already initialized"}
    
    progress = RouteProgress(
        trip_id=trip.id,
        route_id=bus.assigned_route_id,
        current_stop_index=0,
        completed_stops=[],
        status="in_progress",
    )
    db.add(progress)
    await db.flush()
    
    return {"message": "Route progress initialized", "progress_id": progress.id}


@router.post("/progress/complete-stop")
async def complete_current_stop(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Manually mark the current stop as completed.
    Advances to the next stop in sequence.
    """
    driver = await _get_driver_context(db, current_user)
    bus = driver.assigned_bus
    
    # Find active trip's progress
    trip_result = await db.execute(
        select(Trip).where(
            Trip.bus_id == bus.id,
            Trip.status == TripStatus.IN_PROGRESS,
        )
    )
    trip = trip_result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=400, detail="No active trip found")
    
    progress_result = await db.execute(
        select(RouteProgress)
        .where(RouteProgress.trip_id == trip.id)
    )
    progress = progress_result.scalar_one_or_none()
    if not progress:
        raise HTTPException(status_code=400, detail="No route progress found. Initialize first.")
    
    # Get route stops
    stops_result = await db.execute(
        select(RouteStop)
        .options(selectinload(RouteStop.stop))
        .where(RouteStop.route_id == progress.route_id)
        .order_by(RouteStop.sequence_order)
    )
    ordered_stops = stops_result.scalars().all()
    
    if progress.current_stop_index >= len(ordered_stops):
        progress.status = "completed"
        await db.flush()
        return {"message": "All stops completed", "status": "completed"}
    
    # Mark current stop as completed
    current_stop = ordered_stops[progress.current_stop_index]
    completed_list = list(progress.completed_stops or [])
    completed_list.append({
        "stop_id": current_stop.stop_id,
        "stop_name": current_stop.stop.name,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    })
    progress.completed_stops = completed_list
    progress.current_stop_index += 1
    
    # Check if all stops are done
    if progress.current_stop_index >= len(ordered_stops):
        progress.status = "completed"
    
    await db.flush()
    
    # Determine next/prev
    next_stop = None
    if progress.current_stop_index < len(ordered_stops):
        ns = ordered_stops[progress.current_stop_index]
        next_stop = {"name": ns.stop.name, "latitude": ns.stop.latitude, "longitude": ns.stop.longitude}
    
    return {
        "message": "Stop completed",
        "completed_stop": current_stop.stop.name,
        "next_stop": next_stop,
        "stops_remaining": len(ordered_stops) - progress.current_stop_index,
        "current_stop_index": progress.current_stop_index,
    }


@router.get("/progress/{trip_id}", response_model=RouteProgressResponse)
async def get_route_progress(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get route progress for a specific trip."""
    result = await db.execute(
        select(RouteProgress).where(RouteProgress.trip_id == trip_id)
    )
    progress = result.scalar_one_or_none()
    if not progress:
        raise HTTPException(status_code=404, detail="No route progress found for this trip")
    
    # Get stops
    stops_result = await db.execute(
        select(RouteStop)
        .options(selectinload(RouteStop.stop))
        .where(RouteStop.route_id == progress.route_id)
        .order_by(RouteStop.sequence_order)
    )
    ordered_stops = stops_result.scalars().all()
    total_stops = len(ordered_stops)
    
    next_stop = None
    prev_stop = None
    
    if progress.current_stop_index < total_stops:
        ns = ordered_stops[progress.current_stop_index]
        next_stop = {
            "name": ns.stop.name,
            "landmark": ns.stop.landmark,
            "latitude": ns.stop.latitude,
            "longitude": ns.stop.longitude,
            "sequence": ns.sequence_order,
        }
    
    if progress.current_stop_index > 0 and progress.current_stop_index - 1 < total_stops:
        ps = ordered_stops[progress.current_stop_index - 1]
        prev_stop = {
            "name": ps.stop.name,
            "landmark": ps.stop.landmark,
            "latitude": ps.stop.latitude,
            "longitude": ps.stop.longitude,
            "sequence": ps.sequence_order,
        }
    
    return RouteProgressResponse(
        trip_id=progress.trip_id,
        route_id=progress.route_id,
        current_stop_index=progress.current_stop_index,
        completed_stops=progress.completed_stops or [],
        status=progress.status,
        next_stop=next_stop,
        prev_stop=prev_stop,
        stops_remaining=total_stops - progress.current_stop_index,
        total_stops=total_stops,
    )

@router.post("/live-build", status_code=status.HTTP_201_CREATED)
async def create_live_route(
    data: LiveRouteBuildRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submits a sequence of stops created live during a trip.
    Creates BusStops, a new Route, and assigns it to the Bus.
    """
    driver = await _get_driver_context(db, current_user)
    bus = driver.assigned_bus
    
    # 1. Create a new Route
    route_name = f"Live Route {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"
    new_route = Route(
        school_id=bus.school_id,
        name=route_name,
        description="Created dynamically during a trip",
        status=RouteStatus.ACTIVE,
        version=1,
        created_by=current_user.id,
    )
    db.add(new_route)
    await db.flush()
    
    # 2. Create BusStops and link to Route
    ordered_stops = []
    for idx, s in enumerate(data.stops):
        # Create stop
        stop = BusStop(
            school_id=bus.school_id,
            name=s.name,
            latitude=s.latitude,
            longitude=s.longitude,
            created_by=current_user.id,
        )
        db.add(stop)
        await db.flush()
        
        # Link stop to route
        route_stop = RouteStop(
            route_id=new_route.id,
            stop_id=stop.id,
            sequence_order=idx + 1,
        )
        db.add(route_stop)
        ordered_stops.append([stop.latitude, stop.longitude])
        
    # 3. Calculate OSRM route geometry and stats
    if len(ordered_stops) >= 2:
        try:
            route_data = await calculate_road_route(ordered_stops)
            if route_data:
                new_route.estimated_distance_km = route_data["distance"] / 1000
                new_route.estimated_duration_mins = route_data["duration"] / 60
                new_route.route_geometry = route_data["geometry"]
        except Exception as e:
            logger.error(f"OSRM calculation failed for live route: {e}")
            
    # 4. Assign route to bus
    bus.assigned_route_id = new_route.id
    
    # 5. Broadcast new route event to all assigned parents
    from app.websockets.manager import manager
    await manager.broadcast_event(
        bus_id=bus.id,
        event_type="ROUTE_UPDATED",
        payload={
            "message": "The driver has finalized a new route.",
            "route_id": new_route.id,
        }
    )
    
    await db.commit()
    return {"message": "Live route created successfully", "route_id": new_route.id}

@router.get("/geocode")
async def reverse_geocode_endpoint(
    lat: float,
    lng: float,
    current_user: User = Depends(get_current_user)
):
    """Reverse geocode coordinates to find nearest landmark/address."""
    if current_user.role != UserRole.DRIVER:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    result = await reverse_geocode(lat, lng)
    return result
