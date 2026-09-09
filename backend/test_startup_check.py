import asyncio
import sys
import logging
from httpx import AsyncClient, ASGITransport

logging.basicConfig(level=logging.INFO)

async def test_backend():
    from app.main import app
    from app.core.database import create_tables
    from app.seed import seed_demo_data

    print("--- 1. Testing Database Table Creation ---")
    await create_tables()
    print("SUCCESS: Tables created/verified successfully")

    print("--- 2. Testing Demo Data Seeding ---")
    await seed_demo_data()
    print("SUCCESS: Demo data seeded successfully")

    print("--- 3. Testing FastAPI Lifespan & Endpoints ---")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Test health endpoint
        res = await client.get("/health")
        print(f"GET /health -> Status {res.status_code}: {res.json()}")
        assert res.status_code == 200, "Health check failed"

        # Test login endpoint with admin credentials
        login_res = await client.post("/api/v1/auth/login", json={
            "email": "admin@greenfield.edu.in",
            "password": "admin123"
        })
        print(f"POST /api/v1/auth/login (Admin) -> Status {login_res.status_code}")
        assert login_res.status_code == 200, f"Admin login failed: {login_res.text}"
        print("SUCCESS: Admin login verified")

        # Test login endpoint with driver credentials
        driver_res = await client.post("/api/v1/auth/login", json={
            "email": "driver1@greenfield.edu.in",
            "password": "driver123"
        })
        print(f"POST /api/v1/auth/login (Driver) -> Status {driver_res.status_code}")
        assert driver_res.status_code == 200, f"Driver login failed: {driver_res.text}"
        print("SUCCESS: Driver login verified")

    print("\nALL BACKEND VERIFICATION TESTS PASSED CLEANLY (0 ERRORS)!")

if __name__ == "__main__":
    asyncio.run(test_backend())
