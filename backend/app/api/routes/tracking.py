"""
GPS Tracking routes — WebSocket endpoints for driver GPS and subscriber connections,
plus REST endpoints for trip management.
"""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db, async_session_factory
from app.core.security import decode_access_token
from app.models import Trip, Bus, Driver, TripLocation
from app.models.enums import TripStatus, BusStatus, DriverStatus, UserRole
from app.schemas import TripCreate, TripResponse, LocationUpdate, PaginatedResponse
from app.api.deps import get_current_user
from app.models.user import User
from app.models.student import Student
from app.models.parent import Parent
from app.models.route import RouteProgress, RouteStop
from app.core.routing import haversine_distance
from app.websockets.manager import manager
from app.models.notification import Notification
from app.models.enums import NotificationType

router = APIRouter(prefix="/tracking", tags=["GPS Tracking"])


def _calculate_trip_age_hours(started_at: datetime | None) -> float:
    if not started_at:
        return 999.0
    now = datetime.now(timezone.utc)
    started = started_at if started_at.tzinfo is not None else started_at.replace(tzinfo=timezone.utc)
    return (now - started).total_seconds() / 3600


# ─── REST: Trip Lifecycle ────────────────────────────────────

@router.post("/trips/start", response_model=TripResponse)
async def start_trip(
    data: TripCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start a new trip — sets bus and driver to ON_TRIP status.
    If driver already has an active trip, returns the existing one.
    Auto-completes stale trips older than 12 hours."""

    # ─── Guard: check for existing active trip for this driver ─────────────
    existing_result = await db.execute(
        select(Trip)
        .where(
            Trip.driver_id == data.driver_id,
            Trip.status == TripStatus.IN_PROGRESS,
        )
        .order_by(Trip.started_at.desc())
    )
    existing_trips = existing_result.scalars().all()

    if existing_trips:
        # If multiple duplicate active trips exist from past runs, auto-complete older ones
        for extra in existing_trips[1:]:
            extra.status = TripStatus.COMPLETED
            extra.ended_at = datetime.now(timezone.utc)

        latest_trip = existing_trips[0]
        age_hours = _calculate_trip_age_hours(latest_trip.started_at)
        if age_hours < 12:
            # Active trip is fresh — return it (prevents duplicates)
            await db.commit()
            return TripResponse.model_validate(latest_trip)
        else:
            # Stale trip (>12h) — auto-complete it before starting a new one
            latest_trip.status = TripStatus.COMPLETED
            latest_trip.ended_at = datetime.now(timezone.utc)
            await db.flush()
    # ──────────────────────────────────────────────────────────────────────

    # Create trip
    trip = Trip(
        bus_id=data.bus_id,
        driver_id=data.driver_id,
        route_id=data.route_id,
        trip_type=data.trip_type,
        status=TripStatus.IN_PROGRESS,
        started_at=datetime.now(timezone.utc),
    )
    db.add(trip)

    # Update bus status
    bus_result = await db.execute(select(Bus).where(Bus.id == data.bus_id))
    bus = bus_result.scalar_one_or_none()
    if bus:
        bus.status = BusStatus.ON_TRIP

    # Update driver status
    driver_result = await db.execute(select(Driver).where(Driver.id == data.driver_id))
    driver = driver_result.scalar_one_or_none()
    if driver:
        driver.status = DriverStatus.ON_TRIP

    # Initialize Route Progress if bus has an assigned route
    if bus and bus.assigned_route_id:
        progress = RouteProgress(
            trip_id=trip.id,
            route_id=bus.assigned_route_id,
            current_stop_index=0,
            completed_stops=[],
            status="in_progress"
        )
        db.add(progress)

    await db.flush()

    # ─── Create DB notifications for all parents of students on this bus ─────
    if bus:
        students_result = await db.execute(
            select(Student)
            .where(Student.assigned_bus_id == data.bus_id)
            .options(selectinload(Student.parent).selectinload(Parent.user))
        )
        students = students_result.scalars().all()

        bus_number = bus.bus_number
        driver_name = current_user.full_name or "Your driver"

        for student in students:
            if student.parent and student.parent.user_id:
                notif = Notification(
                    school_id=bus.school_id,
                    user_id=student.parent.user_id,
                    trip_id=trip.id,
                    title=f"🚌 Bus {bus_number} has started!",
                    message=(
                        f"The bus for {student.full_name} has started its trip. "
                        f"Driver: {driver_name}. You will be notified when it is near."
                    ),
                    type=NotificationType.TRIP_STARTED,
                    is_read=False,
                )
                db.add(notif)
    # ─────────────────────────────────────────────────────────────────────────

    # Broadcast trip started to any listening parents
    await manager.broadcast_event(
        bus_id=data.bus_id,
        event_type="TRIP_STARTED",
        payload={
            "trip_id": trip.id,
            "bus_number": bus.bus_number if bus else "Unknown",
            "driver_name": current_user.full_name,
            "message": f"Bus {bus.bus_number if bus else ''} has started its trip!"
        }
    )

    await db.commit()
    return TripResponse.model_validate(trip)


@router.post("/trips/{trip_id}/end", response_model=TripResponse)
async def end_trip(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """End an active trip — resets bus and driver status."""
    result = await db.execute(select(Trip).where(Trip.id == trip_id))
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    trip.status = TripStatus.COMPLETED
    trip.ended_at = datetime.now(timezone.utc)

    # Reset bus status
    bus_result = await db.execute(select(Bus).where(Bus.id == trip.bus_id))
    bus = bus_result.scalar_one_or_none()
    if bus:
        bus.status = BusStatus.ACTIVE
        bus.current_speed = 0.0

    # Reset driver status
    driver_result = await db.execute(select(Driver).where(Driver.id == trip.driver_id))
    driver = driver_result.scalar_one_or_none()
    if driver:
        driver.status = DriverStatus.AVAILABLE

    # Clear live location cache so admin/parent don't see stale data
    manager.clear_location(trip.bus_id)

    await db.flush()

    # ─── Create DB notifications for all parents of students on this bus ─────
    if bus:
        students_result = await db.execute(
            select(Student)
            .where(Student.assigned_bus_id == trip.bus_id)
            .options(selectinload(Student.parent))
        )
        students = students_result.scalars().all()

        for student in students:
            if student.parent and student.parent.user_id:
                notif = Notification(
                    school_id=bus.school_id,
                    user_id=student.parent.user_id,
                    trip_id=trip.id,
                    title=f"🏁 Bus {bus.bus_number} trip completed",
                    message=(
                        f"The bus for {student.full_name} has completed its trip. "
                        "Your child should be home soon!"
                    ),
                    type=NotificationType.TRIP_ENDED,
                    is_read=False,
                )
                db.add(notif)
    # ─────────────────────────────────────────────────────────────────────────

    # Broadcast trip ended to any listening parents
    await manager.broadcast_event(
        bus_id=trip.bus_id,
        event_type="TRIP_ENDED",
        payload={
            "trip_id": trip.id,
            "message": "The bus trip has been completed."
        }
    )

    await db.commit()
    return TripResponse.model_validate(trip)


@router.get("/trips/my-active")
async def get_my_active_trip(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current driver's active (in-progress) trip, if any.
    Called by driver frontend on app startup to restore trip state."""
    # Find driver profile for this user
    driver_result = await db.execute(
        select(Driver).where(Driver.user_id == current_user.id)
    )
    driver = driver_result.scalar_one_or_none()
    if not driver:
        return None

    result = await db.execute(
        select(Trip)
        .where(
            Trip.driver_id == driver.id,
            Trip.status == TripStatus.IN_PROGRESS,
        )
        .order_by(Trip.started_at.desc())
    )
    active_trips = result.scalars().all()
    if not active_trips:
        return None

    # Clean up duplicate active trips from past tests
    if len(active_trips) > 1:
        for extra in active_trips[1:]:
            extra.status = TripStatus.COMPLETED
            extra.ended_at = datetime.now(timezone.utc)
        await db.commit()

    latest_trip = active_trips[0]
    # Check age: if older than 12h, it's stale and should be completed
    age_hours = _calculate_trip_age_hours(latest_trip.started_at)
    if age_hours >= 12:
        latest_trip.status = TripStatus.COMPLETED
        latest_trip.ended_at = datetime.now(timezone.utc)
        await db.commit()
        return None

    return TripResponse.model_validate(latest_trip)


@router.get("/trips/active", response_model=list[TripResponse])
async def get_active_trips(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all currently active (in-progress) trips."""
    result = await db.execute(
        select(Trip).where(Trip.status == TripStatus.IN_PROGRESS)
    )
    trips = result.scalars().all()
    return [TripResponse.model_validate(t) for t in trips]


@router.get("/locations/active")
async def get_all_active_locations():
    """Get the latest GPS coordinates for all actively tracked buses."""
    return manager.get_all_active_locations()


# ─── REST: Trip History & Reporting ─────────────────────────

class TripDetailResponse(TripResponse):
    bus_number: str | None = None
    driver_name: str | None = None
    location_count: int = 0


class TripLocationResponse(LocationUpdate):
    id: str
    trip_id: str
    recorded_at: datetime

    model_config = {"from_attributes": True}


@router.get("/trips", response_model=PaginatedResponse)
async def list_trips(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    bus_id: Optional[str] = Query(None),
    driver_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all trips with optional filters. Returns paginated results."""
    query = (
        select(Trip)
        .options(
            selectinload(Trip.bus),
            selectinload(Trip.driver).selectinload(Driver.user),
        )
        .order_by(desc(Trip.created_at))
    )

    if status:
        try:
            query = query.where(Trip.status == TripStatus(status))
        except ValueError:
            pass
    if bus_id:
        query = query.where(Trip.bus_id == bus_id)
    if driver_id:
        query = query.where(Trip.driver_id == driver_id)

    # Count total
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # Paginate
    offset = (page - 1) * page_size
    result = await db.execute(query.offset(offset).limit(page_size))
    trips = result.scalars().all()

    import math
    items = []
    for t in trips:
        item = TripResponse.model_validate(t).model_dump()
        item["bus_number"] = t.bus.bus_number if t.bus else None
        item["driver_name"] = t.driver.user.full_name if t.driver and t.driver.user else None
        items.append(item)

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 0,
    )


@router.get("/trips/{trip_id}")
async def get_trip(
    trip_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single trip with its full GPS location path."""
    result = await db.execute(
        select(Trip)
        .options(
            selectinload(Trip.bus),
            selectinload(Trip.driver).selectinload(Driver.user),
            selectinload(Trip.locations),
        )
        .where(Trip.id == trip_id)
    )
    trip = result.scalar_one_or_none()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    data = TripResponse.model_validate(trip).model_dump()
    data["bus_number"] = trip.bus.bus_number if trip.bus else None
    data["driver_name"] = trip.driver.user.full_name if trip.driver and trip.driver.user else None
    data["location_count"] = len(trip.locations)
    data["locations"] = [
        {
            "id": loc.id,
            "trip_id": loc.trip_id,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "speed": loc.speed,
            "heading": loc.heading,
            "accuracy": loc.accuracy,
            "recorded_at": loc.recorded_at.isoformat(),
        }
        for loc in trip.locations
    ]
    return data


# ─── REST: Parent Bus Tracking ───────────────────────────────

@router.get("/parent-view")
async def get_parent_bus_tracking(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns live GPS positions of buses carrying the parent's children.
    Chain: Parent → Children → assigned_bus → live lat/lng + driver info.
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

    # Get children's buses with driver info
    result = await db.execute(
        select(Student)
        .options(
            selectinload(Student.assigned_bus)
            .selectinload(Bus.assigned_driver)
            .selectinload(Driver.user),
            selectinload(Student.assigned_bus)
            .selectinload(Bus.assigned_route),
        )
        .where(Student.parent_id == parent.id)
    )
    children = result.scalars().all()

    # Deduplicate buses (multiple children may share same bus)
    seen_bus_ids = set()
    buses = []
    for child in children:
        bus = child.assigned_bus
        if not bus or bus.id in seen_bus_ids:
            continue
        seen_bus_ids.add(bus.id)

        driver = bus.assigned_driver
        driver_user = driver.user if driver else None
        route = bus.assigned_route

        buses.append({
            "bus_id": bus.id,
            "bus_number": bus.bus_number,
            "bus_status": bus.status.value if bus.status else None,
            "latitude": bus.current_latitude,
            "longitude": bus.current_longitude,
            "speed": bus.current_speed,
            "driver_name": driver_user.full_name if driver_user else None,
            "driver_phone": driver_user.phone if driver_user else None,
            "route_name": route.name if route else None,
            "children_on_bus": [
                c.full_name for c in children if c.assigned_bus_id == bus.id
            ],
        })

    return {"buses": buses}


# ─── WebSocket: Driver GPS Transmitter ───────────────────────

@router.websocket("/ws/driver/{bus_id}")
async def driver_gps_websocket(websocket: WebSocket, bus_id: str):
    """
    WebSocket endpoint for drivers to send GPS coordinates.
    The driver connects after starting a trip and sends location updates every 3 seconds.

    Expected message format (JSON):
    {
        "latitude": float,
        "longitude": float,
        "speed": float,
        "heading": float,
        "accuracy": float,
        "trip_id": string (optional)
    }
    """
    # Authenticate via query param token
    token = websocket.query_params.get("token", "")
    payload = decode_access_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Invalid token")
        return

    driver_user_id = payload.get("sub", "")
    await manager.connect_driver(websocket, driver_user_id)

    try:
        while True:
            data = await websocket.receive_json()

            # Validate the location data
            location = LocationUpdate(**data)

            # Build broadcast payload
            broadcast_data = {
                "bus_id": bus_id,
                "driver_id": driver_user_id,
                "latitude": location.latitude,
                "longitude": location.longitude,
                "speed": location.speed,
                "heading": location.heading,
                "accuracy": location.accuracy,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            # Persist location and handle route progress (non-blocking in DB)
            if location.trip_id:
                async with async_session_factory() as db_session:
                    # 1. Update bus position
                    bus_result = await db_session.execute(select(Bus).where(Bus.id == bus_id))
                    bus = bus_result.scalar_one_or_none()
                    if bus:
                        bus.current_latitude = location.latitude
                        bus.current_longitude = location.longitude
                        bus.current_speed = location.speed

                    # 2. Persist location history
                    trip_loc = TripLocation(
                        trip_id=location.trip_id,
                        latitude=location.latitude,
                        longitude=location.longitude,
                        speed=location.speed,
                        heading=location.heading,
                        accuracy=location.accuracy,
                        recorded_at=datetime.now(timezone.utc),
                    )
                    db_session.add(trip_loc)

                    # 3. Check route progress (auto-complete stop if within 100m)
                    progress_result = await db_session.execute(
                        select(RouteProgress).where(
                            RouteProgress.trip_id == location.trip_id,
                            RouteProgress.status == "in_progress"
                        )
                    )
                    progress = progress_result.scalar_one_or_none()

                    if progress:
                        # Get ordered route stops
                        stops_result = await db_session.execute(
                            select(RouteStop)
                            .options(selectinload(RouteStop.stop))
                            .where(RouteStop.route_id == progress.route_id)
                            .order_by(RouteStop.sequence_order)
                        )
                        ordered_stops = stops_result.scalars().all()
                        
                        if progress.current_stop_index < len(ordered_stops):
                            next_stop_link = ordered_stops[progress.current_stop_index]
                            
                            # Calculate distance (Haversine)
                            dist_km = haversine_distance(
                                location.latitude, location.longitude,
                                next_stop_link.stop.latitude, next_stop_link.stop.longitude
                            )
                            
                            # Include in broadcast
                            broadcast_data["route_progress"] = {
                                "next_stop_name": next_stop_link.stop.name,
                                "stops_remaining": len(ordered_stops) - progress.current_stop_index,
                                "distance_to_next_km": round(dist_km, 2)
                            }

                            # Auto-complete stop if within 100 meters (0.1 km)
                            if dist_km <= 0.1:
                                completed_list = list(progress.completed_stops or [])
                                completed_list.append({
                                    "stop_id": next_stop_link.stop_id,
                                    "stop_name": next_stop_link.stop.name,
                                    "completed_at": datetime.now(timezone.utc).isoformat(),
                                })
                                progress.completed_stops = completed_list
                                progress.current_stop_index += 1
                                
                                if progress.current_stop_index >= len(ordered_stops):
                                    progress.status = "completed"
                                
                                # We could broadcast a specific STOP_REACHED event here if we wanted

                    await db_session.commit()

            # Broadcast to all subscribers watching this bus (with route_progress if added)
            await manager.broadcast_location(bus_id, broadcast_data)

            # Also send the route progress back to the driver so the dashboard can update
            if "route_progress" in broadcast_data:
                await websocket.send_json({"route_progress": broadcast_data["route_progress"]})

    except WebSocketDisconnect:
        manager.disconnect_driver(driver_user_id)
    except Exception:
        manager.disconnect_driver(driver_user_id)


# ─── WebSocket: Subscriber (Admin/Parent) ────────────────────

@router.websocket("/ws/track_all")
async def websocket_track_all(websocket: WebSocket):
    """
    WebSocket endpoint for admins/map to receive location updates for all active buses.
    """
    await manager.connect_global_subscriber(websocket)
    try:
        while True:
            # We don't expect the subscriber to send data, but we must await to keep connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_global_subscriber(websocket)
    except Exception as e:
        manager.disconnect_global_subscriber(websocket)

@router.websocket("/ws/track/{bus_id}")
async def track_bus_websocket(websocket: WebSocket, bus_id: str):
    """
    WebSocket endpoint for subscribers (admins, parents) to receive
    real-time location updates for a specific bus.
    """
    await manager.connect_subscriber(websocket, bus_id)
    try:
        while True:
            # Keep connection alive — client can send ping or commands
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_subscriber(websocket, bus_id)
    except Exception:
        manager.disconnect_subscriber(websocket, bus_id)
