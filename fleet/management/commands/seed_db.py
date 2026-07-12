"""
seed_db — Management command to pre-populate the TransitOps database
with 100% realistic Indian logistics and fleet operations data.

Usage:
    python manage.py seed_db
"""

import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from fleet.models import (
    Vehicle, Driver, Trip, Maintenance,
    FuelLog, Expense, PlatformUser, PlatformSettings,
    VehicleDocument, EmailLog
)

class Command(BaseCommand):
    help = "Seeds the TransitOps database with 100% Indian logistics data."

    def handle(self, *args, **options):
        self.stdout.write("[*] Wiping existing data to ensure 100% Indian dataset...")
        
        # Wipe all records first
        VehicleDocument.objects.all().delete()
        EmailLog.objects.all().delete()
        Vehicle.objects.all().delete()
        Driver.objects.all().delete()
        Trip.objects.all().delete()
        Maintenance.objects.all().delete()
        FuelLog.objects.all().delete()
        Expense.objects.all().delete()
        PlatformUser.objects.all().delete()
        PlatformSettings.objects.all().delete()

        self.stdout.write("[*] Starting seeding TransitOps Indian database...")

        # ── Indian Cities List ────────────────────────────────────
        cities = [
            "Indore", "Bhopal", "Ujjain", "Dewas", "Ratlam", "Jabalpur", "Gwalior", 
            "Mumbai", "Pune", "Nagpur", "Delhi", "Jaipur", "Ahmedabad", "Surat", 
            "Lucknow", "Kanpur", "Hyderabad", "Bengaluru", "Chennai", "Kolkata", 
            "Raipur", "Patna", "Varanasi", "Ranchi", "Noida", "Gurugram"
        ]

        # ── Indian Vehicle Brands & Details ───────────────────────
        # tuple: (Brand/Model, Type, Max Load Capacity (kg), Fuel Tank Capacity (L), Avg Mileage (km/L))
        truck_models = [
            ("Tata Prima 2830.K", "Semi-Truck", 25000, 400, 3.5),
            ("Tata Signa 4825.T", "Semi-Truck", 28000, 365, 4.0),
            ("Ashok Leyland U-3518", "Flatbed", 18000, 300, 4.5),
            ("Ashok Leyland Dost+", "Cargo Van", 1500, 60, 15.0),
            ("Eicher Pro 6025", "Box Truck", 16000, 350, 5.0),
            ("Eicher Pro 2049", "Box Truck", 3500, 90, 11.5),
            ("BharatBenz 2823C", "Semi-Truck", 20000, 380, 4.2),
            ("BharatBenz 3523R", "Flatbed", 24000, 380, 4.0),
            ("Mahindra Bolero Pickup", "Pickup Truck", 1700, 60, 13.0),
            ("Mahindra Blazo X 49", "Semi-Truck", 30000, 415, 3.2),
            ("Force Traveller Delivery", "Cargo Van", 2000, 70, 12.0),
            ("Maruti Suzuki Super Carry", "Pickup Truck", 1000, 30, 16.5),
            ("Toyota Hilux Commercial", "Pickup Truck", 1200, 80, 11.0),
        ]

        # ── Indian Vehicle Registration Plates ───────────────────
        states_rto = ["MH12", "DL01", "MP09", "UP32", "GJ05", "RJ14", "KA51", "HR26", "CG04", "KA03"]
        
        vehicles = []
        # Generate 28 Vehicles (25+ requirement)
        self.stdout.write("[*] Generating 28 vehicles...")
        for i in range(1, 29):
            brand_info = random.choice(truck_models)
            state = random.choice(states_rto)
            series = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=2))
            num = f"{random.randint(1000, 9999)}"
            plate = f"{state}{series}{num}"
            
            # ensure plate uniqueness
            while Vehicle.objects.filter(plate=plate).exists():
                series = "".join(random.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ", k=2))
                num = f"{random.randint(1000, 9999)}"
                plate = f"{state}{series}{num}"

            purchase_days_ago = random.randint(100, 1000)
            purchase_date = (datetime.now() - timedelta(days=purchase_days_ago)).date()
            ins_expiry = (datetime.now() + timedelta(days=random.randint(-15, 300))).date() # some might be expired or close
            fit_expiry = (datetime.now() + timedelta(days=random.randint(20, 400))).date()
            pol_expiry = (datetime.now() + timedelta(days=random.randint(10, 180))).date()
            
            status = random.choice(["AVAILABLE", "AVAILABLE", "AVAILABLE", "AVAILABLE", "MAINTENANCE", "RETIRED"])
            if i <= 8: # Keep first few vehicles status ACTIVE/ON_TRIP for active trip demo mapping
                status = "AVAILABLE"
                
            depot_loc = random.choice(["Indore Transport Nagar", "Bhopal Depot", "Delhi Logistics Hub", "Mumbai Central Warehouse", "Pune Distribution Center"])
            
            v = Vehicle.objects.create(
                plate=plate,
                name=f"{brand_info[0]} - {plate}",
                make=brand_info[0].split()[0],
                model=" ".join(brand_info[0].split()[1:]),
                type=brand_info[1],
                year=random.randint(2018, 2025),
                max_load=brand_info[2],
                fuel_type="Diesel" if "Carry" not in brand_info[0] else "CNG",
                fuel_capacity=brand_info[3],
                average_mileage=brand_info[4],
                odometer=random.randint(20000, 180000),
                purchase_cost=random.randint(400000, 4500000),
                purchase_date=purchase_date,
                insurance_expiry=ins_expiry,
                fitness_expiry=fit_expiry,
                pollution_expiry=pol_expiry,
                depot=depot_loc,
                status=status,
                remarks="Indian Fleet vehicle"
            )
            vehicles.append(v)
            
            # Seed compliance documents
            VehicleDocument.objects.create(
                vehicle=v,
                name="Insurance Policy Certificate",
                document_type="Insurance",
                expiry_date=ins_expiry,
                file_path=f"compliance/documents/ins_{plate}.pdf"
            )
            VehicleDocument.objects.create(
                vehicle=v,
                name="Pollution Under Control (PUC)",
                document_type="Pollution",
                expiry_date=pol_expiry,
                file_path=f"compliance/documents/puc_{plate}.pdf"
            )
            VehicleDocument.objects.create(
                vehicle=v,
                name="Fitness Certificate (Form 38)",
                document_type="Fitness",
                expiry_date=fit_expiry,
                file_path=f"compliance/documents/fit_{plate}.pdf"
            )
        
        self.stdout.write(f"  [OK] Generated {len(vehicles)} vehicles.")

        # ── Indian Driver Profiles ────────────────────────────────
        indian_names = [
            "Rahul Sharma", "Amit Patel", "Rohit Verma", "Pankaj Patel", "Deepak Yadav", 
            "Vikas Singh", "Ajay Kumar", "Suresh Prajapati", "Ankit Jain", "Nitesh Mishra",
            "Rajesh Kumar", "Sanjay Dutt", "Vijay Yadav", "Rakesh Chouhan", "Gaurav Sen",
            "Manish Tiwari", "Sunil Joshi", "Manoj Rathore", "Karan Sharma", "Arjun Singh",
            "Sandip Patil", "Ramesh Shinde", "Dilip Kumar", "Satish Yadav", "Piyush Jain",
            "Ashish Gupta", "Nitin Deshmukh", "Rajendra Prasad", "Devendra Yadav", "Harish Patel",
            "Vivek Dubey", "Sachin Patil", "Yashwant Rao", "Abhishek Singh", "Tarun Verma",
            "Pradeep Mishra", "Jitendra Solanki", "Lalit Sharma", "Vinod Yadav", "Hemant Kumar",
            "Anil Prajapati", "Dinesh Khatri"
        ]

        drivers = []
        # Generate 42 Drivers (40+ requirement)
        self.stdout.write("[*] Generating 42 drivers...")
        for i, name in enumerate(indian_names[:42]):
            phone_num = f"+91 {random.choice([98260, 98765, 94250, 70001, 88899])}{random.randint(10000, 99999)}"
            license_num = f"DL-CDL-{random.randint(100000, 999999)}"
            lic_expiry = (datetime.now() + timedelta(days=random.randint(-10, 300))).date()
            join_date = (datetime.now() - timedelta(days=random.randint(50, 800))).date()
            
            status = random.choice(["AVAILABLE", "AVAILABLE", "AVAILABLE", "OFF_DUTY", "SUSPENDED"])
            if i < 8:
                status = "AVAILABLE"

            d = Driver.objects.create(
                name=name,
                phone=phone_num,
                email=f"{name.lower().replace(' ', '.')}@transitops.in",
                address=f"Plot {random.randint(10, 150)}, Transport Nagar, Indore, Madhya Pradesh",
                license=license_num,
                license_category=random.choice(["LMV", "HMV"]),
                license_expiry=lic_expiry,
                joining_date=join_date,
                experience=random.randint(2, 22),
                safety_score=random.randint(70, 98),
                status=status
            )
            drivers.append(d)
        
        self.stdout.write(f"  [OK] Generated {len(drivers)} drivers.")

        # ── Setup Relationships (Assigned Drivers/Vehicles) ───────
        self.stdout.write("[*] Establishing default vehicle/driver assignments...")
        for idx in range(min(len(vehicles), len(drivers))):
            v = vehicles[idx]
            d = drivers[idx]
            v.assigned_driver_id = d.id
            v.save()
            d.assigned_vehicle_id = v.id
            d.save()

        # ── Trips ─────────────────────────────────────────────────
        trips = []
        # Generate 65 Trips (60+ requirement)
        self.stdout.write("[*] Generating 65 trips distributed over past 6 months...")
        
        # Start date: 150 days ago
        base_time = datetime.now() - timedelta(days=150)
        
        for i in range(1, 66):
            # Select random vehicle and its driver
            v = random.choice(vehicles)
            d = Driver.objects.filter(assigned_vehicle_id=v.id).first()
            if not d:
                d = random.choice(drivers)
                
            orig = random.choice(cities)
            dest = random.choice(cities)
            while dest == orig:
                dest = random.choice(cities)
                
            cargo = random.randint(500, int(v.max_load))
            dist = random.randint(50, 1200)
            cost = int(dist * random.uniform(30.0, 65.0)) # ₹30 to ₹65 per KM
            
            trip_date = (base_time + timedelta(days=int(i * 2.3) + random.randint(0, 1))).date()
            
            # Ensure the last few trips are active/pending relative to today for live dashboard presentation
            if i >= 62:
                status = "DISPATCHED"
                trip_date = datetime.now().date()
            elif i >= 60:
                status = "PENDING"
                trip_date = (datetime.now() + timedelta(days=1)).date()
            else:
                status = random.choice(["COMPLETED", "COMPLETED", "COMPLETED", "CANCELLED"])
                
            # If status DISPATCHED, set vehicle and driver to ON_TRIP
            if status == "DISPATCHED":
                v.status = "ON_TRIP"
                v.save()
                d.status = "ON_TRIP"
                d.save()

            t = Trip.objects.create(
                vehicle_id=v.id,
                driver_id=d.id,
                origin=orig,
                destination=dest,
                cargo_weight=cargo,
                planned_distance=dist,
                dispatch_date=trip_date if status == "DISPATCHED" else None,
                arrival_date=(trip_date + timedelta(days=1)) if status == "COMPLETED" else None,
                cost=cost,
                date=trip_date,
                status=status,
                remarks=f"Cargo: FMCG goods from {orig} to {dest}"
            )
            trips.append(t)
        
        self.stdout.write(f"  [OK] Generated {len(trips)} trips.")

        # ── Maintenance Records ───────────────────────────────────
        maintenance_logs = []
        # Generate 42 Maintenance Logs (40+ requirement)
        self.stdout.write("[*] Generating 42 maintenance logs...")
        
        workshops = [
            "Tata Service Hub", "Leyland Motors Garage", "Eicher Workshop Indore", 
            "Mahindra Auto Care", "BharatBenz Service Center"
        ]
        technicians = [
            "Amit Sharma", "Santosh Kumar", "Ram Lal", "Vicky Yadav", 
            "Jagdish Prasad", "Kailash Sahu", "Rajesh Rathore"
        ]
        maint_descriptions = [
            "Brake pad replacement and drum grinding",
            "Engine tuning, filter replacements, and oil change",
            "Tire rotation, alignment, and balancing (all axles)",
            "Coolant flush, thermostat replacement, and radiator cleaning",
            "Gearbox oil top-up and clutch plate inspection",
            "Electrical wiring fix and alternator replacement",
            "Suspension leaf spring replacement",
            "Cabin air-conditioning system service",
            "Fuel injector cleaning and throttle body wash"
        ]

        for i in range(1, 43):
            v = random.choice(vehicles)
            desc = random.choice(maint_descriptions)
            cost = random.randint(1500, 48000)
            
            maint_days_ago = random.randint(5, 140)
            m_date = (datetime.now() - timedelta(days=maint_days_ago)).date()
            
            # Status: completed or in progress
            if maint_days_ago > 10:
                status = "COMPLETED"
                end_d = m_date + timedelta(days=random.randint(1, 3))
            else:
                status = random.choice(["PENDING", "IN_PROGRESS"])
                end_d = None
                
            # If in maintenance, update vehicle status
            if status == "IN_PROGRESS":
                v.status = "MAINTENANCE"
                v.save()

            m = Maintenance.objects.create(
                vehicle_id=v.id,
                type=random.choice(["Routine", "Repair", "Inspection", "Breakdown"]),
                description=desc,
                workshop=random.choice(workshops),
                technician=random.choice(technicians),
                cost=cost,
                start_date=m_date,
                end_date=end_d,
                status=status
            )
            maintenance_logs.append(m)
            
        self.stdout.write(f"  [OK] Generated {len(maintenance_logs)} maintenance logs.")

        # ── Fuel Logs ─────────────────────────────────────────────
        fuel_logs = []
        # Generate 105 Fuel Logs (100+ requirement)
        self.stdout.write("[*] Generating 105 fuel fill-up logs...")
        
        fuel_pumps = ["Indian Oil", "HP Petrol Pump", "Bharat Petroleum", "Reliance Petrol Pump"]
        fuel_types = ["Diesel", "Diesel", "Diesel", "CNG"]

        for i in range(1, 106):
            v = random.choice(vehicles)
            d = Driver.objects.filter(assigned_vehicle_id=v.id).first()
            if not d:
                d = random.choice(drivers)
                
            capacity_limit = int(v.fuel_capacity)
            liters = random.randint(min(15, capacity_limit), min(250, capacity_limit))
            cost_per_liter = random.uniform(88.50, 94.80)
            cost = int(liters * cost_per_liter)
            
            f_days_ago = random.randint(2, 145)
            f_date = (datetime.now() - timedelta(days=f_days_ago)).date()
            
            f = FuelLog.objects.create(
                vehicle_id=v.id,
                driver_id=d.id,
                liters=liters,
                cost=cost,
                fuel_type=random.choice(fuel_types) if "Carry" not in v.name else "CNG",
                odometer=v.odometer - random.randint(1, 50) * f_days_ago,
                date=f_date,
                provider=random.choice(fuel_pumps)
            )
            fuel_logs.append(f)

        self.stdout.write(f"  [OK] Generated {len(fuel_logs)} fuel log entries.")

        # ── Expenses ──────────────────────────────────────────────
        expenses_count = 0
        self.stdout.write("[*] Generating 120+ expenses (incorporating auto-expenses and administrative entries)...")
        
        # 1. First Mirror Fuel Logs and Completed Maintenance as Expenses (Auto Expenses)
        for f in fuel_logs:
            Expense.objects.create(
                vehicle_id=f.vehicle_id,
                category="Fuel",
                description=f"Fuel Refuel - {f.provider} ({f.liters}L)",
                cost=f.cost,
                date=f.date,
                status="Paid"
            )
            expenses_count += 1

        for m in maintenance_logs:
            if m.status == "COMPLETED":
                Expense.objects.create(
                    vehicle_id=m.vehicle_id,
                    category="Maintenance",
                    description=f"Maintenance Service - {m.workshop} ({m.type})",
                    cost=m.cost,
                    date=m.start_date,
                    status="Paid"
                )
                expenses_count += 1
                
        # 2. Add other administrative expenses (Tolls, Insurance, Road Tax, Fines)
        # Generate 45 additional expenses to cross 120
        extra_categories = [
            ("Tolls", "NHAI Highway Toll Charges - Fastag batch", 800, 3500),
            ("Insurance", "Commercial vehicle insurance renewal", 15000, 32000),
            ("Other", "Road tax & permits clearance fees", 2500, 8000),
            ("Other", "Indore Transport Nagar parking batch charges", 500, 1200),
            ("Other", "National Permit renewal fees", 4000, 12000),
        ]
        
        for i in range(45):
            v = random.choice(vehicles)
            cat_info = random.choice(extra_categories)
            cost = random.randint(cat_info[2], cat_info[3])
            
            exp_days_ago = random.randint(1, 140)
            exp_date = (datetime.now() - timedelta(days=exp_days_ago)).date()
            
            Expense.objects.create(
                vehicle_id=v.id,
                category=cat_info[0],
                description=f"{cat_info[1]} ({v.plate})",
                cost=cost,
                date=exp_date,
                status=random.choice(["Paid", "Approved", "Pending"])
            )
            expenses_count += 1

        self.stdout.write(f"  [OK] Generated {expenses_count} total expense log entries.")

        # ── Platform Users ────────────────────────────────────────
        self.stdout.write("[*] Setting up platform users (Admin: Pankaj Patel)...")
        
        # Admin User: Pankaj Patel / email: pankaj@transitops.com / pass: Pankaj@123
        # Default User: Pankaj Patel
        PlatformUser.objects.create(
            name="Pankaj Patel",
            email="pankaj@transitops.com",
            password="Pankaj@123",
            role="Fleet Manager",
            status="ACTIVE"
        )

        # Standard Test Accounts (password: user123)
        PlatformUser.objects.create(
            name="Fleet Manager Account",
            email="fleet@transitops.in",
            password="user123",
            role="Fleet Manager",
            status="ACTIVE"
        )
        PlatformUser.objects.create(
            name="Dispatcher Account",
            email="dispatch@transitops.in",
            password="user123",
            role="Dispatcher",
            status="ACTIVE"
        )
        PlatformUser.objects.create(
            name="Safety Officer Account",
            email="safety@transitops.in",
            password="user123",
            role="Safety Officer",
            status="ACTIVE"
        )
        PlatformUser.objects.create(
            name="Financial Analyst Account",
            email="finance@transitops.in",
            password="user123",
            role="Financial Analyst",
            status="ACTIVE"
        )
        
        # Seed driver accounts for first 5 drivers
        for drv in drivers[:5]:
            PlatformUser.objects.create(
                name=drv.name,
                email=drv.email,
                role="Driver",
                status="ACTIVE"
            )
            
        self.stdout.write("  [OK] Created platform users including Admin 'Pankaj Patel'.")

        # ── Platform Settings ─────────────────────────────────────
        self.stdout.write("[*] Setting up Indian regional system preferences...")
        defaults = {
            "platformName": "TransitOps",
            "timezone": "GMT+5:30",
            "currency": "INR",
            "companyName": "TransitOps India Logistics Ltd.",
            "companyEmail": "ops@transitops.in",
            "companyAddress": "Plot No. 45, Transport Nagar, Indore, Madhya Pradesh - 452010",
            "notifyMaintenance": "true",
            "notifyTrip": "true",
            "notifyExpenses": "true",
        }
        for key, value in defaults.items():
            PlatformSettings.objects.create(key=key, value=value)
        
        self.stdout.write("  [OK] Regional settings initialized (Currency: INR, Depot: Indore).")

        self.stdout.write(self.style.SUCCESS("\n[SUCCESS] TransitOps database populated with 100% Indian logistics data!"))
