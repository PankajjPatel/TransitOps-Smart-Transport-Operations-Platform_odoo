from django.db import models

class Vehicle(models.Model):
    """Fleet vehicle registry."""
    plate = models.CharField(max_length=30, unique=True) # Unique Registration Number
    name = models.CharField(max_length=120)
    type = models.CharField(max_length=40, default="Semi-Truck")
    make = models.CharField(max_length=80) # Brand
    model = models.CharField(max_length=80)
    year = models.IntegerField(default=2023) # Manufacturing Year
    max_load = models.DecimalField(max_digits=12, decimal_places=2, default=0.0) # Cargo Capacity in kg
    fuel_type = models.CharField(max_length=30, default="Diesel")
    fuel_capacity = models.DecimalField(max_digits=10, decimal_places=2, default=0.0) # Fuel tank in L
    average_mileage = models.DecimalField(max_digits=8, decimal_places=2, default=0.0) # km/L
    odometer = models.IntegerField(default=0) # Current odometer reading in km
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    purchase_date = models.DateField(null=True, blank=True)
    insurance_expiry = models.DateField(null=True, blank=True)
    fitness_expiry = models.DateField(null=True, blank=True)
    pollution_expiry = models.DateField(null=True, blank=True)
    assigned_driver = models.ForeignKey(
        "Driver", 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="assigned_vehicles_set"
    )
    status = models.CharField(max_length=20, default="AVAILABLE") # Available, On Trip, Maintenance, Retired
    depot = models.CharField(max_length=120, default="Main Garage") # Depot / Garage
    image = models.TextField(default="") # Base64 or Image path string
    remarks = models.TextField(default="")

    def __str__(self):
        return f"{self.plate} - {self.make} {self.model}"

    def to_dict(self):
        return {
            "id": self.id,
            "plate": self.plate,
            "name": self.name,
            "type": self.type,
            "make": self.make,
            "model": self.model,
            "year": self.year,
            "max_load": float(self.max_load),
            "fuel_type": self.fuel_type,
            "fuel_capacity": float(self.fuel_capacity),
            "average_mileage": float(self.average_mileage),
            "odometer": self.odometer,
            "purchase_cost": float(self.purchase_cost),
            "purchase_date": str(self.purchase_date) if self.purchase_date else "",
            "insurance_expiry": str(self.insurance_expiry) if self.insurance_expiry else "",
            "fitness_expiry": str(self.fitness_expiry) if self.fitness_expiry else "",
            "pollution_expiry": str(self.pollution_expiry) if self.pollution_expiry else "",
            "assigned_driver_id": self.assigned_driver_id,
            "assigned_driver_name": self.assigned_driver.name if self.assigned_driver else "Unassigned",
            "status": self.status,
            "depot": self.depot,
            "image": self.image,
            "remarks": self.remarks,
        }


class Driver(models.Model):
    """Driver directory."""
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=30)
    email = models.EmailField(default="")
    address = models.TextField(default="")
    license = models.CharField(max_length=40, unique=True)
    license_category = models.CharField(max_length=30, default="Class A CDL")
    license_expiry = models.DateField(null=True, blank=True)
    joining_date = models.DateField(null=True, blank=True)
    experience = models.IntegerField(default=0) # Experience in years
    safety_score = models.IntegerField(default=100) # Safety Score scale 0-100
    assigned_vehicle = models.ForeignKey(
        "Vehicle", 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="assigned_drivers_set"
    )
    status = models.CharField(max_length=20, default="AVAILABLE") # Available, On Trip, Off Duty, Suspended
    photo = models.TextField(default="") # Base64 or Image path string

    def __str__(self):
        return self.name

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "phone": self.phone,
            "email": self.email,
            "address": self.address,
            "license": self.license,
            "license_category": self.license_category,
            "license_expiry": str(self.license_expiry) if self.license_expiry else "",
            "joining_date": str(self.joining_date) if self.joining_date else "",
            "experience": self.experience,
            "safety_score": self.safety_score,
            "assigned_vehicle_id": self.assigned_vehicle_id,
            "assigned_vehicle_plate": self.assigned_vehicle.plate if self.assigned_vehicle else "Unassigned",
            "status": self.status,
            "photo": self.photo,
        }


class Trip(models.Model):
    """Trip scheduling and dispatch records."""
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="trips")
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name="trips")
    origin = models.CharField(max_length=120) # Source
    destination = models.CharField(max_length=120)
    cargo_weight = models.DecimalField(max_digits=12, decimal_places=2, default=0.0) # cargo weight in kg
    planned_distance = models.DecimalField(max_digits=10, decimal_places=2, default=0.0) # km
    dispatch_date = models.DateField(null=True, blank=True)
    arrival_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, default="DRAFT") # Draft, Dispatched, Completed, Cancelled
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.0) # Trip revenue/cost
    date = models.DateField()
    remarks = models.TextField(default="")

    def __str__(self):
        return f"{self.origin} → {self.destination}"

    def to_dict(self):
        return {
            "id": self.id,
            "vehicleId": self.vehicle_id,
            "driverId": self.driver_id,
            "origin": self.origin,
            "destination": self.destination,
            "cargo_weight": float(self.cargo_weight),
            "planned_distance": float(self.planned_distance),
            "dispatch_date": str(self.dispatch_date) if self.dispatch_date else "",
            "arrival_date": str(self.arrival_date) if self.arrival_date else "",
            "cost": float(self.cost),
            "date": str(self.date),
            "status": self.status,
            "remarks": self.remarks,
        }


class Maintenance(models.Model):
    """Vehicle maintenance logbook."""
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="maintenance_records")
    type = models.CharField(max_length=40, default="Routine") # Scheduled, Repair, Breakdown, Routine
    description = models.TextField()
    workshop = models.CharField(max_length=120, default="Internal Workshop")
    technician = models.CharField(max_length=120, default="")
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, default="SCHEDULED") # Scheduled, In Progress, Completed, Cancelled

    def __str__(self):
        return f"Maintenance #{self.id} - {self.description[:40]}"

    def to_dict(self):
        return {
            "id": self.id,
            "vehicleId": self.vehicle_id,
            "type": self.type,
            "description": self.description,
            "workshop": self.workshop,
            "technician": self.technician,
            "cost": float(self.cost),
            "start_date": str(self.start_date),
            "end_date": str(self.end_date) if self.end_date else "",
            "status": self.status,
        }


class FuelLog(models.Model):
    """Fuel consumption tracking."""
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="fuel_logs")
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name="fuel_logs", null=True, blank=True)
    liters = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.0)
    provider = models.CharField(max_length=120) # Fuel Station
    fuel_type = models.CharField(max_length=40, default="Diesel")
    odometer = models.IntegerField(default=0) # Odometer Reading at refuel
    date = models.DateField()

    def __str__(self):
        return f"Fuel #{self.id} - {self.liters}L"

    def to_dict(self):
        return {
            "id": self.id,
            "vehicleId": self.vehicle_id,
            "driverId": self.driver_id,
            "liters": float(self.liters),
            "cost": float(self.cost),
            "date": str(self.date),
            "provider": self.provider,
            "fuel_type": self.fuel_type,
            "odometer": self.odometer,
        }


class Expense(models.Model):
    """Operational expense registry."""
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="expenses")
    category = models.CharField(max_length=40) # Fuel, Maintenance, Toll, Insurance, Salary, Other
    description = models.CharField(max_length=200)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.0) # Amount
    date = models.DateField() # Expense Date
    status = models.CharField(max_length=20, default="PENDING") # Pending, Approved, Paid

    def __str__(self):
        return f"{self.category} - {self.description[:40]}"

    def to_dict(self):
        return {
            "id": self.id,
            "vehicleId": self.vehicle_id,
            "category": self.category,
            "description": self.description,
            "cost": float(self.cost),
            "date": str(self.date),
            "status": self.status,
        }


class Notification(models.Model):
    """System alerts and notifications."""
    title = models.CharField(max_length=150)
    message = models.TextField()
    type = models.CharField(max_length=50) # Insurance Expiry, License Expiry, Maintenance Due, Trip Completed, Trip Cancelled, Fuel Alerts
    date = models.DateTimeField(auto_now_add=True)
    read = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.type}: {self.title}"

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "type": self.type,
            "date": self.date.strftime("%Y-%m-%d %H:%M:%S"),
            "read": self.read,
        }


class PlatformUser(models.Model):
    """System user management (separate from Django auth)."""
    name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128, default="admin123")
    role = models.CharField(max_length=30, default="Dispatcher") # Admin, Fleet Manager, Dispatcher, Safety Officer
    status = models.CharField(max_length=20, default="ACTIVE")

    def __str__(self):
        return f"{self.name} ({self.email})"

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "status": self.status,
        }


class PlatformSettings(models.Model):
    """Singleton settings store — one row stores all platform settings as key/value."""
    key = models.CharField(max_length=60, unique=True)
    value = models.TextField(default="")

    def __str__(self):
        return f"{self.key} = {self.value}"

    class Meta:
        verbose_name_plural = "Platform Settings"


class VehicleDocument(models.Model):
    """Vehicle compliance and legal documents."""
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="documents")
    name = models.CharField(max_length=120) # Document title
    document_type = models.CharField(max_length=50) # e.g. Insurance, Fitness, Pollution, Registration
    expiry_date = models.DateField()
    file_path = models.TextField(default="", blank=True) # file reference or base64 data

    def __str__(self):
        return f"{self.vehicle.plate} - {self.document_type} (Expires: {self.expiry_date})"

    def to_dict(self):
        return {
            "id": self.id,
            "vehicleId": self.vehicle_id,
            "vehiclePlate": self.vehicle.plate,
            "name": self.name,
            "document_type": self.document_type,
            "expiry_date": str(self.expiry_date),
            "file_path": self.file_path,
        }


class EmailLog(models.Model):
    """SMTP sent logs for audit and compliance."""
    recipient = models.CharField(max_length=150)
    subject = models.CharField(max_length=200)
    body = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default="PENDING") # SENT, FAILED, PENDING
    error_message = models.TextField(default="", blank=True)

    def __str__(self):
        return f"Email to {self.recipient} - {self.subject} ({self.status})"

    def to_dict(self):
        return {
            "id": self.id,
            "recipient": self.recipient,
            "subject": self.subject,
            "body": self.body,
            "sent_at": self.sent_at.strftime("%Y-%m-%d %H:%M:%S") if self.sent_at else "",
            "status": self.status,
            "error_message": self.error_message,
        }

