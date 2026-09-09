"""
WebSocket connection manager for real-time GPS tracking broadcasts.
Manages per-bus subscriber channels.
"""

from fastapi import WebSocket
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages WebSocket connections organized by bus_id channels.
    Drivers send location updates, subscribers (admins/parents) receive broadcasts.
    """

    def __init__(self):
        # bus_id -> set of connected WebSocket clients
        self._bus_subscribers: dict[str, set[WebSocket]] = {}
        # driver_user_id -> WebSocket (one connection per driver)
        self._driver_connections: dict[str, WebSocket] = {}
        # In-memory latest location per bus
        self._latest_locations: dict[str, dict] = {}
        # Global subscribers (admins wanting to see all buses)
        self._global_subscribers: set[WebSocket] = set()

    async def connect_subscriber(self, websocket: WebSocket, bus_id: str):
        """Subscribe a client (admin/parent) to a bus's location updates."""
        await websocket.accept()
        if bus_id not in self._bus_subscribers:
            self._bus_subscribers[bus_id] = set()
        self._bus_subscribers[bus_id].add(websocket)
        logger.info(f"Subscriber connected to bus {bus_id}. Total: {len(self._bus_subscribers[bus_id])}")

        # Send latest known location immediately
        if bus_id in self._latest_locations:
            await websocket.send_json(self._latest_locations[bus_id])

    def disconnect_subscriber(self, websocket: WebSocket, bus_id: str):
        """Remove a subscriber from a bus channel."""
        if bus_id in self._bus_subscribers:
            self._bus_subscribers[bus_id].discard(websocket)
            if not self._bus_subscribers[bus_id]:
                del self._bus_subscribers[bus_id]
        logger.info(f"Subscriber disconnected from bus {bus_id}")

    async def connect_global_subscriber(self, websocket: WebSocket):
        """Subscribe a client to ALL bus location updates."""
        await websocket.accept()
        self._global_subscribers.add(websocket)
        logger.info(f"Global subscriber connected. Total: {len(self._global_subscribers)}")
        # Send latest known locations immediately as an array or object
        if self._latest_locations:
            # We can send an initial dump of all active locations
            await websocket.send_json({"type": "INIT", "data": self._latest_locations})

    def disconnect_global_subscriber(self, websocket: WebSocket):
        """Remove a global subscriber."""
        self._global_subscribers.discard(websocket)
        logger.info(f"Global subscriber disconnected")

    async def connect_driver(self, websocket: WebSocket, driver_id: str):
        """Register a driver's WebSocket connection."""
        await websocket.accept()
        self._driver_connections[driver_id] = websocket
        logger.info(f"Driver {driver_id} connected for GPS transmission")

    def disconnect_driver(self, driver_id: str):
        """Remove a driver's WebSocket connection."""
        self._driver_connections.pop(driver_id, None)
        logger.info(f"Driver {driver_id} disconnected")

    async def broadcast_location(self, bus_id: str, location_data: dict):
        """Broadcast a location update to all subscribers of a bus."""
        self._latest_locations[bus_id] = location_data

        if bus_id in self._bus_subscribers:
            dead_connections = set()
            for ws in self._bus_subscribers[bus_id]:
                try:
                    await ws.send_json(location_data)
                except Exception:
                    dead_connections.add(ws)
            for ws in dead_connections:
                self._bus_subscribers[bus_id].discard(ws)

        if self._global_subscribers:
            dead_global = set()
            # Send as an update event so frontend knows it's a single bus update
            update_msg = {"type": "UPDATE", "bus_id": bus_id, "data": location_data}
            for ws in self._global_subscribers:
                try:
                    await ws.send_json(update_msg)
                except Exception:
                    dead_global.add(ws)
            for ws in dead_global:
                self._global_subscribers.discard(ws)

    async def broadcast_event(self, bus_id: str, event_type: str, payload: dict):
        """Broadcast a custom event (like TRIP_STARTED) to subscribers and global admins."""
        event_msg = {"type": event_type, "bus_id": bus_id, "data": payload}
        
        # Send to specific bus subscribers (Parents/Admins watching this bus)
        if bus_id in self._bus_subscribers:
            dead_connections = set()
            for ws in self._bus_subscribers[bus_id]:
                try:
                    await ws.send_json(event_msg)
                except Exception:
                    dead_connections.add(ws)
            for ws in dead_connections:
                self._bus_subscribers[bus_id].discard(ws)
                
        # Send to global subscribers (Tracking Map / Global Admins)
        if self._global_subscribers:
            dead_global = set()
            for ws in self._global_subscribers:
                try:
                    await ws.send_json(event_msg)
                except Exception:
                    dead_global.add(ws)
            for ws in dead_global:
                self._global_subscribers.discard(ws)

    def get_latest_location(self, bus_id: str) -> dict | None:
        """Get the last known location of a bus."""
        return self._latest_locations.get(bus_id)

    def get_all_active_locations(self) -> dict[str, dict]:
        """Get latest locations for all actively tracked buses."""
        return dict(self._latest_locations)

    def get_subscriber_count(self, bus_id: str) -> int:
        """Count subscribers watching a specific bus."""
        return len(self._bus_subscribers.get(bus_id, set()))

    def clear_location(self, bus_id: str):
        """Clear the stored live location for a bus (call when trip ends)."""
        self._latest_locations.pop(bus_id, None)
        logger.info(f"Cleared live location cache for bus {bus_id}")


# Singleton instance
manager = ConnectionManager()
