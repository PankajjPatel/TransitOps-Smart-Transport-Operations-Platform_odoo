"""
seed_db — Management command to pre-populate the TransitOps database
with realistic fleet operations data.

Usage:
    python manage.py seed_db
"""

from django.core.management.base import BaseCommand
from fleet.models import (
    Vehicle, Driver, Trip, Maintenance,
    FuelLog, Expense, PlatformUser, PlatformSettings,
)


class Command(BaseCommand):
    help = "Seeds the TransitOps database with sample fleet operations data."

    def handle(self, *args, **options):
        self.stdout.write("[*] Seeding TransitOps database...")

        # ── Vehicles ─────────────────────────────────────────────
        if Vehicle.objects.exists():
            self.stdout.write("  >> Vehicles already seeded -- skipping.")
        else:
            vehicles_data = [
                {"plate": "NY-1102-K", "make": "Freightliner", "model": "Cascadia", "type": "Semi-Truck", "year": 2022, "status": "ACTIVE"},
                {"plate": "TX-3301-M", "make": "Peterbilt", "model": "579", "type": "Semi-Truck", "year": 2023, "status": "ACTIVE"},
                {"plate": "CA-2204-F", "make": "Kenworth", "model": "T680", "type": "Flatbed", "year": 2021, "status": "AVAILABLE"},
                {"plate": "FL-5509-B", "make": "Volvo", "model": "VNL 860", "type": "Semi-Truck", "year": 2024, "status": "AVAILABLE"},
                {"plate": "IL-7703-C", "make": "International", "model": "LT Series", "type": "Box Truck", "year": 2020, "status": "MAINTENANCE"},
                {"plate": "OH-8801-V", "make": "Mack", "model": "Anthem", "type": "Semi-Truck", "year": 2023, "status": "ACTIVE"},
                {"plate": "WA-4406-D", "make": "DAF", "model": "XF", "type": "Cargo Van", "year": 2022, "status": "AVAILABLE"},
                {"plate": "PA-6602-G", "make": "Scania", "model": "R500", "type": "Flatbed", "year": 2021, "status": "ACTIVE"},
            ]
            for v in vehicles_data:
                Vehicle.objects.create(**v)
            self.stdout.write(f"  [OK] Created {len(vehicles_data)} vehicles.")

        # ── Drivers ──────────────────────────────────────────────
        if Driver.objects.exists():
            self.stdout.write("  >> Drivers already seeded -- skipping.")
        else:
            drivers_data = [
                {"name": "Marcus Rivera", "license": "CDL-A-7829", "phone": "+1 (555) 012-3456", "status": "DUTY"},
                {"name": "Sarah Chen", "license": "CDL-A-4510", "phone": "+1 (555) 234-5678", "status": "DUTY"},
                {"name": "James Okafor", "license": "CDL-B-9012", "phone": "+1 (555) 345-6789", "status": "OFF_DUTY"},
                {"name": "Emily Watson", "license": "CDL-A-6233", "phone": "+1 (555) 456-7890", "status": "DUTY"},
                {"name": "David Kim", "license": "CDL-A-1155", "phone": "+1 (555) 567-8901", "status": "DUTY"},
                {"name": "Sofia Martinez", "license": "CDL-B-8877", "phone": "+1 (555) 678-9012", "status": "OFF_DUTY"},
            ]
            for d in drivers_data:
                Driver.objects.create(**d)
            self.stdout.write(f"  [OK] Created {len(drivers_data)} drivers.")

        # ── Trips ────────────────────────────────────────────────
        if Trip.objects.exists():
            self.stdout.write("  >> Trips already seeded -- skipping.")
        else:
            trips_data = [
                {"vehicle_id": 1, "driver_id": 1, "origin": "New York, NY", "destination": "Chicago, IL", "cost": 3200.00, "date": "2026-07-02", "status": "ACTIVE"},
                {"vehicle_id": 2, "driver_id": 2, "origin": "Dallas, TX", "destination": "Los Angeles, CA", "cost": 4100.00, "date": "2026-07-05", "status": "ACTIVE"},
                {"vehicle_id": 6, "driver_id": 4, "origin": "Columbus, OH", "destination": "Miami, FL", "cost": 2800.00, "date": "2026-07-08", "status": "ACTIVE"},
                {"vehicle_id": 8, "driver_id": 5, "origin": "Philadelphia, PA", "destination": "Boston, MA", "cost": 1500.00, "date": "2026-07-10", "status": "ACTIVE"},
                {"vehicle_id": 3, "driver_id": 3, "origin": "San Francisco, CA", "destination": "Portland, OR", "cost": 1900.00, "date": "2026-07-12", "status": "PENDING"},
                {"vehicle_id": 4, "driver_id": 6, "origin": "Jacksonville, FL", "destination": "Atlanta, GA", "cost": 1100.00, "date": "2026-07-15", "status": "PENDING"},
                {"vehicle_id": 1, "driver_id": 1, "origin": "Chicago, IL", "destination": "Denver, CO", "cost": 2600.00, "date": "2026-06-20", "status": "COMPLETED"},
                {"vehicle_id": 2, "driver_id": 2, "origin": "Houston, TX", "destination": "Phoenix, AZ", "cost": 3500.00, "date": "2026-06-15", "status": "COMPLETED"},
                {"vehicle_id": 3, "driver_id": 4, "origin": "Seattle, WA", "destination": "Sacramento, CA", "cost": 2200.00, "date": "2026-05-28", "status": "COMPLETED"},
                {"vehicle_id": 6, "driver_id": 5, "origin": "Cleveland, OH", "destination": "Nashville, TN", "cost": 1800.00, "date": "2026-05-10", "status": "COMPLETED"},
            ]
            for t in trips_data:
                Trip.objects.create(**t)
            self.stdout.write(f"  [OK] Created {len(trips_data)} trips.")

        # ── Maintenance ──────────────────────────────────────────
        if Maintenance.objects.exists():
            self.stdout.write("  >> Maintenance already seeded -- skipping.")
        else:
            maintenance_data = [
                {"vehicle_id": 5, "description": "Engine overhaul and turbo replacement — scheduled 60k service", "cost": 4500.00, "date": "2026-07-01", "status": "IN_PROGRESS"},
                {"vehicle_id": 1, "description": "Brake pad replacement, front and rear axle", "cost": 850.00, "date": "2026-06-20", "status": "COMPLETED"},
                {"vehicle_id": 3, "description": "Transmission fluid change and filter service", "cost": 420.00, "date": "2026-06-10", "status": "COMPLETED"},
                {"vehicle_id": 7, "description": "Annual DOT inspection and safety check", "cost": 300.00, "date": "2026-07-05", "status": "PENDING"},
                {"vehicle_id": 2, "description": "Tire rotation and alignment — all 18 wheels", "cost": 1200.00, "date": "2026-05-15", "status": "COMPLETED"},
                {"vehicle_id": 6, "description": "Coolant flush and thermostat replacement", "cost": 380.00, "date": "2026-04-22", "status": "COMPLETED"},
            ]
            for m in maintenance_data:
                Maintenance.objects.create(**m)
            self.stdout.write(f"  [OK] Created {len(maintenance_data)} maintenance records.")

        # ── Fuel Logs ────────────────────────────────────────────
        if FuelLog.objects.exists():
            self.stdout.write("  >> Fuel logs already seeded -- skipping.")
        else:
            fuel_data = [
                {"vehicle_id": 1, "liters": 320, "cost": 480.00, "date": "2026-07-01", "provider": "Love's Travel Stops"},
                {"vehicle_id": 2, "liters": 290, "cost": 435.00, "date": "2026-07-03", "provider": "Pilot Flying J"},
                {"vehicle_id": 6, "liters": 310, "cost": 465.00, "date": "2026-07-06", "provider": "TA Petro"},
                {"vehicle_id": 8, "liters": 280, "cost": 420.00, "date": "2026-07-09", "provider": "Casey's General"},
                {"vehicle_id": 1, "liters": 340, "cost": 510.00, "date": "2026-06-18", "provider": "Love's Travel Stops"},
                {"vehicle_id": 3, "liters": 260, "cost": 390.00, "date": "2026-06-08", "provider": "Shell Fleet"},
                {"vehicle_id": 2, "liters": 300, "cost": 450.00, "date": "2026-05-25", "provider": "Pilot Flying J"},
                {"vehicle_id": 6, "liters": 275, "cost": 412.50, "date": "2026-05-05", "provider": "TA Petro"},
                {"vehicle_id": 4, "liters": 250, "cost": 375.00, "date": "2026-04-20", "provider": "ExxonMobil"},
                {"vehicle_id": 8, "liters": 330, "cost": 495.00, "date": "2026-03-15", "provider": "Casey's General"},
                {"vehicle_id": 1, "liters": 305, "cost": 457.50, "date": "2026-02-10", "provider": "Love's Travel Stops"},
            ]
            for f in fuel_data:
                FuelLog.objects.create(**f)
            self.stdout.write(f"  [OK] Created {len(fuel_data)} fuel logs.")

        # ── Expenses ─────────────────────────────────────────────
        if Expense.objects.exists():
            self.stdout.write("  >> Expenses already seeded -- skipping.")
        else:
            expenses_data = [
                # Fuel expenses (mirror fuel logs)
                {"vehicle_id": 1, "category": "Fuel", "description": "Diesel refuel — Love's Travel Stops", "cost": 480.00, "date": "2026-07-01"},
                {"vehicle_id": 2, "category": "Fuel", "description": "Diesel refuel — Pilot Flying J", "cost": 435.00, "date": "2026-07-03"},
                {"vehicle_id": 6, "category": "Fuel", "description": "Diesel refuel — TA Petro", "cost": 465.00, "date": "2026-07-06"},
                {"vehicle_id": 8, "category": "Fuel", "description": "Diesel refuel — Casey's General", "cost": 420.00, "date": "2026-07-09"},
                {"vehicle_id": 1, "category": "Fuel", "description": "Diesel refuel — Love's Travel Stops", "cost": 510.00, "date": "2026-06-18"},
                {"vehicle_id": 3, "category": "Fuel", "description": "Diesel refuel — Shell Fleet", "cost": 390.00, "date": "2026-06-08"},
                {"vehicle_id": 2, "category": "Fuel", "description": "Diesel refuel — Pilot Flying J", "cost": 450.00, "date": "2026-05-25"},
                {"vehicle_id": 6, "category": "Fuel", "description": "Diesel refuel — TA Petro", "cost": 412.50, "date": "2026-05-05"},
                {"vehicle_id": 4, "category": "Fuel", "description": "Diesel refuel — ExxonMobil", "cost": 375.00, "date": "2026-04-20"},
                {"vehicle_id": 8, "category": "Fuel", "description": "Diesel refuel — Casey's General", "cost": 495.00, "date": "2026-03-15"},
                {"vehicle_id": 1, "category": "Fuel", "description": "Diesel refuel — Love's Travel Stops", "cost": 457.50, "date": "2026-02-10"},
                # Maintenance expenses (mirror completed maintenance)
                {"vehicle_id": 1, "category": "Maintenance", "description": "Brake pad replacement — front & rear", "cost": 850.00, "date": "2026-06-20"},
                {"vehicle_id": 3, "category": "Maintenance", "description": "Transmission fluid change", "cost": 420.00, "date": "2026-06-10"},
                {"vehicle_id": 2, "category": "Maintenance", "description": "Tire rotation and alignment", "cost": 1200.00, "date": "2026-05-15"},
                {"vehicle_id": 6, "category": "Maintenance", "description": "Coolant flush and thermostat", "cost": 380.00, "date": "2026-04-22"},
                # Insurance expenses
                {"vehicle_id": 1, "category": "Insurance", "description": "Quarterly commercial fleet insurance", "cost": 1800.00, "date": "2026-07-01"},
                {"vehicle_id": 2, "category": "Insurance", "description": "Quarterly commercial fleet insurance", "cost": 1800.00, "date": "2026-07-01"},
                {"vehicle_id": 3, "category": "Insurance", "description": "Annual liability coverage renewal", "cost": 2400.00, "date": "2026-04-01"},
                # Tolls
                {"vehicle_id": 1, "category": "Tolls", "description": "Interstate toll charges — July batch", "cost": 145.00, "date": "2026-07-05"},
                {"vehicle_id": 2, "category": "Tolls", "description": "Texas turnpike & toll roads", "cost": 88.00, "date": "2026-07-06"},
                {"vehicle_id": 6, "category": "Tolls", "description": "Ohio-Florida corridor tolls", "cost": 210.00, "date": "2026-07-09"},
                # Other
                {"vehicle_id": 5, "category": "Other", "description": "GPS tracker replacement unit", "cost": 250.00, "date": "2026-06-28"},
                {"vehicle_id": 7, "category": "Other", "description": "Vehicle wash and detail — quarterly", "cost": 120.00, "date": "2026-06-15"},
            ]
            for e in expenses_data:
                Expense.objects.create(**e)
            self.stdout.write(f"  [OK] Created {len(expenses_data)} expenses.")

        # ── Platform Users ───────────────────────────────────────
        if PlatformUser.objects.exists():
            self.stdout.write("  >> Users already seeded -- skipping.")
        else:
            users_data = [
                {"name": "Girjesh Adarsh", "email": "admin@transitops.com", "role": "Administrator", "status": "ACTIVE"},
                {"name": "Alice Carter", "email": "alice.carter@transitops.com", "role": "Dispatcher", "status": "ACTIVE"},
                {"name": "Bob Franklin", "email": "bob.franklin@transitops.com", "role": "Dispatcher", "status": "ACTIVE"},
                {"name": "Marcus Rivera", "email": "marcus.driver@transitops.com", "role": "Driver", "status": "ACTIVE"},
                {"name": "Sarah Chen", "email": "sarah.driver@transitops.com", "role": "Driver", "status": "ACTIVE"},
                {"name": "James Okafor", "email": "james.driver@transitops.com", "role": "Driver", "status": "INACTIVE"},
            ]
            for u in users_data:
                PlatformUser.objects.create(**u)
            self.stdout.write(f"  [OK] Created {len(users_data)} platform users.")

        # ── Platform Settings ────────────────────────────────────
        if PlatformSettings.objects.exists():
            self.stdout.write("  >> Settings already seeded -- skipping.")
        else:
            defaults = {
                "platformName": "TransitOps",
                "timezone": "GMT+5:30",
                "currency": "USD",
                "companyName": "TransitOps Fleet Solutions",
                "companyEmail": "ops@transitops.com",
                "companyAddress": "100 Enterprise Way, Suite 400, Fleet City",
                "notifyMaintenance": "true",
                "notifyTrip": "true",
                "notifyExpenses": "false",
            }
            for key, value in defaults.items():
                PlatformSettings.objects.create(key=key, value=value)
            self.stdout.write(f"  [OK] Created {len(defaults)} settings keys.")

        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] TransitOps database seeded successfully!"))
