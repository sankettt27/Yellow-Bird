"""
Database seed script — creates demo data for development.
Runs automatically on first startup if the database is empty.
"""

import logging
from sqlalchemy import select

from app.core.database import async_session_factory
from app.core.security import hash_password
from app.models import (
    School, User, Driver, Parent, Bus, Route, BusStop, RouteStop, Student,
)
from app.models.enums import UserRole, BusStatus, DriverStatus

logger = logging.getLogger(__name__)


async def seed_demo_data():
    """Seed the database with demo data if it's empty."""
    async with async_session_factory() as db:
        # Check if data already exists
        result = await db.execute(select(User).limit(1))
        if result.scalar_one_or_none():
            logger.info("📦 Database already has data — skipping seed")
            return

        logger.info("🌱 Seeding demo data...")

        # ─── School ─────────────────────────────────────
        school = School(
            name="Greenfield International School",
            address="123 Education Boulevard, Sector 42",
            city="New Delhi",
            state="Delhi",
            country="India",
            zip_code="110042",
            phone="+91-11-2345-6789",
            email="admin@greenfield.edu.in",
            website="https://greenfield.edu.in",
        )
        db.add(school)
        await db.flush()

        # ─── Super Admin ────────────────────────────────
        super_admin = User(
            email="superadmin@smarttransport.com",
            password_hash=hash_password("admin123"),
            full_name="System Administrator",
            phone="+91-9000000001",
            role=UserRole.SUPER_ADMIN,
            is_active=True,
        )
        db.add(super_admin)

        # ─── School Admin ───────────────────────────────
        school_admin = User(
            email="admin@greenfield.edu.in",
            password_hash=hash_password("admin123"),
            full_name="Priya Sharma",
            phone="+91-9000000002",
            role=UserRole.SCHOOL_ADMIN,
            school_id=school.id,
            is_active=True,
        )
        db.add(school_admin)

        # ─── Drivers ────────────────────────────────────
        driver_users = []
        driver_data = [
            ("Rajesh Kumar", "driver1@greenfield.edu.in", "+91-9100000001"),
            ("Suresh Yadav", "driver2@greenfield.edu.in", "+91-9100000002"),
            ("Mohammed Ali", "driver3@greenfield.edu.in", "+91-9100000003"),
        ]
        for name, email, phone in driver_data:
            user = User(
                email=email,
                password_hash=hash_password("driver123"),
                full_name=name,
                phone=phone,
                role=UserRole.DRIVER,
                school_id=school.id,
                is_active=True,
            )
            db.add(user)
            driver_users.append(user)
        await db.flush()

        # ─── Bus Stops ──────────────────────────────────
        stops_data = [
            ("Main Campus Gate", 28.6139, 77.2090, "Greenfield School Main Gate"),
            ("Sector 42 Market", 28.6180, 77.2150, "Near Metro Station"),
            ("Green Park Colony", 28.6220, 77.2200, "Colony Main Entrance"),
            ("Saket Junction", 28.6260, 77.2260, "Opposite Mall"),
            ("Vasant Vihar Circle", 28.6300, 77.2320, "Near Petrol Pump"),
            ("Dwarka Sector 10", 28.5900, 77.0700, "Dwarka Metro Station"),
            ("Janakpuri Block C", 28.6100, 77.0850, "Community Center"),
            ("Rajouri Garden", 28.6350, 77.1200, "Market Road"),
        ]
        stops = []
        for name, lat, lng, addr in stops_data:
            stop = BusStop(
                school_id=school.id,
                name=name,
                latitude=lat,
                longitude=lng,
                address=addr,
            )
            db.add(stop)
            stops.append(stop)
        await db.flush()

        # ─── Routes ─────────────────────────────────────
        route1 = Route(
            school_id=school.id,
            name="Route A — South Delhi Express",
            description="Covers Saket, Green Park, and Vasant Vihar areas",
            estimated_duration_mins=45,
            estimated_distance_km=18.5,
        )
        route2 = Route(
            school_id=school.id,
            name="Route B — West Delhi Shuttle",
            description="Covers Dwarka, Janakpuri, and Rajouri Garden",
            estimated_duration_mins=55,
            estimated_distance_km=24.0,
        )
        db.add_all([route1, route2])
        await db.flush()

        # ─── Route Stops ────────────────────────────────
        route1_stops = [stops[4], stops[3], stops[2], stops[1], stops[0]]  # Vasant Vihar → Campus
        for seq, stop in enumerate(route1_stops, 1):
            db.add(RouteStop(route_id=route1.id, stop_id=stop.id, sequence_order=seq))

        route2_stops = [stops[5], stops[6], stops[7], stops[0]]  # Dwarka → Campus
        for seq, stop in enumerate(route2_stops, 1):
            db.add(RouteStop(route_id=route2.id, stop_id=stop.id, sequence_order=seq))

        # ─── Buses ───────────────────────────────────────
        buses = []
        bus_data = [
            ("BUS-001", "DL01AB1234", "Tata Starbus", 45, route1),
            ("BUS-002", "DL01CD5678", "Ashok Leyland", 40, route2),
            ("BUS-003", "DL01EF9012", "Force Traveller", 26, None),
        ]
        for num, reg, model, cap, route in bus_data:
            bus = Bus(
                school_id=school.id,
                bus_number=num,
                registration_number=reg,
                model=model,
                capacity=cap,
                assigned_route_id=route.id if route else None,
                status=BusStatus.ACTIVE if route else BusStatus.INACTIVE,
            )
            db.add(bus)
            buses.append(bus)
        await db.flush()

        # ─── Driver Profiles ────────────────────────────
        drivers = []
        for i, user in enumerate(driver_users):
            driver = Driver(
                user_id=user.id,
                license_number=f"DL-{2024001 + i}",
                assigned_bus_id=buses[i].id if i < len(buses) else None,
                status=DriverStatus.AVAILABLE,
                emergency_contact=f"+91-98000000{i+10}",
            )
            db.add(driver)
            drivers.append(driver)
        await db.flush()

        # ─── Parents ────────────────────────────────────
        parent_data = [
            ("Anita Verma", "parent1@gmail.com", "+91-9200000001", "A-101, Green Park Colony"),
            ("Vikram Singh", "parent2@gmail.com", "+91-9200000002", "B-205, Saket Residency"),
        ]
        parents = []
        for name, email, phone, addr in parent_data:
            user = User(
                email=email,
                password_hash=hash_password("parent123"),
                full_name=name,
                phone=phone,
                role=UserRole.PARENT,
                school_id=school.id,
                is_active=True,
            )
            db.add(user)
            await db.flush()

            parent = Parent(
                user_id=user.id,
                address=addr,
            )
            db.add(parent)
            parents.append(parent)
        await db.flush()

        # ─── Students ───────────────────────────────────
        student_data = [
            ("Aarav Verma", "10", "A", "101", parents[0], stops[2], stops[2], buses[0]),
            ("Ishaan Verma", "8", "B", "205", parents[0], stops[2], stops[2], buses[0]),
            ("Riya Singh", "9", "A", "302", parents[1], stops[3], stops[3], buses[0]),
            ("Arjun Singh", "6", "C", "410", parents[1], stops[5], stops[5], buses[1]),
        ]
        for name, cls, sec, roll, parent, pickup, drop, bus in student_data:
            student = Student(
                school_id=school.id,
                parent_id=parent.id,
                full_name=name,
                class_name=cls,
                section=sec,
                roll_number=roll,
                pickup_stop_id=pickup.id,
                drop_stop_id=drop.id,
                assigned_bus_id=bus.id,
            )
            db.add(student)

        await db.commit()
        logger.info("✅ Demo data seeded successfully!")
        logger.info("   📧 Super Admin: superadmin@smarttransport.com / admin123")
        logger.info("   📧 School Admin: admin@greenfield.edu.in / admin123")
        logger.info("   📧 Driver: driver1@greenfield.edu.in / driver123")
        logger.info("   📧 Parent: parent1@gmail.com / parent123")
