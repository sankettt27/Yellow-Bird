import asyncio
import httpx

async def test():
    async with httpx.AsyncClient() as client:
        r = await client.post('http://localhost:8000/api/v1/auth/login', json={'email': 'driver1@dps.edu', 'password': 'driver123'})
        print("Login:", r.status_code)
        tok = r.json()['access_token']

        r2 = await client.get('http://localhost:8000/api/v1/drivers/me', headers={'Authorization': f'Bearer {tok}'})
        print("Drivers/me:", r2.status_code, r2.text[:600])

        r3 = await client.get('http://localhost:8000/api/v1/drivers', headers={'Authorization': f'Bearer {tok}'})
        print("Drivers list:", r3.status_code, r3.text[:400])

asyncio.run(test())
