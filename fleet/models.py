from django.db import models


class Vehicle(models.Model):
    """Fleet vehicle registry."""
    plate = models.CharField(max_length=30, unique=True)
    make = models.CharField(max_length=80)
    model = models.CharField(max_length=80)
    type = models.CharField(max_length=40, default="Semi-Truck")
    year = models.IntegerField(default=2023)
    status = models.CharField(max_length=20, default="AVAILABLE")

    def __str__(self):
        return f"{self.plate} - {self.make} {self.model}"

    def to_dict(self):
        return {
            "id": self.id,
            "plate": self.plate,
            "make": self.make,
            "model": self.model,
            "type": self.type,
            "year": self.year,
            "status": self.status,
        }


class Driver(models.Model):
    """Driver directory."""
    name = models.CharField(max_length=120)
    license = models.CharField(max_length=40, unique=True)
    phone = models.CharField(max_length=30)
    status = models.CharField(max_length=20, default="OFF_DUTY")

    def __str__(self):
        return self.name

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "license": self.license,
            "phone": self.phone,
            "status": self.status,
        }


class Trip(models.Model):
    """Trip scheduling and dispatch records."""
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="trips")
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name="trips")
    origin = models.CharField(max_length=120)
    destination = models.CharField(max_length=120)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    date = models.DateField()
    status = models.CharField(max_length=20, default="PENDING")

    def __str__(self):
        return f"{self.origin} → {self.destination}"

    def to_dict(self):
        return {
            "id": self.id,
            "vehicleId": self.vehicle_id,
            "driverId": self.driver_id,
            "origin": self.origin,
            "destination": self.destination,
            "cost": float(self.cost),
            "date": str(self.date),
            "status": self.status,
        }


class Maintenance(models.Model):
    """Vehicle maintenance logbook."""
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="maintenance_records")
    description = models.TextField()
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    date = models.DateField()
    status = models.CharField(max_length=20, default="PENDING")

    def __str__(self):
        return f"Maintenance #{self.id} - {self.description[:40]}"

    def to_dict(self):
        return {
            "id": self.id,
            "vehicleId": self.vehicle_id,
            "description": self.description,
            "cost": float(self.cost),
            "date": str(self.date),
            "status": self.status,
        }


class FuelLog(models.Model):
    """Fuel consumption tracking."""
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="fuel_logs")
    liters = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    date = models.DateField()
    provider = models.CharField(max_length=120)

    def __str__(self):
        return f"Fuel #{self.id} - {self.liters}L"

    def to_dict(self):
        return {
            "id": self.id,
            "vehicleId": self.vehicle_id,
            "liters": float(self.liters),
            "cost": float(self.cost),
            "date": str(self.date),
            "provider": self.provider,
        }


class Expense(models.Model):
    """Operational expense registry."""
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="expenses")
    category = models.CharField(max_length=40)
    description = models.CharField(max_length=200)
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    date = models.DateField()

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
        }


class PlatformUser(models.Model):
    """System user management (separate from Django auth)."""
    name = models.CharField(max_length=120)
    email = models.EmailField(unique=True)
    password = models.CharField(max_length=128, default="admin123")
    role = models.CharField(max_length=30, default="Dispatcher")
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
