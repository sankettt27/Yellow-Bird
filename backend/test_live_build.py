import asyncio
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db, async_session_factory
from sqlalchemy import select
from app.models.user import User

client = TestClient(app)

async def test_endpoint():
    async with async_session_factory() as db:
        # Find a driver user
        result = await db.execute(select(User).where(User.role == "DRIVER").limit(1))
        driver_user = result.scalar_one_or_none()
        
        if not driver_user:
            print("No driver found")
            return
            
        print(f"Testing with driver: {driver_user.email}")
        
        # We need a token for this driver, but we can override the dependency
        from app.api.deps import get_current_user
        app.dependency_overrides[get_current_user] = lambda: driver_user
        
        # Test payload
        payload = {
            "trip_id": "dummy-trip-id",
            "stops": [
                {"latitude": 10.0, "longitude": 73.0, "name": "Stop 1"},
                {"latitude": 10.1, "longitude": 73.1, "name": "Stop 2"}
            ]
        }
        
        response = client.post("/api/v1/driver-routes/live-build", json=payload)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 500:
            print("To see the traceback, we'd need to catch the exception here or it's printed above.")

if __name__ == "__main__":
    asyncio.run(test_endpoint())
