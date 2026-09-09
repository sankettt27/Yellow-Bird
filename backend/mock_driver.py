"""
Mock Driver GPS Script
Simulates a driver logging in, starting a trip, and streaming GPS coordinates.
Works around the /drivers/me issue by logging in as a School Admin to get a bus,
then starts the trip as a driver user.
"""

import asyncio
import json
import httpx
import websockets
import math

API_BASE = "http://localhost:8000/api/v1"
WS_BASE = "ws://localhost:8000/api/v1"

# Simulate a realistic route around Nashik
ROUTE = [
    (20.0003, 73.7845),   # Rajiv Gandhi Bhavan
    (19.9970, 73.7840),   # CBS
    (19.9850, 73.7750),   # City Centre Mall
    (20.0050, 73.7550),   # College Road
    (20.0150, 73.7600),   # Gangapur Road
    (20.0050, 73.7550),   # Returning
    (19.9850, 73.7750),
    (19.9970, 73.7840),
    (20.0003, 73.7845),   # Back to start
]

async def main():
    print("=" * 50)
    print("  Smart Transport Mock Driver GPS Simulator")
    print("=" * 50)

    async with httpx.AsyncClient(timeout=10.0) as client:
        # 1. Login as School Admin to get a bus
        print("\n[1/4] Logging in as School Admin...")
        r = await client.post(f"{API_BASE}/auth/login", json={
            "email": "admin@dps.edu",
            "password": "admin123"
        })
        if r.status_code != 200:
            print(f"ERROR: Admin login failed: {r.status_code} {r.text}")
            return
        admin_token = r.json()["access_token"]
        print("      Admin login successful.")

        # 2. Get first available active bus
        print("\n[2/4] Fetching available buses...")
        r = await client.get(
            f"{API_BASE}/buses?page=1&page_size=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        buses = r.json().get("items", [])
        active_buses = [b for b in buses if b.get("status") != "MAINTENANCE"]
        if not active_buses:
            print("ERROR: No active buses found. Run seed_demo.py first.")
            return
        bus = active_buses[0]
        bus_id = bus["id"]
        print(f"      Using bus: {bus['bus_number']} ({bus_id[:8]}...)")

        # 3. Get first available driver
        print("\n[3/4] Fetching available drivers...")
        r = await client.get(
            f"{API_BASE}/drivers?page=1&page_size=10",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        drivers = r.json().get("items", [])
        if not drivers:
            print("ERROR: No drivers found. Run seed_demo.py first.")
            return
        driver = drivers[0]
        driver_id = driver["id"]
        print(f"      Using driver: {driver.get('user', {}).get('full_name', 'Unknown')} ({driver_id[:8]}...)")

        # 4. Login as that driver to get a driver token for WebSocket auth
        print("\n      Logging in as driver for WS auth...")
        r = await client.post(f"{API_BASE}/auth/login", json={
            "email": "driver1@dps.edu",
            "password": "driver123"
        })
        if r.status_code != 200:
            print(f"WARN: Driver login failed, using admin token for WS: {r.status_code}")
            driver_token = admin_token
        else:
            driver_token = r.json()["access_token"]
            print("      Driver login successful.")

        # 5. Start a trip
        print("\n[4/4] Starting trip...")
        r = await client.post(
            f"{API_BASE}/tracking/trips/start",
            json={"bus_id": bus_id, "driver_id": driver_id, "trip_type": "MORNING"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if r.status_code not in (200, 201):
            print(f"ERROR: Failed to start trip: {r.status_code} {r.text}")
            return
        trip = r.json()
        trip_id = trip["id"]
        print(f"      Trip started! ID: {trip_id[:8]}...")

    # 6. Connect WebSocket and stream GPS
    ws_url = f"{WS_BASE}/tracking/ws/driver/{bus_id}?token={driver_token}"
    print(f"\n[LIVE] Connecting to WebSocket...")

    try:
        async with websockets.connect(ws_url) as ws:
            print(f"[LIVE] Connected! Streaming GPS around Nashik...\n")
            idx = 0
            while True:
                lat, lng = ROUTE[idx % len(ROUTE)]
                # Add slight jitter to simulate real movement
                lat += (math.sin(idx * 0.5) * 0.0002)
                lng += (math.cos(idx * 0.3) * 0.0002)

                payload = {
                    "latitude": round(lat, 6),
                    "longitude": round(lng, 6),
                    "speed": 35.0 + (math.sin(idx) * 10),  # 25-45 km/h
                    "heading": (idx * 45) % 360,
                    "accuracy": 4.5,
                    "trip_id": trip_id
                }
                await ws.send(json.dumps(payload))
                print(f"  GPS #{idx+1:04d}  Lat:{lat:.5f}  Lng:{lng:.5f}  Speed:{payload['speed']:.0f}km/h")
                idx += 1
                await asyncio.sleep(3)
    except websockets.exceptions.ConnectionClosed as e:
        print(f"\n[DONE] WebSocket closed: {e}")
    except KeyboardInterrupt:
        print("\n[DONE] Simulator stopped by user.")

if __name__ == "__main__":
    asyncio.run(main())
