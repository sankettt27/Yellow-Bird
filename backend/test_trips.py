import httpx, asyncio

async def t():
    async with httpx.AsyncClient() as c:
        # Login as admin
        r = await c.post("http://localhost:8000/api/v1/auth/login", json={"email": "admin@dps.edu", "password": "admin123"})
        tok = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {tok}"}

        # Test new trips endpoint
        r2 = await c.get("http://localhost:8000/api/v1/tracking/trips", headers=headers)
        print("GET /trips:", r2.status_code)
        data = r2.json()
        print(f"  Total trips: {data.get('total', 0)}")
        items = data.get("items", [])
        if items:
            t = items[0]
            print(f"  First trip: bus={t.get('bus_number')} driver={t.get('driver_name')} status={t.get('status')}")

            # Test detail endpoint
            r3 = await c.get(f"http://localhost:8000/api/v1/tracking/trips/{t['id']}", headers=headers)
            print(f"GET /trips/{{id}}: {r3.status_code}")
            detail = r3.json()
            print(f"  GPS points: {detail.get('location_count', 0)}")

asyncio.run(t())
