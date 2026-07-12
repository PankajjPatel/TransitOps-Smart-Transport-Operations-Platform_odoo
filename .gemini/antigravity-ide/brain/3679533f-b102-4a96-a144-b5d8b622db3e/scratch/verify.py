import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("[*] Starting backend API verification tests...")
    
    # 1. Login Test
    print("\n[1] Testing Authentication...")
    login_url = f"{BASE_URL}/api/login"
    credentials = {"email": "admin@transitops.com", "password": "admin123"}
    try:
        r = requests.post(login_url, json=credentials)
        r.raise_for_status()
        login_res = r.json()
        assert login_res["success"] is True, "Login failed!"
        token = login_res["token"]
        print(f"  [OK] Login successful! Token: {token}")
    except Exception as e:
        print(f"  [FAIL] Login API failed: {e}")
        sys.exit(1)

    # 2. CRUD Vehicle Test
    print("\n[2] Testing Vehicle creation & uniqueness...")
    vehicles_url = f"{BASE_URL}/api/vehicles"
    # Create vehicle
    vehicle_payload = {
        "plate": "TEST-111-V",
        "name": "Integration Test Vehicle",
        "make": "Volvo",
        "model": "VNL 860",
        "type": "Semi-Truck",
        "year": 2026,
        "max_load": 15000.0,
        "fuel_type": "Diesel",
        "fuel_capacity": 300.0,
        "average_mileage": 4.8,
        "odometer": 1000,
        "purchase_cost": 135000.0,
        "purchase_date": "2026-07-01",
        "insurance_expiry": "2026-08-01",
        "fitness_expiry": "2027-07-01",
        "pollution_expiry": "2027-01-01",
        "depot": "Main Depot",
        "status": "AVAILABLE",
        "remarks": "API verification vehicle"
    }
    
    r_create = requests.post(vehicles_url, json=vehicle_payload)
    if r_create.status_code == 400 and "already registered" in r_create.text:
        print("  [OK] Vehicle already created in previous run.")
        # Retrieve vehicle list to find id
        r_list = requests.get(vehicles_url)
        v_list = r_list.json()
        vehicle_id = [v["id"] for v in v_list if v["plate"] == "TEST-111-V"][0]
    else:
        r_create.raise_for_status()
        create_res = r_create.json()
        assert create_res["success"] is True
        vehicle_id = create_res["id"]
        print(f"  [OK] Created validation vehicle! ID: {vehicle_id}")

        # Test Uniqueness Constraint
        r_dup = requests.post(vehicles_url, json=vehicle_payload)
        assert r_dup.status_code == 400, "Uniqueness check failed! Duplicate plate number accepted."
        print("  [OK] Uniqueness check rejected duplicate plate correctly.")

    # 3. Business Rule Validation: Assign Retired / Maintenance vehicles
    print("\n[3] Testing Trip Business Rules...")
    
    # Let's find/create a driver
    drivers_url = f"{BASE_URL}/api/drivers"
    driver_payload = {
        "name": "Test Driver",
        "license": "LIC-999-VAL",
        "phone": "+1 (555) 999-1234",
        "email": "driver@test.com",
        "address": "Driver Residence",
        "license_category": "CDL Class A",
        "license_expiry": "2027-07-12",
        "joining_date": "2026-07-01",
        "experience": 4,
        "safety_score": 95,
        "status": "AVAILABLE"
    }
    r_drv = requests.post(drivers_url, json=driver_payload)
    if r_drv.status_code == 400 and "already registered" in r_drv.text:
        r_list = requests.get(drivers_url)
        d_list = r_list.json()
        driver_id = [d["id"] for d in d_list if d["license"] == "LIC-999-VAL"][0]
        print(f"  [OK] Driver already created. ID: {driver_id}")
    else:
        r_drv.raise_for_status()
        driver_id = r_drv.json()["id"]
        print(f"  [OK] Created validation driver! ID: {driver_id}")

    # Set vehicle to MAINTENANCE and attempt to dispatch trip
    # Update vehicle status to MAINTENANCE
    requests.put(f"{vehicles_url}/{vehicle_id}", json={"status": "MAINTENANCE"})
    
    trips_url = f"{BASE_URL}/api/trips"
    trip_payload = {
        "vehicleId": vehicle_id,
        "driverId": driver_id,
        "origin": "New York, NY",
        "destination": "Boston, MA",
        "cargo_weight": 5000.0,
        "planned_distance": 320.0,
        "cost": 1200.0,
        "date": "2026-07-12",
        "status": "DISPATCHED",
        "remarks": "Test dispatch validation"
    }
    r_trip_maint = requests.post(trips_url, json=trip_payload)
    assert r_trip_maint.status_code == 400, "Trip successfully scheduled with vehicle in maintenance! (Should fail)"
    print("  [OK] Prevented assigning vehicle in maintenance to trip.")

    # Set vehicle back to AVAILABLE
    requests.put(f"{vehicles_url}/{vehicle_id}", json={"status": "AVAILABLE"})

    # Try dispatching with cargo exceeding vehicle max capacity
    trip_payload["cargo_weight"] = 25000.0  # limit is 15000.0
    r_trip_weight = requests.post(trips_url, json=trip_payload)
    assert r_trip_weight.status_code == 400, "Trip successfully scheduled with cargo weight exceeding limit!"
    print("  [OK] Prevented scheduling cargo weight exceeding vehicle capacity.")
    
    # 4. Status Syncing on Dispatch
    print("\n[4] Testing Status Syncing on Dispatch...")
    trip_payload["cargo_weight"] = 8000.0 # correct weight
    r_trip_disp = requests.post(trips_url, json=trip_payload)
    r_trip_disp.raise_for_status()
    trip_id = r_trip_disp.json()["id"]
    print(f"  [OK] Trip dispatched! ID: {trip_id}")

    # Assert vehicle status and driver status automatically updated to ON_TRIP
    v_info = requests.get(f"{vehicles_url}").json()
    v_status = [v["status"] for v in v_info if v["id"] == vehicle_id][0]
    assert v_status == "ON_TRIP", f"Vehicle status expected ON_TRIP, got: {v_status}"
    
    d_info = requests.get(f"{drivers_url}").json()
    d_status = [d["status"] for d in d_info if d["id"] == driver_id][0]
    assert d_status == "ON_TRIP", f"Driver status expected ON_TRIP, got: {d_status}"
    print("  [OK] Vehicle and driver statuses synced to ON_TRIP correctly.")

    # 5. Status Syncing on Completion
    print("\n[5] Testing Status Syncing on Completion...")
    # Update trip status to COMPLETED
    requests.put(f"{trips_url}/{trip_id}", json={"status": "COMPLETED"})
    
    # Assert vehicle and driver statuses returned to AVAILABLE
    v_info = requests.get(f"{vehicles_url}").json()
    v_status = [v["status"] for v in v_info if v["id"] == vehicle_id][0]
    assert v_status == "AVAILABLE", f"Vehicle status expected AVAILABLE, got: {v_status}"
    
    d_info = requests.get(f"{drivers_url}").json()
    d_status = [d["status"] for d in d_info if d["id"] == driver_id][0]
    assert d_status == "AVAILABLE", f"Driver status expected AVAILABLE, got: {d_status}"
    print("  [OK] Vehicle and driver statuses returned to AVAILABLE upon completion.")

    # 6. Notifications Alerts check
    print("\n[6] Testing Notification Warnings...")
    notif_url = f"{BASE_URL}/api/notifications"
    notifs = requests.get(notif_url).json()
    
    # Check if there is an Insurance Expiry notification for TEST-111-V (since it expires in <30 days)
    insurance_warns = [n for n in notifs if "TEST-111-V" in n["title"]]
    assert len(insurance_warns) > 0, "No insurance alert generated for expiring vehicle TEST-111-V!"
    print(f"  [OK] Generated alert successfully: '{insurance_warns[0]['title']}'")

    print("\n[SUCCESS] All backend API verification tests passed successfully!")

if __name__ == "__main__":
    run_tests()
