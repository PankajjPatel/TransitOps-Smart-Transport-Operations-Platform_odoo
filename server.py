import os
import json
import sqlite3
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs

DB_FILE = "transitops.db"

# --- DATABASE SETUP ---
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # Create tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS vehicles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            plate TEXT UNIQUE,
            make TEXT,
            model TEXT,
            type TEXT,
            year INTEGER,
            status TEXT
        )cd
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS drivers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            license TEXT,
            phone TEXT,
            status TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicleId INTEGER,
            driverId INTEGER,
            origin TEXT,
            destination TEXT,
            cost REAL,
            date TEXT,
            status TEXT,
            FOREIGN KEY (vehicleId) REFERENCES vehicles(id),
            FOREIGN KEY (driverId) REFERENCES drivers(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS maintenance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicleId INTEGER,
            description TEXT,
            cost REAL,
            date TEXT,
            status TEXT,
            FOREIGN KEY (vehicleId) REFERENCES vehicles(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS fuel (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicleId INTEGER,
            liters REAL,
            cost REAL,
            date TEXT,
            provider TEXT,
            FOREIGN KEY (vehicleId) REFERENCES vehicles(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            vehicleId INTEGER,
            category TEXT,
            description TEXT,
            cost REAL,
            date TEXT,
            FOREIGN KEY (vehicleId) REFERENCES vehicles(id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            email TEXT UNIQUE,
            role TEXT,
            status TEXT
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)

    conn.commit()

    # Check if empty, then seed initial database
    cursor.execute("SELECT COUNT(*) FROM vehicles")
    if cursor.fetchone()[0] == 0:
        seed_db(cursor)
        conn.commit()

    conn.close()

def seed_db(cursor):
    # Seed Vehicles
    vehicles = [
        ("NY-8832-B", "Freightliner", "Cascadia", "Semi-Truck", 2022, "ACTIVE"),
        ("CA-9092-A", "Volvo", "VNL 860", "Semi-Truck", 2023, "AVAILABLE"),
        ("TX-4401-F", "Ford", "F-550", "Flatbed", 2021, "AVAILABLE"),
        ("FL-2291-C", "Isuzu", "NPR-HD", "Box Truck", 2020, "MAINTENANCE"),
        ("IL-7782-K", "Freightliner", "Cascadia", "Semi-Truck", 2022, "ACTIVE"),
        ("WA-1102-M", "Volvo", "VNL 860", "Semi-Truck", 2023, "ACTIVE"),
        ("NV-5532-S", "Ram", "ProMaster", "Cargo Van", 2021, "AVAILABLE"),
        ("OR-6612-P", "Peterbilt", "579", "Semi-Truck", 2022, "MAINTENANCE")
    ]
    cursor.executemany("INSERT INTO vehicles (plate, make, model, type, year, status) VALUES (?,?,?,?,?,?)", vehicles)

    # Seed Drivers
    drivers = [
        ("John Doe", "CDL-A-9812", "+1 (555) 019-2831", "DUTY"),
        ("Sarah Connor", "CDL-A-4432", "+1 (555) 012-9843", "OFF_DUTY"),
        ("David Miller", "CDL-B-7721", "+1 (555) 014-4829", "DUTY"),
        ("James Wilson", "CDL-A-1109", "+1 (555) 015-3891", "DUTY"),
        ("Robert Chen", "CDL-A-3329", "+1 (555) 019-3382", "OFF_DUTY"),
        ("Emily Adams", "CDL-B-5521", "+1 (555) 017-7429", "DUTY"),
        ("Marcus Brody", "CDL-A-8832", "+1 (555) 018-9901", "OFF_DUTY")
    ]
    cursor.executemany("INSERT INTO drivers (name, license, phone, status) VALUES (?,?,?,?)", drivers)

    # Seed Trips
    trips = [
        (1, 1, "New York, NY", "Boston, MA", 1200.00, "2026-07-12", "ACTIVE"),
        (5, 3, "Chicago, IL", "Detroit, MI", 850.00, "2026-07-12", "ACTIVE"),
        (6, 4, "Seattle, WA", "Portland, OR", 600.00, "2026-07-12", "ACTIVE"),
        (2, 2, "Los Angeles, CA", "Phoenix, AZ", 1100.00, "2026-07-10", "COMPLETED"),
        (3, 5, "Dallas, TX", "Houston, TX", 450.00, "2026-07-08", "COMPLETED"),
        (7, 7, "Las Vegas, NV", "Salt Lake City, UT", 950.00, "2026-07-13", "PENDING"),
        (1, 1, "Boston, MA", "Philadelphia, PA", 780.00, "2026-07-05", "COMPLETED")
    ]
    cursor.executemany("INSERT INTO trips (vehicleId, driverId, origin, destination, cost, date, status) VALUES (?,?,?,?,?,?,?)", trips)

    # Seed Maintenance
    maintenance = [
        (4, "Brake pad replacement and rotor resurfacing", 650.00, "2026-07-11", "IN_PROGRESS"),
        (8, "Engine diagnostics and oil filter replacement", 1200.00, "2026-07-10", "PENDING"),
        (2, "Scheduled preventive maintenance & tire rotation", 350.00, "2026-07-01", "COMPLETED"),
        (5, "Windshield wiper replacement and fluid top-up", 85.00, "2026-06-25", "COMPLETED"),
        (3, "AC compressor replacement", 980.00, "2026-06-18", "COMPLETED")
    ]
    cursor.executemany("INSERT INTO maintenance (vehicleId, description, cost, date, status) VALUES (?,?,?,?,?)", maintenance)

    # Seed Fuel
    fuel = [
        (1, 320.0, 480.00, "2026-07-11", "Pilot Flying J"),
        (5, 280.0, 420.00, "2026-07-10", "Love's Travel Stops"),
        (6, 150.0, 230.00, "2026-07-09", "TA Travel Center"),
        (2, 300.0, 450.00, "2026-07-08", "Shell Fleet"),
        (7, 75.0, 115.00, "2026-07-07", "Chevron"),
        (1, 310.0, 465.00, "2026-07-04", "Pilot Flying J"),
        (5, 290.0, 435.00, "2026-07-02", "Love's Travel Stops"),
        (3, 120.0, 180.00, "2026-06-28", "Shell Fleet")
    ]
    cursor.executemany("INSERT INTO fuel (vehicleId, liters, cost, date, provider) VALUES (?,?,?,?,?)", fuel)

    # Seed Expenses
    expenses = [
        (1, "Fuel", "Refuel - 320L", 480.00, "2026-07-11"),
        (5, "Fuel", "Refuel - 280L", 420.00, "2026-07-10"),
        (4, "Maintenance", "Brake maintenance service", 650.00, "2026-07-11"),
        (8, "Maintenance", "Engine Diagnostic fee", 200.00, "2026-07-10"),
        (2, "Insurance", "Monthly fleet insurance premium", 550.00, "2026-07-01"),
        (1, "Tolls", "EZPass Toll charge NY-MA", 65.00, "2026-07-12"),
        (5, "Fuel", "Refuel - 290L", 435.00, "2026-07-02"),
        (2, "Maintenance", "Tire rotation and alignment", 350.00, "2026-07-01"),
        (3, "Other", "Fleet vehicle registration fee", 150.00, "2026-06-20"),
        (3, "Maintenance", "AC compressor replacement", 980.00, "2026-06-18")
    ]
    cursor.executemany("INSERT INTO expenses (vehicleId, category, description, cost, date) VALUES (?,?,?,?,?)", expenses)

    # Seed Users
    users = [
        ("Girjesh Adarsh", "admin@transitops.com", "Administrator", "ACTIVE"),
        ("Alice Vance", "alice@transitops.com", "Dispatcher", "ACTIVE"),
        ("Bob Carter", "bob@transitops.com", "Driver", "ACTIVE"),
        ("Charlie Davis", "charlie@transitops.com", "Dispatcher", "INACTIVE")
    ]
    cursor.executemany("INSERT INTO users (name, email, role, status) VALUES (?,?,?,?)", users)

    # Seed Settings
    settings = {
        "platformName": "TransitOps",
        "timezone": "GMT+5:30",
        "currency": "USD",
        "companyName": "TransitOps Fleet Solutions",
        "companyEmail": "ops@transitops.com",
        "companyAddress": "100 Enterprise Way, Suite 400, Fleet City",
        "notifyMaintenance": "true",
        "notifyTrip": "true",
        "notifyExpenses": "false"
    }
    for k, v in settings.items():
        cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)", (k, v))

# Helper to fetch rows as dictionaries
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

# --- SERVER REQUEST HANDLER ---
class TransitOpsRequestHandler(BaseHTTPRequestHandler):

    def send_response_headers(self, status=200, content_type="application/json"):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_OPTIONS(self):
        # Support CORS Preflight
        self.send_response_headers(200)

    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        # Serving static files
        if path == "/" or path == "/index.html":
            self.serve_static_file("index.html", "text/html")
            return
        elif path == "/index.css":
            self.serve_static_file("index.css", "text/css")
            return
        elif path == "/app.js":
            self.serve_static_file("app.js", "application/javascript")
            return

        # Serving API requests
        if path.startswith("/api/"):
            resource = path[5:] # Cut off '/api/'
            
            # GET Settings
            if resource == "settings":
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT key, value FROM settings")
                rows = cursor.fetchall()
                settings_dict = {}
                for row in rows:
                    val = row["value"]
                    # Handle booleans conversions
                    if val == "true": val = True
                    elif val == "false": val = False
                    settings_dict[row["key"]] = val
                conn.close()
                self.send_response_headers()
                self.wfile.write(json.dumps(settings_dict).encode("utf-8"))
                return

            # GET Lists
            tables = ["vehicles", "drivers", "trips", "maintenance", "fuel", "expenses", "users"]
            if resource in tables:
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute(f"SELECT * FROM {resource}")
                rows = cursor.fetchall()
                conn.close()
                
                # Convert SQLite row objects to standard dict list
                data = [dict(r) for r in rows]
                self.send_response_headers()
                self.wfile.write(json.dumps(data).encode("utf-8"))
                return

        # 404 Not Found fallback
        self.send_response_headers(404, "text/plain")
        self.wfile.write(b"Not Found")

    def do_POST(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/api/"):
            resource = path[5:]
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode("utf-8"))

            # Login Authentication API
            if resource == "login":
                if payload.get("email") == "admin@transitops.com" and payload.get("password") == "admin123":
                    self.send_response_headers(200)
                    self.wfile.write(json.dumps({"success": True, "token": "admin-mock-token"}).encode("utf-8"))
                else:
                    self.send_response_headers(401)
                    self.wfile.write(json.dumps({"success": False, "error": "Invalid credentials"}).encode("utf-8"))
                return

            # CRUD Add Operations
            tables = ["vehicles", "drivers", "trips", "maintenance", "fuel", "expenses", "users"]
            if resource in tables:
                conn = get_db_connection()
                cursor = conn.cursor()

                columns = ", ".join(payload.keys())
                placeholders = ", ".join(["?"] * len(payload))
                values = list(payload.values())

                try:
                    cursor.execute(f"INSERT INTO {resource} ({columns}) VALUES ({placeholders})", values)
                    new_id = cursor.lastrowid
                    conn.commit()
                    
                    # Automate synced expenses trigger (equivalent to JS implementation)
                    if resource == "fuel":
                        # Auto log Fuel expense
                        cursor.execute(
                            "INSERT INTO expenses (vehicleId, category, description, cost, date) VALUES (?,?,?,?,?)",
                            (payload["vehicleId"], "Fuel", f"Fuel log #{new_id} - {payload['liters']}L filled", payload["cost"], payload["date"])
                        )
                        conn.commit()
                    elif resource == "maintenance" and payload.get("status") == "COMPLETED":
                        # Auto log Maintenance expense
                        cursor.execute(
                            "INSERT INTO expenses (vehicleId, category, description, cost, date) VALUES (?,?,?,?,?)",
                            (payload["vehicleId"], "Maintenance", f"Maintenance #{new_id} - {payload['description']}", payload["cost"], payload["date"])
                        )
                        conn.commit()

                    conn.close()

                    self.send_response_headers(201)
                    self.wfile.write(json.dumps({"success": True, "id": new_id}).encode("utf-8"))
                except Exception as e:
                    conn.close()
                    self.send_response_headers(500)
                    self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
                return

        self.send_response_headers(404, "text/plain")
        self.wfile.write(b"Not Found")

    def do_PUT(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/api/"):
            parts = path[5:].split("/")
            resource = parts[0]
            
            content_length = int(self.headers.get("Content-Length", 0))
            post_data = self.rfile.read(content_length)
            payload = json.loads(post_data.decode("utf-8"))

            # Update settings
            if resource == "settings":
                conn = get_db_connection()
                cursor = conn.cursor()
                for k, v in payload.items():
                    # Save booleans as strings
                    val_str = "true" if v is True else "false" if v is False else str(v)
                    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?,?)", (k, val_str))
                conn.commit()
                conn.close()
                self.send_response_headers(200)
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
                return

            # Update row in a table (e.g. /api/vehicles/2)
            if len(parts) > 1:
                item_id = int(parts[1])
                tables = ["vehicles", "drivers", "trips", "maintenance", "fuel", "expenses", "users"]
                
                if resource in tables:
                    conn = get_db_connection()
                    cursor = conn.cursor()

                    set_clause = ", ".join([f"{k} = ?" for k in payload.keys()])
                    values = list(payload.values())
                    values.append(item_id)

                    try:
                        cursor.execute(f"UPDATE {resource} SET {set_clause} WHERE id = ?", values)
                        conn.commit()
                        conn.close()
                        self.send_response_headers(200)
                        self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
                    except Exception as e:
                        conn.close()
                        self.send_response_headers(500)
                        self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
                    return

        self.send_response_headers(404, "text/plain")
        self.wfile.write(b"Not Found")

    def do_DELETE(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        if path.startswith("/api/"):
            parts = path[5:].split("/")
            resource = parts[0]

            if len(parts) > 1:
                item_id = int(parts[1])
                tables = ["vehicles", "drivers", "trips", "maintenance", "fuel", "expenses", "users"]
                
                if resource in tables:
                    conn = get_db_connection()
                    cursor = conn.cursor()
                    try:
                        cursor.execute(f"DELETE FROM {resource} WHERE id = ?", (item_id,))
                        conn.commit()
                        conn.close()
                        self.send_response_headers(200)
                        self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
                    except Exception as e:
                        conn.close()
                        self.send_response_headers(500)
                        self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode("utf-8"))
                    return

        self.send_response_headers(404, "text/plain")
        self.wfile.write(b"Not Found")

    # Static file server helper
    def serve_static_file(self, filename, content_type):
        if os.path.exists(filename):
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.end_headers()
            with open(filename, "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_response_headers(404, "text/plain")
            self.wfile.write(f"File {filename} not found".encode("utf-8"))

# --- RUN SERVICE ---
def run(port=8000):
    init_db()
    server_address = ("", port)
    httpd = HTTPServer(server_address, TransitOpsRequestHandler)
    print(f"TransitOps SQLite backend server is running on http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()

if __name__ == "__main__":
    run()
