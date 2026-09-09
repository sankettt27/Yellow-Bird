import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import async_session_factory, engine, Base
from app.models.user import User
from app.models.school import School
from app.models.bus import Bus
from app.models.driver import Driver
from app.models.student import Student
from app.models.route import Route, BusStop
from app.models.enums import UserRole, BusStatus, DriverStatus
from app.core.security import hash_password

async def seed_data():
    async with async_session_factory() as db:
        # Check if we already have the demo school
        result = await db.execute(select(School).where(School.name == "Delhi Public School"))
        school = result.scalar_one_or_none()
        
        if not school:
            print("Creating Demo School...")
            school = School(
                name="Delhi Public School",
                address="Sector 12, RK Puram",
                email="admin@dps.edu",
                phone="+91 11 2617 1234"
            )
            db.add(school)
            await db.flush()
        
        # Check if School Admin exists
        result = await db.execute(select(User).where(User.email == "admin@dps.edu"))
        school_admin = result.scalar_one_or_none()
        if not school_admin:
            print("Creating School Admin...")
            school_admin = User(
                email="admin@dps.edu",
                password_hash=hash_password("admin123"),
                full_name="Rajiv Menon",
                phone="+91 98765 43210",
                role=UserRole.SCHOOL_ADMIN,
                school_id=school.id,
                is_active=True
            )
            db.add(school_admin)
            await db.flush()

        # Create Buses
        print("Creating Buses...")
        buses_data = [
            {"bus_number": "BUS-101", "registration": "DL-1PC-4321", "capacity": 40, "model": "Tata Starbus"},
            {"bus_number": "BUS-102", "registration": "DL-1PC-4322", "capacity": 40, "model": "Tata Starbus"},
            {"bus_number": "BUS-205", "registration": "DL-1PC-7654", "capacity": 30, "model": "Ashok Leyland"},
            {"bus_number": "BUS-301", "registration": "DL-1PC-9988", "capacity": 50, "model": "Volvo CityBus", "status": BusStatus.MAINTENANCE},
        ]
        
        buses = []
        for bd in buses_data:
            res = await db.execute(select(Bus).where(Bus.bus_number == bd["bus_number"]))
            b = res.scalar_one_or_none()
            if not b:
                b = Bus(
                    school_id=school.id,
                    bus_number=bd["bus_number"],
                    registration_number=bd["registration"],
                    capacity=bd["capacity"],
                    model=bd["model"],
                    status=bd.get("status", BusStatus.ACTIVE)
                )
                db.add(b)
                buses.append(b)
        await db.flush()
        
        # Create Drivers
        print("Creating Drivers...")
        driver_names = ["Ramesh Kumar", "Suresh Singh", "Amit Yadav"]
        drivers = []
        for i, name in enumerate(driver_names):
            email = f"driver{i+1}@dps.edu"
            res = await db.execute(select(User).where(User.email == email))
            u = res.scalar_one_or_none()
            if not u:
                u = User(
                    email=email,
                    password_hash=hash_password("driver123"),
                    full_name=name,
                    phone=f"+91 98765 1111{i}",
                    role=UserRole.DRIVER,
                    school_id=school.id
                )
                db.add(u)
                await db.flush()
                
                assigned_bus = buses[i].id if i < len(buses) else None
                d = Driver(
                    user_id=u.id,
                    license_number=f"DL-142011{i}999",
                    status=DriverStatus.AVAILABLE,
                    assigned_bus_id=assigned_bus
                )
                db.add(d)
                drivers.append(d)
        await db.flush()

        # Create Routes & Stops
        print("Creating Routes & Stops...")
        res = await db.execute(select(Route).where(Route.name == "Morning - South Ex"))
        r1 = res.scalar_one_or_none()
        if not r1:
            r1 = Route(
                school_id=school.id,
                name="Morning - South Ex",
                description="South Extension to DPS RK Puram",
                estimated_duration_mins=45,
                estimated_distance_km=12.5
            )
            db.add(r1)
            
            r2 = Route(
                school_id=school.id,
                name="Morning - Vasant Kunj",
                description="Vasant Kunj to DPS RK Puram",
                estimated_duration_mins=35,
                estimated_distance_km=8.2
            )
            db.add(r2)
            await db.flush()

            stops = [
                BusStop(school_id=school.id, name="South Ex Part 1", latitude=28.5684, longitude=77.2212),
                BusStop(school_id=school.id, name="AIIMS Metro", latitude=28.5686, longitude=77.2081),
                BusStop(school_id=school.id, name="Green Park Market", latitude=28.5588, longitude=77.2028),
                BusStop(school_id=school.id, name="Vasant Kunj Sector C", latitude=28.5355, longitude=77.1587),
            ]
            for s in stops:
                db.add(s)
            await db.flush()

        # Create Students
        print("Creating Students...")
        students_data = [
            {"name": "Aarav Sharma", "cls": "Grade 5", "sec": "A", "roll": "01"},
            {"name": "Diya Patel", "cls": "Grade 5", "sec": "A", "roll": "14"},
            {"name": "Rohan Verma", "cls": "Grade 6", "sec": "B", "roll": "23"},
            {"name": "Ananya Singh", "cls": "Grade 4", "sec": "C", "roll": "09"},
            {"name": "Ishaan Gupta", "cls": "Grade 8", "sec": "A", "roll": "41"},
            {"name": "Mira Reddy", "cls": "Grade 5", "sec": "B", "roll": "18"},
        ]
        
        for idx, sd in enumerate(students_data):
            res = await db.execute(select(Student).where(Student.full_name == sd["name"]))
            s = res.scalar_one_or_none()
            if not s:
                assigned_bus = buses[idx % 3].id if buses else None
                student = Student(
                    school_id=school.id,
                    full_name=sd["name"],
                    class_name=sd["cls"],
                    section=sd["sec"],
                    roll_number=sd["roll"],
                    assigned_bus_id=assigned_bus
                )
                db.add(student)
        
        await db.commit()
        print("✅ Demo data seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())
