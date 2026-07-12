from django.urls import path
from . import views

urlpatterns = [
    # Main SPA page
    path("", views.index, name="index"),

    # Authentication
    path("api/login", views.api_login, name="api_login"),
    path("api/signup", views.api_signup, name="api_signup"),

    # Vehicles CRUD
    path("api/vehicles", views.api_vehicles, name="api_vehicles"),
    path("api/vehicles/<int:pk>", views.api_vehicle_detail, name="api_vehicle_detail"),

    # Drivers CRUD
    path("api/drivers", views.api_drivers, name="api_drivers"),
    path("api/drivers/<int:pk>", views.api_driver_detail, name="api_driver_detail"),

    # Trips CRUD
    path("api/trips", views.api_trips, name="api_trips"),
    path("api/trips/<int:pk>", views.api_trip_detail, name="api_trip_detail"),

    # Maintenance CRUD
    path("api/maintenance", views.api_maintenance, name="api_maintenance"),
    path("api/maintenance/<int:pk>", views.api_maintenance_detail, name="api_maintenance_detail"),

    # Fuel Logs CRUD
    path("api/fuel", views.api_fuel, name="api_fuel"),
    path("api/fuel/<int:pk>", views.api_fuel_detail, name="api_fuel_detail"),

    # Expenses CRUD
    path("api/expenses", views.api_expenses, name="api_expenses"),
    path("api/expenses/<int:pk>", views.api_expense_detail, name="api_expense_detail"),

    # Users CRUD
    path("api/users", views.api_users, name="api_users"),
    path("api/users/<int:pk>", views.api_user_detail, name="api_user_detail"),

    # Settings
    path("api/settings", views.api_settings, name="api_settings"),
]
