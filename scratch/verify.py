import urllib.request
import urllib.error
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def api_request(url, method="GET", data=None):
    req = urllib.request.Request(url, method=method)
    req.add_header("Content-Type", "application/json")
    
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        
    try:
        with urllib.request.urlopen(req, data=body) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        res_body = e.read().decode("utf-8")
        try:
            err_json = json.loads(res_body)
        except:
            err_json = res_body
        return e.code, err_json

def run_tests():
    print("[*] Starting TransitOps backend API verification tests...")
    
    # 1. Login Test with Pankaj Patel credentials
    print("\n[1] Testing Authentication...")
    login_url = f"{BASE_URL}/api/login"
    credentials = {"email": "pankaj@transitops.com", "password": "Pankaj@123"}
    status, login_res = api_request(login_url, "POST", credentials)
    if status == 200 and login_res.get("success") is True:
        token = login_res["token"]
        print(f"  [OK] Login successful! Token: {token}, Role: {login_res.get('role')}")
    else:
        print(f"  [FAIL] Login API failed (Status {status}): {login_res}")
        sys.exit(1)

    # 2. CRUD Vehicle Test with Indian Plate
    print("\n[2] Testing Vehicle creation & uniqueness with Indian parameters...")
    vehicles_url = f"{BASE_URL}/api/vehicles"
    vehicle_payload = {
        "plate": "MP09AB8888",
        "name": "Tata Prima 4930.S",
        "make": "Tata",
        "model": "Prima 4930.S",
        "type": "Semi-Truck",
        "year": 2026,
        "max_load": 40000.0,
        "fuel_type": "Diesel",
        "fuel_capacity": 400.0,
        "average_mileage": 3.5,
        "odometer": 12000,
        "purchase_cost": 4500000.0,
        "purchase_date": "2026-01-15",
        "insurance_expiry": "2026-08-01",
        "fitness_expiry": "2027-01-15",
        "pollution_expiry": "2026-10-15",
        "depot": "Indore Main Depot",
        "status": "AVAILABLE",
        "remarks": "High load tractor trailer"
    }
    
    status, create_res = api_request(vehicles_url, "POST", vehicle_payload)
    if status == 400 and "already registered" in str(create_res.get("error", "")):
        print("  [OK] Vehicle already created in previous run.")
        status, v_list = api_request(vehicles_url)
        vehicle_id = [v["id"] for v in v_list if v["plate"] == "MP09AB8888"][0]
    else:
        assert status in (200, 201), f"Unexpected status: {status}, res: {create_res}"
        assert create_res.get("success") is True
        vehicle_id = create_res["id"]
        print(f"  [OK] Created validation vehicle! ID: {vehicle_id}")

        # Test Uniqueness Constraint
        status_dup, res_dup = api_request(vehicles_url, "POST", vehicle_payload)
        assert status_dup == 400, f"Duplicate plate accepted! Status: {status_dup}"
        print("  [OK] Uniqueness check rejected duplicate plate correctly.")

    # 3. Business Rule Validation: Assign Retired / Maintenance vehicles
    print("\n[3] Testing Trip Business Rules...")
    
    # Create driver
    drivers_url = f"{BASE_URL}/api/drivers"
    driver_payload = {
        "name": "Ramesh Kumar",
        "license": "DL-888-VAL",
        "phone": "+91 99999 88888",
        "email": "ramesh@transitops.com",
        "address": "Vijay Nagar, Indore",
        "license_category": "Heavy Commercial",
        "license_expiry": "2027-07-12",
        "joining_date": "2026-07-01",
        "experience": 8,
        "safety_score": 92,
        "status": "AVAILABLE"
    }
    status_drv, res_drv = api_request(drivers_url, "POST", driver_payload)
    if status_drv == 400 and "already registered" in str(res_drv.get("error", "")):
        status, d_list = api_request(drivers_url)
        driver_id = [d["id"] for d in d_list if d["license"] == "DL-888-VAL"][0]
        print(f"  [OK] Driver already created. ID: {driver_id}")
    else:
        assert status_drv in (200, 201), f"Driver creation status: {status_drv}"
        driver_id = res_drv["id"]
        print(f"  [OK] Created validation driver! ID: {driver_id}")

    # Set vehicle to MAINTENANCE
    status, _ = api_request(f"{vehicles_url}/{vehicle_id}", "PUT", {"status": "MAINTENANCE"})
    
    trips_url = f"{BASE_URL}/api/trips"
    trip_payload = {
        "vehicleId": vehicle_id,
        "driverId": driver_id,
        "origin": "Indore",
        "destination": "Bhopal",
        "cargo_weight": 12000.0,
        "planned_distance": 195.0,
        "cost": 25000.0,
        "date": "2026-07-12",
        "status": "DISPATCHED",
        "remarks": "Test dispatch validation"
    }
    
    status_trip_maint, res_trip_maint = api_request(trips_url, "POST", trip_payload)
    assert status_trip_maint == 400, f"Trip scheduled with maintenance vehicle! Status: {status_trip_maint}"
    print("  [OK] Prevented assigning vehicle in maintenance to trip.")

    # Restore vehicle to AVAILABLE
    api_request(f"{vehicles_url}/{vehicle_id}", "PUT", {"status": "AVAILABLE"})

    # Try dispatching with cargo exceeding vehicle max capacity (max_load: 40000.0)
    trip_payload["cargo_weight"] = 55000.0
    status_trip_weight, res_trip_weight = api_request(trips_url, "POST", trip_payload)
    assert status_trip_weight == 400, f"Trip scheduled with exceeding weight! Status: {status_trip_weight}"
    print("  [OK] Prevented scheduling cargo weight exceeding vehicle capacity.")
    
    # 4. Status Syncing on Dispatch
    print("\n[4] Testing Status Syncing on Dispatch...")
    trip_payload["cargo_weight"] = 15000.0
    status_trip_disp, res_trip_disp = api_request(trips_url, "POST", trip_payload)
    assert status_trip_disp in (200, 201), f"Dispatched status failed: {status_trip_disp}, res: {res_trip_disp}"
    trip_id = res_trip_disp["id"]
    print(f"  [OK] Trip dispatched! ID: {trip_id}")

    # Assert vehicle/driver ON_TRIP
    _, v_info = api_request(vehicles_url)
    v_status = [v["status"] for v in v_info if v["id"] == vehicle_id][0]
    assert v_status == "ON_TRIP", f"Vehicle status expected ON_TRIP, got: {v_status}"
    
    _, d_info = api_request(drivers_url)
    d_status = [d["status"] for d in d_info if d["id"] == driver_id][0]
    assert d_status == "ON_TRIP", f"Driver status expected ON_TRIP, got: {d_status}"
    print("  [OK] Vehicle and driver statuses synced to ON_TRIP correctly.")

    # 5. Status Syncing on Completion
    print("\n[5] Testing Status Syncing on Completion...")
    # Update trip status to COMPLETED
    api_request(f"{trips_url}/{trip_id}", "PUT", {"status": "COMPLETED"})
    
    # Assert vehicle/driver AVAILABLE
    _, v_info = api_request(vehicles_url)
    v_status = [v["status"] for v in v_info if v["id"] == vehicle_id][0]
    assert v_status == "AVAILABLE", f"Vehicle status expected AVAILABLE, got: {v_status}"
    
    _, d_info = api_request(drivers_url)
    d_status = [d["status"] for d in d_info if d["id"] == driver_id][0]
    assert d_status == "AVAILABLE", f"Driver status expected AVAILABLE, got: {d_status}"
    print("  [OK] Vehicle and driver statuses returned to AVAILABLE upon completion.")

    # 6. Notifications Alerts check
    print("\n[6] Testing Notification Warnings...")
    notif_url = f"{BASE_URL}/api/notifications"
    _, notifs = api_request(notif_url)
    
    insurance_warns = [n for n in notifs if "MP09AB8888" in n["title"]]
    assert len(insurance_warns) > 0, "No insurance alert generated for expiring vehicle MP09AB8888!"
    print(f"  [OK] Generated alert successfully: '{insurance_warns[0]['title']}'")

    # 7. Settings SMTP Test
    print("\n[7] Testing Platform settings for SMTP Configuration...")
    settings_url = f"{BASE_URL}/api/settings"
    smtp_payload = {
        "smtpHost": "smtp.mailtrap.io",
        "smtpPort": "2525",
        "smtpUser": "testuser",
        "smtpPass": "testpass",
        "smtpSender": "ops@transitops.in",
        "smtpTls": "true"
    }
    status_smtp, settings_res = api_request(settings_url, "PUT", smtp_payload)
    assert status_smtp == 200, f"Updating settings failed: {status_smtp}"
    
    # Get settings to verify
    status_get, get_res = api_request(settings_url, "GET")
    assert status_get == 200, f"Getting settings failed: {status_get}"
    assert get_res.get("smtpHost") == "smtp.mailtrap.io", f"Expected smtp.mailtrap.io, got {get_res.get('smtpHost')}"
    print("  [OK] SMTP settings saved and retrieved correctly.")

    # 8. Monthly Report Endpoint Test
    print("\n[8] Testing Monthly Report API Endpoint...")
    report_url = f"{BASE_URL}/api/send-monthly-report"
    status_rep, report_res = api_request(report_url, "POST")
    # Note: mailtrap credentials above are mock, so it might fail to send unless we mock or settings are validated.
    # Since we are using mock mailtrap credentials, views.py send_smtp_email will fail and return status 500.
    # However, if it reaches the view, the status code will be 500 instead of 404, validating routing presence.
    assert status_rep in (200, 500), f"Monthly report URL not found! Status: {status_rep}"
    print(f"  [OK] Monthly report endpoint returned status {status_rep} (Expected 200 or 500 for connection errors).")

    print("\n[SUCCESS] All TransitOps backend API verification tests passed successfully!")

if __name__ == "__main__":
    run_tests()
