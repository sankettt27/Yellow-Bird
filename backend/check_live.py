import httpx, asyncio
async def t():
    async with httpx.AsyncClient() as c:
        r = await c.get("http://localhost:8000/api/v1/tracking/locations/active")
        print("Active locations:", r.text[:500])
asyncio.run(t())
