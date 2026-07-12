import json
from datetime import date, datetime, timedelta
from django.http import JsonResponse
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from decimal import Decimal

from django.core.mail import EmailMessage
from django.core.mail.backends.smtp import EmailBackend
from .models import (
    Vehicle, Driver, Trip, Maintenance,
    FuelLog, Expense, PlatformUser, PlatformSettings, Notification,
    VehicleDocument, EmailLog
)

# ─── Page View ───────────────────────────────────────────────────────
def index(request):
    """Redirect to the static landing/login page."""
    return redirect('/static/pages/login/login.html')


# ─── Helper: parse JSON body ─────────────────────────────────────────
def _body(request):
    try:
        return json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return {}


# ─── SMTP Email Helper ────────────────────────────────────────────────
def send_smtp_email(subject, body, recipient):
    try:
        # Get SMTP settings from PlatformSettings
        smtp_host = PlatformSettings.objects.filter(key="smtpHost").first()
        smtp_port = PlatformSettings.objects.filter(key="smtpPort").first()
        smtp_user = PlatformSettings.objects.filter(key="smtpUser").first()
        smtp_pass = PlatformSettings.objects.filter(key="smtpPass").first()
        smtp_tls = PlatformSettings.objects.filter(key="smtpTls").first()
        sender_email = PlatformSettings.objects.filter(key="smtpSender").first()

        host = smtp_host.value if smtp_host else "localhost"
        try:
            port = int(smtp_port.value) if smtp_port else 25
        except ValueError:
            port = 25
        user = smtp_user.value if smtp_user else ""
        password = smtp_pass.value if smtp_pass else ""
        use_tls = (smtp_tls.value == "true") if smtp_tls else False
        sender = sender_email.value if sender_email else "no-reply@transitops.in"

        # Create email log entry
        log = EmailLog.objects.create(
            recipient=recipient,
            subject=subject,
            body=body,
            status="PENDING"
        )

        try:
            backend = EmailBackend(
                host=host,
                port=port,
                username=user,
                password=password,
                use_tls=use_tls,
                fail_silently=False
            )
            email = EmailMessage(
                subject=subject,
                body=body,
                from_email=sender,
                to=[recipient],
                connection=backend
            )
            email.send()
            log.status = "SENT"
            log.save()
            return True
        except Exception as smtp_err:
            log.status = "FAILED"
            log.error_message = str(smtp_err)
            log.save()
            print("SMTP Send Error:", smtp_err)
            return False
    except Exception as e:
        print("Error in send_smtp_email:", e)
        return False


def send_trip_email(trip, subject, message):
    try:
        company_email_setting = PlatformSettings.objects.filter(key="companyEmail").first()
        admin_email = company_email_setting.value if company_email_setting else "ops@transitops.in"
        
        if trip.driver and trip.driver.email:
            send_smtp_email(subject, message, trip.driver.email)
        send_smtp_email(subject, message, admin_email)
    except Exception as e:
        print("Error in send_trip_email:", e)


# ─── Alert Generator Helper ──────────────────────────────────────────
def generate_notifications():
    try:
        today = date.today()
        warning_date = today + timedelta(days=30)
        company_email_setting = PlatformSettings.objects.filter(key="companyEmail").first()
        admin_email = company_email_setting.value if company_email_setting else "ops@transitops.in"

        # 1. Insurance Expiry
        for vehicle in Vehicle.objects.filter(insurance_expiry__isnull=False):
            if vehicle.insurance_expiry <= warning_date and vehicle.insurance_expiry >= today:
                title = f"Insurance Expiry Warning: {vehicle.plate}"
                msg = f"The insurance for vehicle {vehicle.plate} ({vehicle.make} {vehicle.model}) will expire on {vehicle.insurance_expiry}."
                if not Notification.objects.filter(type="Insurance Expiry", title=title, read=False).exists():
                    Notification.objects.create(title=title, message=msg, type="Insurance Expiry")
                    send_smtp_email(title, msg, admin_email)

        # 2. Fitness Expiry
        for vehicle in Vehicle.objects.filter(fitness_expiry__isnull=False):
            if vehicle.fitness_expiry <= warning_date and vehicle.fitness_expiry >= today:
                title = f"Fitness Certificate Warning: {vehicle.plate}"
                msg = f"The Fitness Certificate for vehicle {vehicle.plate} ({vehicle.make} {vehicle.model}) will expire on {vehicle.fitness_expiry}."
                if not Notification.objects.filter(type="Fitness Expiry", title=title, read=False).exists():
                    Notification.objects.create(title=title, message=msg, type="Fitness Expiry")
                    send_smtp_email(title, msg, admin_email)

        # 3. Pollution Expiry
        for vehicle in Vehicle.objects.filter(pollution_expiry__isnull=False):
            if vehicle.pollution_expiry <= warning_date and vehicle.pollution_expiry >= today:
                title = f"Pollution Certificate Warning: {vehicle.plate}"
                msg = f"The Pollution Certificate for vehicle {vehicle.plate} ({vehicle.make} {vehicle.model}) will expire on {vehicle.pollution_expiry}."
                if not Notification.objects.filter(type="Pollution Expiry", title=title, read=False).exists():
                    Notification.objects.create(title=title, message=msg, type="Pollution Expiry")
                    send_smtp_email(title, msg, admin_email)

        # 4. License Expiry
        for driver in Driver.objects.filter(license_expiry__isnull=False):
            if driver.license_expiry <= warning_date and driver.license_expiry >= today:
                title = f"License Expiry Warning: {driver.name}"
                msg = f"The Driver License for {driver.name} (License: {driver.license}) will expire on {driver.license_expiry}."
                if not Notification.objects.filter(type="License Expiry", title=title, read=False).exists():
                    Notification.objects.create(title=title, message=msg, type="License Expiry")
                    recipient = driver.email if driver.email else admin_email
                    send_smtp_email(title, msg, recipient)
                    if driver.email:
                        send_smtp_email(title, msg, admin_email)

        # 5. Maintenance Due
        maint_warning_date = today + timedelta(days=3)
        for maint in Maintenance.objects.filter(status="SCHEDULED", start_date__isnull=False):
            if maint.start_date <= maint_warning_date and maint.start_date >= today:
                title = f"Maintenance Due: {maint.vehicle.plate}"
                msg = f"Scheduled {maint.type} maintenance for vehicle {maint.vehicle.plate} is due on {maint.start_date}."
                if not Notification.objects.filter(type="Maintenance Due", title=title, read=False).exists():
                    Notification.objects.create(title=title, message=msg, type="Maintenance Due")
                    send_smtp_email(title, msg, admin_email)
    except Exception as e:
        print("Error generating notifications:", e)


# ─── Authentication endpoints ────────────────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
def api_login(request):
    data = _body(request)
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    email_clean = email.strip().lower()
    if (email_clean == "pankaj@transitops.com" or email_clean == "pankaj@transitops") and password == "Pankaj@123":
        return JsonResponse({"success": True, "token": "admin-mock-token", "role": "Fleet Manager", "name": "Pankaj Patel", "email": "pankaj@transitops.com"})
    try:
        user = PlatformUser.objects.get(email=email, password=password, status="ACTIVE")
        return JsonResponse({"success": True, "token": f"user-{user.id}-token", "role": user.role, "name": user.name, "email": user.email})
    except PlatformUser.DoesNotExist:
        return JsonResponse({"success": False, "error": "Invalid credentials or inactive account"}, status=401)


@csrf_exempt
@require_http_methods(["POST"])
def api_signup(request):
    data = _body(request)
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    role = data.get("role", "Dispatcher").strip()
    
    if not name or not email or not password:
        return JsonResponse({"success": False, "error": "Name, email, and password are required"}, status=400)
        
    if PlatformUser.objects.filter(email=email).exists() or email == "admin@transitops.com":
        return JsonResponse({"success": False, "error": "Email is already registered"}, status=400)
        
    user = PlatformUser.objects.create(
        name=name,
        email=email,
        password=password,
        role=role,
        status="ACTIVE"
    )
    return JsonResponse({"success": True, "id": user.id})


@csrf_exempt
@require_http_methods(["POST"])
def api_change_password(request):
    data = _body(request)
    email = data.get("email", "").strip().lower()
    old_password = data.get("old_password", "")
    new_password = data.get("new_password", "")

    if not email or not old_password or not new_password:
        return JsonResponse({"success": False, "error": "All fields are required"}, status=400)

    try:
        user = PlatformUser.objects.get(email=email, password=old_password)
        user.password = new_password
        user.save()
        return JsonResponse({"success": True})
    except PlatformUser.DoesNotExist:
        return JsonResponse({"success": False, "error": "Incorrect current password"}, status=400)


# ═══════════════════════════════════════════════════════════════════════
#  VEHICLES
# ═══════════════════════════════════════════════════════════════════════
VEHICLE_FIELDS = [
    "plate", "name", "type", "make", "model", "year", "max_load",
    "fuel_type", "fuel_capacity", "average_mileage", "odometer",
    "purchase_cost", "purchase_date", "insurance_expiry",
    "fitness_expiry", "pollution_expiry", "assigned_driver_id",
    "status", "depot", "image", "remarks"
]

@csrf_exempt
def api_vehicles(request):
    if request.method == "GET":
        return JsonResponse([v.to_dict() for v in Vehicle.objects.all().order_by("id")], safe=False)
    
    if request.method == "POST":
        data = _body(request)
        plate = data.get("plate", "").strip()
        if not plate:
            return JsonResponse({"success": False, "error": "Registration plate number is required"}, status=400)
        if Vehicle.objects.filter(plate=plate).exists():
            return JsonResponse({"success": False, "error": f"Registration plate number '{plate}' is already registered"}, status=400)
        
        kwargs = {}
        for f in VEHICLE_FIELDS:
            if f in data:
                kwargs[f] = data[f]
        
        # Parse dates and numeric types
        for k in ["purchase_date", "insurance_expiry", "fitness_expiry", "pollution_expiry"]:
            if kwargs.get(k) == "": kwargs[k] = None
        
        try:
            vehicle = Vehicle.objects.create(**kwargs)
            return JsonResponse({"success": True, "id": vehicle.id})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)
            
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_vehicle_detail(request, pk):
    try:
        vehicle = Vehicle.objects.get(pk=pk)
    except Vehicle.DoesNotExist:
        return JsonResponse({"success": False, "error": "Vehicle not found"}, status=404)

    if request.method == "PUT":
        data = _body(request)
        plate = data.get("plate", "").strip()
        if plate and plate != vehicle.plate and Vehicle.objects.filter(plate=plate).exists():
            return JsonResponse({"success": False, "error": f"Registration plate number '{plate}' is already registered"}, status=400)

        for f in VEHICLE_FIELDS:
            if f in data:
                val = data[f]
                if f in ["purchase_date", "insurance_expiry", "fitness_expiry", "pollution_expiry"] and val == "":
                    val = None
                setattr(vehicle, f, val)
        try:
            vehicle.save()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)
            
    if request.method == "DELETE":
        vehicle.delete()
        return JsonResponse({"success": True})
        
    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  DRIVERS
# ═══════════════════════════════════════════════════════════════════════
DRIVER_FIELDS = [
    "name", "phone", "email", "address", "license", "license_category",
    "license_expiry", "joining_date", "experience", "safety_score",
    "assigned_vehicle_id", "status", "photo"
]

@csrf_exempt
def api_drivers(request):
    if request.method == "GET":
        return JsonResponse([d.to_dict() for d in Driver.objects.all().order_by("id")], safe=False)
        
    if request.method == "POST":
        data = _body(request)
        license_num = data.get("license", "").strip()
        if not license_num:
            return JsonResponse({"success": False, "error": "License number is required"}, status=400)
        if Driver.objects.filter(license=license_num).exists():
            return JsonResponse({"success": False, "error": f"License number '{license_num}' is already registered"}, status=400)

        kwargs = {}
        for f in DRIVER_FIELDS:
            if f in data:
                kwargs[f] = data[f]
                
        for k in ["license_expiry", "joining_date"]:
            if kwargs.get(k) == "": kwargs[k] = None

        try:
            driver = Driver.objects.create(**kwargs)
            return JsonResponse({"success": True, "id": driver.id})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_driver_detail(request, pk):
    try:
        driver = Driver.objects.get(pk=pk)
    except Driver.DoesNotExist:
        return JsonResponse({"success": False, "error": "Driver not found"}, status=404)

    if request.method == "PUT":
        data = _body(request)
        license_num = data.get("license", "").strip()
        if license_num and license_num != driver.license and Driver.objects.filter(license=license_num).exists():
            return JsonResponse({"success": False, "error": f"License number '{license_num}' is already registered"}, status=400)

        for f in DRIVER_FIELDS:
            if f in data:
                val = data[f]
                if f in ["license_expiry", "joining_date"] and val == "":
                    val = None
                setattr(driver, f, val)
        try:
            driver.save()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    if request.method == "DELETE":
        driver.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  TRIPS
# ═══════════════════════════════════════════════════════════════════════
@csrf_exempt
def api_trips(request):
    if request.method == "GET":
        return JsonResponse([t.to_dict() for t in Trip.objects.all().order_by("id")], safe=False)
        
    if request.method == "POST":
        data = _body(request)
        vehicle_id = data.get("vehicleId")
        driver_id = data.get("driverId")
        status = data.get("status", "DRAFT").upper()
        cargo_weight = Decimal(str(data.get("cargo_weight", 0.0)))
        planned_distance = Decimal(str(data.get("planned_distance", 0.0)))
        
        try:
            vehicle = Vehicle.objects.get(pk=vehicle_id)
            driver = Driver.objects.get(pk=driver_id)
        except (Vehicle.DoesNotExist, Driver.DoesNotExist):
            return JsonResponse({"success": False, "error": "Assigned Vehicle or Driver not found"}, status=400)

        # ─── BUSINESS VALIDATIONS ───
        if vehicle.status == "RETIRED":
            return JsonResponse({"success": False, "error": "Retired vehicles cannot be assigned to trips."}, status=400)
        
        if vehicle.status == "MAINTENANCE":
            return JsonResponse({"success": False, "error": "Vehicles under maintenance cannot be assigned to trips."}, status=400)
            
        if status == "DISPATCHED" and vehicle.status == "ON_TRIP":
            return JsonResponse({"success": False, "error": f"Vehicle '{vehicle.plate}' is already on another active trip."}, status=400)
            
        if driver.status == "SUSPENDED":
            return JsonResponse({"success": False, "error": "Suspended drivers cannot be assigned to trips."}, status=400)
            
        if driver.license_expiry and driver.license_expiry < date.today():
            return JsonResponse({"success": False, "error": f"Driver '{driver.name}' has an expired license (Expired: {driver.license_expiry})."}, status=400)
            
        if status == "DISPATCHED" and driver.status == "ON_TRIP":
            return JsonResponse({"success": False, "error": f"Driver '{driver.name}' is already on another active trip."}, status=400)
            
        if cargo_weight > vehicle.max_load:
            return JsonResponse({"success": False, "error": f"Cargo weight ({cargo_weight} kg) exceeds vehicle maximum capacity ({vehicle.max_load} kg)."}, status=400)

        kwargs = {
            "vehicle": vehicle,
            "driver": driver,
            "origin": data.get("origin", "").strip(),
            "destination": data.get("destination", "").strip(),
            "cargo_weight": cargo_weight,
            "planned_distance": planned_distance,
            "dispatch_date": data.get("dispatch_date") or None,
            "arrival_date": data.get("arrival_date") or None,
            "cost": Decimal(str(data.get("cost", 0.0))),
            "date": data.get("date") or str(date.today()),
            "status": status,
            "remarks": data.get("remarks", "").strip(),
        }

        try:
            trip = Trip.objects.create(**kwargs)
            
            # ─── STATUS SYNCING ───
            if status == "DISPATCHED":
                vehicle.status = "ON_TRIP"
                vehicle.save()
                driver.status = "ON_TRIP"
                driver.save()
                title = f"Trip Dispatched: {trip.origin} → {trip.destination}"
                msg = f"Trip #{trip.id} has been dispatched using vehicle {vehicle.plate} and driver {driver.name}."
                Notification.objects.create(title=title, message=msg, type="Trip Dispatched")
                send_trip_email(trip, title, msg)
            elif status == "COMPLETED":
                vehicle.status = "AVAILABLE"
                vehicle.save()
                driver.status = "AVAILABLE"
                driver.save()
                title = f"Trip Completed: {trip.origin} → {trip.destination}"
                msg = f"Trip #{trip.id} has been completed. Odometer updated to latest."
                Notification.objects.create(title=title, message=msg, type="Trip Completed")
                send_trip_email(trip, title, msg)

            return JsonResponse({"success": True, "id": trip.id})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_trip_detail(request, pk):
    try:
        trip = Trip.objects.get(pk=pk)
    except Trip.DoesNotExist:
        return JsonResponse({"success": False, "error": "Trip not found"}, status=404)

    if request.method == "PUT":
        data = _body(request)
        vehicle_id = data.get("vehicleId", trip.vehicle_id)
        driver_id = data.get("driverId", trip.driver_id)
        new_status = data.get("status", trip.status).upper()
        cargo_weight = Decimal(str(data.get("cargo_weight", trip.cargo_weight)))
        
        try:
            vehicle = Vehicle.objects.get(pk=vehicle_id)
            driver = Driver.objects.get(pk=driver_id)
        except (Vehicle.DoesNotExist, Driver.DoesNotExist):
            return JsonResponse({"success": False, "error": "Assigned Vehicle or Driver not found"}, status=400)

        # ─── BUSINESS VALIDATIONS ON UPDATE ───
        # Check retired/maintenance if vehicle has changed
        if vehicle_id != trip.vehicle_id:
            if vehicle.status == "RETIRED":
                return JsonResponse({"success": False, "error": "Retired vehicles cannot be assigned to trips."}, status=400)
            if vehicle.status == "MAINTENANCE":
                return JsonResponse({"success": False, "error": "Vehicles under maintenance cannot be assigned to trips."}, status=400)
            if new_status == "DISPATCHED" and vehicle.status == "ON_TRIP":
                return JsonResponse({"success": False, "error": f"Vehicle '{vehicle.plate}' is already on another active trip."}, status=400)

        # Check driver if driver has changed
        if driver_id != trip.driver_id:
            if driver.status == "SUSPENDED":
                return JsonResponse({"success": False, "error": "Suspended drivers cannot be assigned to trips."}, status=400)
            if driver.license_expiry and driver.license_expiry < date.today():
                return JsonResponse({"success": False, "error": f"Driver '{driver.name}' has an expired license (Expired: {driver.license_expiry})."}, status=400)
            if new_status == "DISPATCHED" and driver.status == "ON_TRIP":
                return JsonResponse({"success": False, "error": f"Driver '{driver.name}' is already on another active trip."}, status=400)

        # Max weight check
        if cargo_weight > vehicle.max_load:
            return JsonResponse({"success": False, "error": f"Cargo weight ({cargo_weight} kg) exceeds vehicle capacity ({vehicle.max_load} kg)."}, status=400)

        old_status = trip.status
        trip.vehicle = vehicle
        trip.driver = driver
        trip.origin = data.get("origin", trip.origin)
        trip.destination = data.get("destination", trip.destination)
        trip.cargo_weight = cargo_weight
        trip.planned_distance = Decimal(str(data.get("planned_distance", trip.planned_distance)))
        trip.dispatch_date = data.get("dispatch_date") or trip.dispatch_date
        trip.arrival_date = data.get("arrival_date") or trip.arrival_date
        trip.cost = Decimal(str(data.get("cost", trip.cost)))
        trip.date = data.get("date", str(trip.date))
        trip.status = new_status
        trip.remarks = data.get("remarks", trip.remarks)

        try:
            trip.save()

            # ─── STATUS UPDATES SYNC ───
            # Transition to Dispatched
            if old_status != "DISPATCHED" and new_status == "DISPATCHED":
                vehicle.status = "ON_TRIP"
                vehicle.save()
                driver.status = "ON_TRIP"
                driver.save()
                title = f"Trip Dispatched: {trip.origin} → {trip.destination}"
                msg = f"Trip #{trip.id} has been dispatched using vehicle {vehicle.plate} and driver {driver.name}."
                Notification.objects.create(title=title, message=msg, type="Trip Dispatched")
                send_trip_email(trip, title, msg)
            
            # Transition to Completed
            elif old_status == "DISPATCHED" and new_status == "COMPLETED":
                vehicle.status = "AVAILABLE"
                vehicle.save()
                driver.status = "AVAILABLE"
                driver.save()
                title = f"Trip Completed: {trip.origin} → {trip.destination}"
                msg = f"Trip #{trip.id} completed. Vehicle {vehicle.plate} and driver {driver.name} are available."
                Notification.objects.create(title=title, message=msg, type="Trip Completed")
                send_trip_email(trip, title, msg)

            # Transition to Cancelled
            elif old_status == "DISPATCHED" and new_status == "CANCELLED":
                vehicle.status = "AVAILABLE"
                vehicle.save()
                driver.status = "AVAILABLE"
                driver.save()
                title = f"Trip Cancelled: {trip.origin} → {trip.destination}"
                msg = f"Dispatched Trip #{trip.id} was cancelled. Vehicle {vehicle.plate} and driver {driver.name} returned to available."
                Notification.objects.create(title=title, message=msg, type="Trip Cancelled")
                send_trip_email(trip, title, msg)
            
            elif new_status == "CANCELLED" and old_status != "CANCELLED":
                title = f"Trip Cancelled: {trip.origin} → {trip.destination}"
                msg = f"Trip #{trip.id} has been cancelled."
                Notification.objects.create(title=title, message=msg, type="Trip Cancelled")
                send_trip_email(trip, title, msg)

            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    if request.method == "DELETE":
        # Restore vehicle/driver if deleted during active trip
        if trip.status == "DISPATCHED":
            trip.vehicle.status = "AVAILABLE"
            trip.vehicle.save()
            trip.driver.status = "AVAILABLE"
            trip.driver.save()
        trip.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  MAINTENANCE
# ═══════════════════════════════════════════════════════════════════════
@csrf_exempt
def api_maintenance(request):
    if request.method == "GET":
        return JsonResponse([m.to_dict() for m in Maintenance.objects.all().order_by("id")], safe=False)
        
    if request.method == "POST":
        data = _body(request)
        vehicle_id = data.get("vehicleId")
        status = data.get("status", "SCHEDULED").upper()
        
        try:
            vehicle = Vehicle.objects.get(pk=vehicle_id)
        except Vehicle.DoesNotExist:
            return JsonResponse({"success": False, "error": "Vehicle not found"}, status=400)

        kwargs = {
            "vehicle": vehicle,
            "type": data.get("type", "Routine").strip(),
            "description": data.get("description", "").strip(),
            "workshop": data.get("workshop", "Internal Workshop").strip(),
            "technician": data.get("technician", "").strip(),
            "cost": Decimal(str(data.get("cost", 0.0))),
            "start_date": data.get("start_date") or str(date.today()),
            "end_date": data.get("end_date") or None,
            "status": status,
        }

        try:
            maint = Maintenance.objects.create(**kwargs)
            
            # ─── STATUS UPDATES SYNC ───
            if status == "IN_PROGRESS":
                vehicle.status = "MAINTENANCE"
                vehicle.save()
            elif status == "COMPLETED":
                vehicle.status = "AVAILABLE"
                vehicle.save()
                
                # Auto log Expense
                Expense.objects.create(
                    vehicle=vehicle,
                    category="Maintenance",
                    description=f"Maintenance Completed #{maint.id} - {maint.type}: {maint.description[:80]}",
                    cost=maint.cost,
                    date=maint.end_date or date.today(),
                    status="APPROVED"
                )

            return JsonResponse({"success": True, "id": maint.id})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_maintenance_detail(request, pk):
    try:
        maint = Maintenance.objects.get(pk=pk)
    except Maintenance.DoesNotExist:
        return JsonResponse({"success": False, "error": "Maintenance log not found"}, status=404)

    if request.method == "PUT":
        data = _body(request)
        vehicle_id = data.get("vehicleId", maint.vehicle_id)
        new_status = data.get("status", maint.status).upper()
        
        try:
            vehicle = Vehicle.objects.get(pk=vehicle_id)
        except Vehicle.DoesNotExist:
            return JsonResponse({"success": False, "error": "Vehicle not found"}, status=400)

        old_status = maint.status
        maint.vehicle = vehicle
        maint.type = data.get("type", maint.type)
        maint.description = data.get("description", maint.description)
        maint.workshop = data.get("workshop", maint.workshop)
        maint.technician = data.get("technician", maint.technician)
        maint.cost = Decimal(str(data.get("cost", maint.cost)))
        maint.start_date = data.get("start_date", str(maint.start_date))
        maint.end_date = data.get("end_date") or maint.end_date
        maint.status = new_status

        try:
            maint.save()

            # ─── STATUS UPDATES SYNC ───
            if old_status != "IN_PROGRESS" and new_status == "IN_PROGRESS":
                vehicle.status = "MAINTENANCE"
                vehicle.save()
            elif new_status == "COMPLETED" and old_status != "COMPLETED":
                vehicle.status = "AVAILABLE"
                vehicle.save()
                
                # Auto log Expense
                Expense.objects.create(
                    vehicle=vehicle,
                    category="Maintenance",
                    description=f"Maintenance Completed #{maint.id} - {maint.type}: {maint.description[:80]}",
                    cost=maint.cost,
                    date=maint.end_date or date.today(),
                    status="APPROVED"
                )
            elif new_status == "CANCELLED" and old_status == "IN_PROGRESS":
                vehicle.status = "AVAILABLE"
                vehicle.save()

            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    if request.method == "DELETE":
        if maint.status == "IN_PROGRESS":
            maint.vehicle.status = "AVAILABLE"
            maint.vehicle.save()
        maint.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  FUEL LOGS
# ═══════════════════════════════════════════════════════════════════════
@csrf_exempt
def api_fuel(request):
    if request.method == "GET":
        return JsonResponse([f.to_dict() for f in FuelLog.objects.all().order_by("id")], safe=False)
        
    if request.method == "POST":
        data = _body(request)
        vehicle_id = data.get("vehicleId")
        driver_id = data.get("driverId")
        liters = Decimal(str(data.get("liters", 0.0)))
        cost = Decimal(str(data.get("cost", 0.0)))
        odometer = int(data.get("odometer", 0))
        provider = data.get("provider", "").strip()
        fuel_type = data.get("fuel_type", "Diesel").strip()
        fill_date = data.get("date") or str(date.today())

        try:
            vehicle = Vehicle.objects.get(pk=vehicle_id)
        except Vehicle.DoesNotExist:
            return JsonResponse({"success": False, "error": "Vehicle not found"}, status=400)

        driver = None
        if driver_id:
            try:
                driver = Driver.objects.get(pk=driver_id)
            except Driver.DoesNotExist:
                pass

        try:
            # Create fuel log
            fuel_log = FuelLog.objects.create(
                vehicle=vehicle,
                driver=driver,
                liters=liters,
                cost=cost,
                provider=provider,
                fuel_type=fuel_type,
                odometer=odometer,
                date=fill_date
            )

            # Update vehicle odometer reading if larger
            if odometer > vehicle.odometer:
                vehicle.odometer = odometer
                vehicle.save()

            # Auto log fuel expense
            Expense.objects.create(
                vehicle=vehicle,
                category="Fuel",
                description=f"Fuel Refill #{fuel_log.id}: {liters}L filled @ {provider}",
                cost=cost,
                date=fill_date,
                status="APPROVED"
            )

            # Fuel Alert triggers if amount is excessively high (> $1000) or liters (> 500)
            if cost > 1000 or liters > 500:
                Notification.objects.create(
                    title=f"Fuel Warning: High Volume on {vehicle.plate}",
                    message=f"Large volume fuel refuel recorded on vehicle {vehicle.plate}: {liters} L costing {cost}.",
                    type="Fuel Alerts"
                )

            return JsonResponse({"success": True, "id": fuel_log.id})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_fuel_detail(request, pk):
    try:
        fuel = FuelLog.objects.get(pk=pk)
    except FuelLog.DoesNotExist:
        return JsonResponse({"success": False, "error": "Fuel record not found"}, status=404)

    if request.method == "PUT":
        data = _body(request)
        for f in ["liters", "cost", "provider", "fuel_type", "odometer", "date"]:
            if f in data:
                val = data[f]
                if f == "liters" or f == "cost":
                    val = Decimal(str(val))
                setattr(fuel, f, val)
        if "vehicleId" in data:
            fuel.vehicle_id = data["vehicleId"]
        if "driverId" in data:
            fuel.driver_id = data["driverId"]

        try:
            fuel.save()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    if request.method == "DELETE":
        fuel.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  EXPENSES
# ═══════════════════════════════════════════════════════════════════════
@csrf_exempt
def api_expenses(request):
    if request.method == "GET":
        return JsonResponse([e.to_dict() for e in Expense.objects.all().order_by("id")], safe=False)
        
    if request.method == "POST":
        data = _body(request)
        vehicle_id = data.get("vehicleId")
        category = data.get("category", "Other").strip()
        description = data.get("description", "").strip()
        cost = Decimal(str(data.get("cost", 0.0)))
        exp_date = data.get("date") or str(date.today())
        status = data.get("status", "PENDING").upper()

        try:
            vehicle = Vehicle.objects.get(pk=vehicle_id)
        except Vehicle.DoesNotExist:
            return JsonResponse({"success": False, "error": "Vehicle not found"}, status=400)

        try:
            expense = Expense.objects.create(
                vehicle=vehicle,
                category=category,
                description=description,
                cost=cost,
                date=exp_date,
                status=status
            )
            return JsonResponse({"success": True, "id": expense.id})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_expense_detail(request, pk):
    try:
        expense = Expense.objects.get(pk=pk)
    except Expense.DoesNotExist:
        return JsonResponse({"success": False, "error": "Expense record not found"}, status=404)

    if request.method == "PUT":
        data = _body(request)
        if "vehicleId" in data:
            expense.vehicle_id = data["vehicleId"]
        for f in ["category", "description", "cost", "date", "status"]:
            if f in data:
                val = data[f]
                if f == "cost":
                    val = Decimal(str(val))
                elif f == "status":
                    val = val.upper()
                setattr(expense, f, val)
        try:
            expense.save()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    if request.method == "DELETE":
        expense.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  USERS
# ═══════════════════════════════════════════════════════════════════════
USER_FIELDS = ["name", "email", "password", "role", "status"]

@csrf_exempt
def api_users(request):
    if request.method == "GET":
        return JsonResponse([u.to_dict() for u in PlatformUser.objects.all().order_by("id")], safe=False)
        
    if request.method == "POST":
        data = _body(request)
        email = data.get("email", "").strip().lower()
        if not email:
            return JsonResponse({"success": False, "error": "Email is required"}, status=400)
        if PlatformUser.objects.filter(email=email).exists():
            return JsonResponse({"success": False, "error": f"Email '{email}' is already registered"}, status=400)
            
        kwargs = {}
        for f in USER_FIELDS:
            if f in data:
                val = data[f]
                if f == "email":
                    val = val.strip().lower()
                kwargs[f] = val
                
        try:
            user = PlatformUser.objects.create(**kwargs)
            return JsonResponse({"success": True, "id": user.id})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_user_detail(request, pk):
    try:
        user = PlatformUser.objects.get(pk=pk)
    except PlatformUser.DoesNotExist:
        return JsonResponse({"success": False, "error": "User not found"}, status=404)

    if request.method == "PUT":
        data = _body(request)
        email = data.get("email", "").strip().lower()
        if email and email != user.email and PlatformUser.objects.filter(email=email).exists():
            return JsonResponse({"success": False, "error": f"Email '{email}' is already registered"}, status=400)

        for f in USER_FIELDS:
            if f in data:
                val = data[f]
                if f == "email":
                    val = val.strip().lower()
                setattr(user, f, val)
        try:
            user.save()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    if request.method == "DELETE":
        user.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════════════
@csrf_exempt
def api_notifications(request):
    # Dynamically generate warnings based on current date
    generate_notifications()
    
    if request.method == "GET":
        notifications = Notification.objects.all().order_by("-id")
        return JsonResponse([n.to_dict() for n in notifications], safe=False)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_notification_detail(request, pk):
    try:
        notif = Notification.objects.get(pk=pk)
    except Notification.DoesNotExist:
        return JsonResponse({"success": False, "error": "Notification not found"}, status=404)

    if request.method == "PUT":
        data = _body(request)
        if "read" in data:
            notif.read = bool(data["read"])
        try:
            notif.save()
            return JsonResponse({"success": True})
        except Exception as e:
            return JsonResponse({"success": False, "error": str(e)}, status=500)

    if request.method == "DELETE":
        notif.delete()
        return JsonResponse({"success": True})

    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  SETTINGS — Key/Value store
# ═══════════════════════════════════════════════════════════════════════
@csrf_exempt
def api_settings(request):
    if request.method == "GET":
        settings = {}
        for s in PlatformSettings.objects.all():
            if s.value in ("true", "false"):
                settings[s.key] = s.value == "true"
            else:
                settings[s.key] = s.value
        return JsonResponse(settings)

    if request.method == "PUT":
        data = _body(request)
        for key, value in data.items():
            if isinstance(value, bool):
                value = "true" if value else "false"
            PlatformSettings.objects.update_or_create(
                key=key, defaults={"value": str(value)}
            )
        return JsonResponse({"success": True})

    return JsonResponse({"error": "Method not allowed"}, status=405)


# ─── Monthly Operational Report & Test Emails ───────────────────────
@csrf_exempt
@require_http_methods(["POST"])
def api_send_monthly_report(request):
    try:
        today = date.today()
        month_str = today.strftime("%B %Y")
        
        total_vehicles = Vehicle.objects.exclude(status="RETIRED").count()
        total_drivers = Driver.objects.count()
        
        start_of_month = today.replace(day=1)
        expenses = Expense.objects.filter(date__gte=start_of_month)
        total_expenses = sum(e.cost for e in expenses)
        
        fuel_cost = sum(e.cost for e in expenses if e.category.lower() == "fuel")
        maint_cost = sum(e.cost for e in expenses if e.category.lower() == "maintenance")
        other_cost = total_expenses - fuel_cost - maint_cost
        
        trips_count = Trip.objects.filter(date__gte=start_of_month).count()
        completed_trips = Trip.objects.filter(date__gte=start_of_month, status="COMPLETED").count()
        
        company_name_setting = PlatformSettings.objects.filter(key="companyName").first()
        company_name = company_name_setting.value if company_name_setting else "TransitOps India Logistics"
        company_email_setting = PlatformSettings.objects.filter(key="companyEmail").first()
        recipient = company_email_setting.value if company_email_setting else "ops@transitops.in"
        
        subject = f"Monthly Operational Report - {month_str} - {company_name}"
        body = f"""Dear Operator,

Here is your TransitOps Monthly Fleet Operations & Cost Report for {month_str}:

--- SYSTEM SUMMARY ---
- Active Vehicles: {total_vehicles}
- Registered Drivers: {total_drivers}
- Trips Dispatched this month: {trips_count} (Completed: {completed_trips})

--- EXPENSE REPORT ---
- Total Fleet Cost: INR {total_expenses:,.2f}
- Fuel Cost: INR {fuel_cost:,.2f}
- Maintenance Cost: INR {maint_cost:,.2f}
- Tolls / Other Expenses: INR {other_cost:,.2f}

Report generated automatically by TransitOps ERP.
"""
        
        sent = send_smtp_email(subject, body, recipient)
        if sent:
            return JsonResponse({"success": True})
        else:
            return JsonResponse({"success": False, "error": "SMTP send failed. Check SMTP configuration in Settings."}, status=500)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def api_send_test_email(request):
    try:
        data = _body(request)
        recipient = data.get("recipient", "").strip()
        if not recipient:
            return JsonResponse({"success": False, "error": "Recipient email is required"}, status=400)
            
        subject = "TransitOps SMTP Test Email"
        body = "Congratulations! Your TransitOps SMTP configurations have been verified and are working correctly."
        
        sent = send_smtp_email(subject, body, recipient)
        if sent:
            return JsonResponse({"success": True})
        else:
            return JsonResponse({"success": False, "error": "SMTP validation failed. Please check host, credentials and security protocol."}, status=500)
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)

