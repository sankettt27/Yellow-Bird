"""
Debug script: Check why parent notifications aren't being created on trip start.
Run: python debug_notifications.py
"""
import asyncio
from app.core.database import async_session_factory
from sqlalchemy import select, text
from app.models.notification import Notification
from app.models.student import Student
from app.models.parent import Parent
from app.models.bus import Bus
from app.models.user import User
from app.models.trip import Trip

async def main():
    async with async_session_factory() as db:
        print("=" * 60)
        print("1. CHECKING BUS 111...")
        bus_res = await db.execute(select(Bus).where(Bus.bus_number == "BUS 111"))
        bus = bus_res.scalar_one_or_none()
        if not bus:
            bus_res = await db.execute(text("SELECT id, bus_number, school_id FROM buses"))
            buses = bus_res.fetchall()
            print(f"  No 'BUS 111' found. All buses: {buses}")
            return
        print(f"  Bus: id={bus.id}, number={bus.bus_number}, school_id={bus.school_id}")

        print("\n2. CHECKING STUDENTS ON THIS BUS...")
        students_res = await db.execute(
            select(Student).where(Student.assigned_bus_id == bus.id)
        )
        students = students_res.scalars().all()
        if not students:
            print("  ❌ NO STUDENTS ASSIGNED TO THIS BUS!")
            print("  Students in DB:")
            all_students = await db.execute(select(Student))
            for s in all_students.scalars().all():
                print(f"    - {s.full_name}, bus_id={s.assigned_bus_id}, parent_id={s.parent_id}")
            return
        for s in students:
            print(f"  Student: {s.full_name}, parent_id={s.parent_id}")

        print("\n3. CHECKING PARENTS...")
        for student in students:
            if not student.parent_id:
                print(f"  ❌ Student {student.full_name} has NO parent_id!")
                continue
            parent_res = await db.execute(select(Parent).where(Parent.id == student.parent_id))
            parent = parent_res.scalar_one_or_none()
            if not parent:
                print(f"  ❌ Parent record not found for id={student.parent_id}")
                continue
            user_res = await db.execute(select(User).where(User.id == parent.user_id))
            user = user_res.scalar_one_or_none()
            print(f"  Parent user: {user.full_name if user else 'NOT FOUND'}, user_id={parent.user_id}")

        print("\n4. CHECKING RECENT NOTIFICATIONS...")
        notif_res = await db.execute(
            text("SELECT id, user_id, title, type, created_at FROM notifications ORDER BY created_at DESC LIMIT 10")
        )
        notifs = notif_res.fetchall()
        if not notifs:
            print("  ❌ NO NOTIFICATIONS IN DATABASE AT ALL!")
        else:
            for n in notifs:
                print(f"  [{n.type}] '{n.title}' -> user_id={n.user_id} at {n.created_at}")

        print("\n5. CHECKING RECENT TRIPS...")
        trip_res = await db.execute(
            text("SELECT id, bus_id, status, started_at FROM trips ORDER BY started_at DESC LIMIT 5")
        )
        trips = trip_res.fetchall()
        for t in trips:
            print(f"  Trip: id={t.id[:8]}..., bus_id={t.bus_id[:8]}..., status={t.status}, started={t.started_at}")

        print("=" * 60)

asyncio.run(main())
