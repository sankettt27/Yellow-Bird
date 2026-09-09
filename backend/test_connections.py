"""Quick test for parent interconnection endpoints."""
import httpx
import asyncio

API = "http://localhost:8000/api/v1"

async def main():
    async with httpx.AsyncClient() as client:
        # Login as parent
        r = await client.post(f"{API}/auth/login", json={
            "email": "parent1@gmail.com",
            "password": "parent123"
        })
        print(f"Login as parent: {r.status_code}")
        if r.status_code != 200:
            print(f"  Error: {r.text}")
            return
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Test /parents/me
        r = await client.get(f"{API}/parents/me", headers=headers)
        print(f"GET /parents/me: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Parent ID: {data['id']}")

        # Test /parents/me/children
        r = await client.get(f"{API}/parents/me/children", headers=headers)
        print(f"GET /parents/me/children: {r.status_code}")
        if r.status_code == 200:
            children = r.json()
            print(f"  Children count: {len(children)}")
            for c in children:
                print(f"    - {c['full_name']} (Class {c.get('class_name', '?')})")

        # Test /parents/me/bus-info (the big interconnection endpoint)
        r = await client.get(f"{API}/parents/me/bus-info", headers=headers)
        print(f"GET /parents/me/bus-info: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Parent: {data['parent_name']}")
            for child in data["children"]:
                print(f"  ┌─ Student: {child['student_name']} (Class {child.get('class_name', '?')}-{child.get('section', '?')})")
                print(f"  ├─ Bus: {child.get('bus_number', 'N/A')} [{child.get('bus_status', 'N/A')}]")
                print(f"  ├─ Driver: {child.get('driver_name', 'N/A')} | Phone: {child.get('driver_phone', 'N/A')}")
                print(f"  ├─ Route: {child.get('route_name', 'N/A')}")
                print(f"  ├─ Pickup: {child.get('pickup_stop_name', 'N/A')}")
                print(f"  └─ GPS: ({child.get('bus_latitude')}, {child.get('bus_longitude')})")
        else:
            print(f"  Error: {r.text}")

        # Test /tracking/parent-view
        r = await client.get(f"{API}/tracking/parent-view", headers=headers)
        print(f"GET /tracking/parent-view: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            for bus in data["buses"]:
                print(f"  Bus {bus['bus_number']}: ({bus.get('latitude')}, {bus.get('longitude')}) speed={bus.get('speed')}km/h")
                print(f"    Driver: {bus.get('driver_name')} | Children on bus: {bus.get('children_on_bus')}")

        # Now test driver interconnection
        print("\n--- Driver Connections ---")
        r = await client.post(f"{API}/auth/login", json={
            "email": "driver1@greenfield.edu.in",
            "password": "driver123"
        })
        print(f"Login as driver: {r.status_code}")
        if r.status_code != 200:
            print(f"  Error: {r.text}")
            return
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        r = await client.get(f"{API}/drivers/me/connections", headers=headers)
        print(f"GET /drivers/me/connections: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"  Driver: {data['driver_name']}")
            print(f"  Bus: {data.get('bus_number', 'N/A')}")
            print(f"  Route: {data.get('route_name', 'N/A')}")
            for s in data["students"]:
                print(f"  ┌─ Student: {s['student_name']} (Class {s.get('class_name')}-{s.get('section')})")
                print(f"  ├─ Pickup: {s.get('pickup_stop_name', 'N/A')}")
                print(f"  └─ Parent: {s.get('parent_name', 'N/A')} | Phone: {s.get('parent_phone', 'N/A')}")
        else:
            print(f"  Error: {r.text}")

asyncio.run(main())
