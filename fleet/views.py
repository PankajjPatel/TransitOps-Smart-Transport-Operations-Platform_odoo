import json
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from .models import (
    Vehicle, Driver, Trip, Maintenance,
    FuelLog, Expense, PlatformUser, PlatformSettings,
)


# ─── Page View ───────────────────────────────────────────────────────
def index(request):
    """Serve the single-page application template."""
    return render(request, "fleet/index.html")


# ─── Helper: parse JSON body ─────────────────────────────────────────
def _body(request):
    try:
        return json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return {}


# ─── Authentication endpoints ────────────────────────────────────────
@csrf_exempt
@require_http_methods(["POST"])
def api_login(request):
    data = _body(request)
    email = data.get("email", "")
    password = data.get("password", "")
    if email == "admin@transitops.com" and password == "admin123":
        return JsonResponse({"success": True})
    try:
        user = PlatformUser.objects.get(email=email, password=password, status="ACTIVE")
        return JsonResponse({"success": True})
    except PlatformUser.DoesNotExist:
        return JsonResponse({"success": False, "error": "Invalid credentials or inactive account"}, status=401)


@csrf_exempt
@require_http_methods(["POST"])
def api_signup(request):
    data = _body(request)
    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
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


# ═══════════════════════════════════════════════════════════════════════
#  Generic CRUD helpers for simple models
# ═══════════════════════════════════════════════════════════════════════

def _list(model):
    return JsonResponse([obj.to_dict() for obj in model.objects.all().order_by("id")], safe=False)


def _create(model, data, fields):
    kwargs = {f: data.get(f, "") for f in fields}
    obj = model.objects.create(**kwargs)
    return JsonResponse({"success": True, "id": obj.id})


def _update(model, pk, data, fields):
    try:
        obj = model.objects.get(pk=pk)
    except model.DoesNotExist:
        return JsonResponse({"success": False, "error": "Not found"}, status=404)
    for f in fields:
        if f in data:
            setattr(obj, f, data[f])
    obj.save()
    return JsonResponse({"success": True})


def _delete(model, pk):
    try:
        obj = model.objects.get(pk=pk)
        obj.delete()
        return JsonResponse({"success": True})
    except model.DoesNotExist:
        return JsonResponse({"success": False, "error": "Not found"}, status=404)


# ═══════════════════════════════════════════════════════════════════════
#  VEHICLES
# ═══════════════════════════════════════════════════════════════════════
VEHICLE_FIELDS = ["plate", "make", "model", "type", "year", "status"]

@csrf_exempt
def api_vehicles(request):
    if request.method == "GET":
        return _list(Vehicle)
    if request.method == "POST":
        data = _body(request)
        return _create(Vehicle, data, VEHICLE_FIELDS)
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_vehicle_detail(request, pk):
    if request.method == "PUT":
        return _update(Vehicle, pk, _body(request), VEHICLE_FIELDS)
    if request.method == "DELETE":
        return _delete(Vehicle, pk)
    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  DRIVERS
# ═══════════════════════════════════════════════════════════════════════
DRIVER_FIELDS = ["name", "license", "phone", "status"]

@csrf_exempt
def api_drivers(request):
    if request.method == "GET":
        return _list(Driver)
    if request.method == "POST":
        return _create(Driver, _body(request), DRIVER_FIELDS)
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_driver_detail(request, pk):
    if request.method == "PUT":
        return _update(Driver, pk, _body(request), DRIVER_FIELDS)
    if request.method == "DELETE":
        return _delete(Driver, pk)
    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  TRIPS  — FK fields are named vehicleId / driverId in JSON
# ═══════════════════════════════════════════════════════════════════════
@csrf_exempt
def api_trips(request):
    if request.method == "GET":
        return _list(Trip)
    if request.method == "POST":
        data = _body(request)
        kwargs = {
            "vehicle_id": data.get("vehicleId"),
            "driver_id": data.get("driverId"),
            "origin": data.get("origin", ""),
            "destination": data.get("destination", ""),
            "cost": data.get("cost", 0),
            "date": data.get("date"),
            "status": data.get("status", "PENDING"),
        }
        obj = Trip.objects.create(**kwargs)
        return JsonResponse({"success": True, "id": obj.id})
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_trip_detail(request, pk):
    if request.method == "PUT":
        data = _body(request)
        try:
            obj = Trip.objects.get(pk=pk)
        except Trip.DoesNotExist:
            return JsonResponse({"success": False, "error": "Not found"}, status=404)
        if "vehicleId" in data:
            obj.vehicle_id = data["vehicleId"]
        if "driverId" in data:
            obj.driver_id = data["driverId"]
        for f in ["origin", "destination", "cost", "date", "status"]:
            if f in data:
                setattr(obj, f, data[f])
        obj.save()
        return JsonResponse({"success": True})
    if request.method == "DELETE":
        return _delete(Trip, pk)
    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  MAINTENANCE — FK field vehicleId in JSON
# ═══════════════════════════════════════════════════════════════════════
@csrf_exempt
def api_maintenance(request):
    if request.method == "GET":
        return _list(Maintenance)
    if request.method == "POST":
        data = _body(request)
        kwargs = {
            "vehicle_id": data.get("vehicleId"),
            "description": data.get("description", ""),
            "cost": data.get("cost", 0),
            "date": data.get("date"),
            "status": data.get("status", "PENDING"),
        }
        obj = Maintenance.objects.create(**kwargs)
        # Auto-create expense when maintenance is completed
        if kwargs["status"] == "COMPLETED":
            Expense.objects.create(
                vehicle_id=kwargs["vehicle_id"],
                category="Maintenance",
                description=f"Maintenance #{obj.id}: {kwargs['description'][:80]}",
                cost=kwargs["cost"],
                date=kwargs["date"],
            )
        return JsonResponse({"success": True, "id": obj.id})
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_maintenance_detail(request, pk):
    if request.method == "PUT":
        data = _body(request)
        try:
            obj = Maintenance.objects.get(pk=pk)
        except Maintenance.DoesNotExist:
            return JsonResponse({"success": False, "error": "Not found"}, status=404)
        old_status = obj.status
        if "vehicleId" in data:
            obj.vehicle_id = data["vehicleId"]
        for f in ["description", "cost", "date", "status"]:
            if f in data:
                setattr(obj, f, data[f])
        obj.save()
        # Auto-create expense when maintenance transitions to COMPLETED
        if old_status != "COMPLETED" and obj.status == "COMPLETED":
            Expense.objects.create(
                vehicle_id=obj.vehicle_id,
                category="Maintenance",
                description=f"Maintenance #{obj.id}: {obj.description[:80]}",
                cost=obj.cost,
                date=obj.date,
            )
        return JsonResponse({"success": True})
    if request.method == "DELETE":
        return _delete(Maintenance, pk)
    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  FUEL LOGS — FK field vehicleId in JSON
# ═══════════════════════════════════════════════════════════════════════
@csrf_exempt
def api_fuel(request):
    if request.method == "GET":
        return _list(FuelLog)
    if request.method == "POST":
        data = _body(request)
        kwargs = {
            "vehicle_id": data.get("vehicleId"),
            "liters": data.get("liters", 0),
            "cost": data.get("cost", 0),
            "date": data.get("date"),
            "provider": data.get("provider", ""),
        }
        obj = FuelLog.objects.create(**kwargs)
        # Auto-create matching fuel expense
        Expense.objects.create(
            vehicle_id=kwargs["vehicle_id"],
            category="Fuel",
            description=f"Fuel fill #{obj.id}: {kwargs['liters']}L @ {kwargs['provider']}",
            cost=kwargs["cost"],
            date=kwargs["date"],
        )
        return JsonResponse({"success": True, "id": obj.id})
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_fuel_detail(request, pk):
    if request.method == "PUT":
        data = _body(request)
        try:
            obj = FuelLog.objects.get(pk=pk)
        except FuelLog.DoesNotExist:
            return JsonResponse({"success": False, "error": "Not found"}, status=404)
        if "vehicleId" in data:
            obj.vehicle_id = data["vehicleId"]
        for f in ["liters", "cost", "date", "provider"]:
            if f in data:
                setattr(obj, f, data[f])
        obj.save()
        return JsonResponse({"success": True})
    if request.method == "DELETE":
        return _delete(FuelLog, pk)
    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  EXPENSES — FK field vehicleId in JSON
# ═══════════════════════════════════════════════════════════════════════
@csrf_exempt
def api_expenses(request):
    if request.method == "GET":
        return _list(Expense)
    if request.method == "POST":
        data = _body(request)
        kwargs = {
            "vehicle_id": data.get("vehicleId"),
            "category": data.get("category", "Other"),
            "description": data.get("description", ""),
            "cost": data.get("cost", 0),
            "date": data.get("date"),
        }
        obj = Expense.objects.create(**kwargs)
        return JsonResponse({"success": True, "id": obj.id})
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_expense_detail(request, pk):
    if request.method == "PUT":
        data = _body(request)
        try:
            obj = Expense.objects.get(pk=pk)
        except Expense.DoesNotExist:
            return JsonResponse({"success": False, "error": "Not found"}, status=404)
        if "vehicleId" in data:
            obj.vehicle_id = data["vehicleId"]
        for f in ["category", "description", "cost", "date"]:
            if f in data:
                setattr(obj, f, data[f])
        obj.save()
        return JsonResponse({"success": True})
    if request.method == "DELETE":
        return _delete(Expense, pk)
    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  USERS
# ═══════════════════════════════════════════════════════════════════════
USER_FIELDS = ["name", "email", "role", "status"]

@csrf_exempt
def api_users(request):
    if request.method == "GET":
        return _list(PlatformUser)
    if request.method == "POST":
        return _create(PlatformUser, _body(request), USER_FIELDS)
    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def api_user_detail(request, pk):
    if request.method == "PUT":
        return _update(PlatformUser, pk, _body(request), USER_FIELDS)
    if request.method == "DELETE":
        return _delete(PlatformUser, pk)
    return JsonResponse({"error": "Method not allowed"}, status=405)


# ═══════════════════════════════════════════════════════════════════════
#  SETTINGS — Key/Value store
# ═══════════════════════════════════════════════════════════════════════
@csrf_exempt
def api_settings(request):
    if request.method == "GET":
        settings = {}
        for s in PlatformSettings.objects.all():
            # Convert "true"/"false" strings to booleans for JS
            if s.value in ("true", "false"):
                settings[s.key] = s.value == "true"
            else:
                settings[s.key] = s.value
        return JsonResponse(settings)

    if request.method == "PUT":
        data = _body(request)
        for key, value in data.items():
            # Convert booleans to string for storage
            if isinstance(value, bool):
                value = "true" if value else "false"
            PlatformSettings.objects.update_or_create(
                key=key, defaults={"value": str(value)}
            )
        return JsonResponse({"success": True})

    return JsonResponse({"error": "Method not allowed"}, status=405)
