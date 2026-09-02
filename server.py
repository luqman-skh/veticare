import http.server
import socketserver
import json
import sqlite3
import urllib.parse
import os
import random
import time
from datetime import datetime

PORT = 8000
DB_FILE = os.path.join(os.path.dirname(__file__), "veticare.db")

def init_db():
    conn = sqlite3.connect(DB_FILE)
    c = conn.cursor()
    c.execute("PRAGMA foreign_keys = ON;")
    c.executescript("""
    CREATE TABLE IF NOT EXISTS owners (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL,
        email TEXT NOT NULL, address TEXT NOT NULL, emergencyContact TEXT, createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pets (
        id TEXT PRIMARY KEY, ownerId TEXT NOT NULL, name TEXT NOT NULL, species TEXT NOT NULL,
        breed TEXT NOT NULL, dob TEXT NOT NULL, weight REAL NOT NULL, vaccination TEXT NOT NULL, notes TEXT,
        FOREIGN KEY(ownerId) REFERENCES owners(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY, petId TEXT NOT NULL, vetName TEXT NOT NULL,
        dateTime TEXT NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL,
        FOREIGN KEY(petId) REFERENCES pets(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS treatments (
        id TEXT PRIMARY KEY, appointmentId TEXT, petId TEXT NOT NULL, dateTime TEXT NOT NULL,
        symptoms TEXT NOT NULL, diagnosis TEXT NOT NULL, medications TEXT, vaccineGiven TEXT,
        cost REAL NOT NULL, notes TEXT,
        FOREIGN KEY(petId) REFERENCES pets(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS invoices (
        id TEXT PRIMARY KEY, treatmentId TEXT, petId TEXT NOT NULL, dateTime TEXT NOT NULL,
        consultationFee REAL NOT NULL, treatmentCost REAL NOT NULL, medicineCost REAL NOT NULL,
        tax REAL NOT NULL, total REAL NOT NULL, status TEXT NOT NULL, paymentMethod TEXT NOT NULL, reason TEXT NOT NULL,
        FOREIGN KEY(petId) REFERENCES pets(id) ON DELETE CASCADE
    );
    """)
    
    # Check seed
    c.execute("SELECT COUNT(*) FROM owners")
    if c.fetchone()[0] == 0:
        today = datetime.now().strftime('%Y-%m-%d')
        c.executescript(f"""
        INSERT INTO owners VALUES 
        ('o-1', 'John Doe', '(555) 123-4567', 'john.doe@example.com', '742 Evergreen Terrace', 'Jane Doe', '2025-01-10T10:00:00Z'),
        ('o-2', 'Alice Smith', '(555) 987-6543', 'alice.smith@example.com', '123 Maple St', 'Bob Smith', '2025-03-14T14:30:00Z');

        INSERT INTO pets VALUES 
        ('p-1', 'o-1', 'Buddy', 'Dog', 'Golden Retriever', '2021-04-12', 32.4, 'Up-to-date', 'Friendly dog.'),
        ('p-2', 'o-2', 'Luna', 'Cat', 'Siamese', '2023-01-18', 4.2, 'Not Vaccinated', 'Indoor cat.');

        INSERT INTO appointments VALUES 
        ('a-1', 'p-1', 'Dr. S. Jenkins', '{today}T09:30', 'Annual Checkup', 'Completed'),
        ('a-2', 'p-2', 'Dr. S. Jenkins', '{today}T11:00', 'Ear Examination', 'Scheduled');

        INSERT INTO treatments VALUES 
        ('t-1', 'a-1', 'p-1', '{today}T09:30', 'Lethargy', 'Minor Allergy', 'Antihistamine', NULL, 120.00, 'Fully recovered.');

        INSERT INTO invoices VALUES 
        ('INV-1001', 't-1', 'p-1', '{today}T09:30', 50.00, 120.00, 15.00, 14.80, 199.80, 'Paid', 'Card', 'Minor Allergy');
        """)
    conn.commit()
    conn.close()

def query_db(query, args=(), one=False):
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute(query, args)
    rv = c.fetchall()
    conn.commit()
    conn.close()
    return [dict(r) for r in rv]

class VetiCareHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.startswith('/api/'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            data = {
                'owners': query_db('SELECT * FROM owners'),
                'pets': query_db('SELECT * FROM pets'),
                'appointments': query_db('SELECT * FROM appointments'),
                'treatments': query_db('SELECT * FROM treatments'),
                'invoices': query_db('SELECT * FROM invoices'),
            }
            self.wfile.write(json.dumps(data).encode('utf-8'))
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(content_length).decode('utf-8')) if content_length > 0 else {}
        
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()

        if parsed.path == '/api/owners':
            o_id = body.get('id') or f"o-{int(time.time()*1000)}"
            c.execute("INSERT OR REPLACE INTO owners VALUES (?, ?, ?, ?, ?, ?, ?)",
                      (o_id, body['name'], body['phone'], body['email'], body.get('address', ''), body.get('emergencyContact', ''), datetime.now().isoformat()))
            conn.commit()
            res = {'status': 'success', 'id': o_id}

        elif parsed.path == '/api/pets':
            p_id = body.get('id') or f"p-{int(time.time()*1000)}"
            c.execute("INSERT OR REPLACE INTO pets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                      (p_id, body['ownerId'], body['name'], body['species'], body['breed'], body['dob'], float(body['weight']), body['vaccination'], body.get('notes', '')))
            conn.commit()
            res = {'status': 'success', 'id': p_id}

        elif parsed.path == '/api/appointments':
            a_id = body.get('id') or f"a-{int(time.time()*1000)}"
            status = body.get('status') or 'Scheduled'
            c.execute("INSERT OR REPLACE INTO appointments VALUES (?, ?, ?, ?, ?, ?)",
                      (a_id, body['petId'], body['vetName'], body['dateTime'], body['reason'], status))
            conn.commit()
            res = {'status': 'success', 'id': a_id}

        elif parsed.path == '/api/treatments':
            t_id = body.get('id') or f"t-{int(time.time()*1000)}"
            inv_id = f"INV-{random.randint(1000, 9999)}"
            cost = float(body['cost'])
            meds_cost = 25.0 if body.get('vaccineGiven') else (15.0 if body.get('medications') else 0.0)
            subtotal = 50.0 + meds_cost + cost
            tax = subtotal * 0.08
            total = subtotal + tax

            c.execute("INSERT OR REPLACE INTO treatments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                      (t_id, body.get('appointmentId'), body['petId'], body['dateTime'], body['symptoms'], body['diagnosis'], body.get('medications'), body.get('vaccineGiven'), cost, body.get('notes', '')))
            c.execute("INSERT OR REPLACE INTO invoices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                      (inv_id, t_id, body['petId'], body['dateTime'], 50.0, cost, meds_cost, tax, total, 'Pending', 'Pending', body['diagnosis']))
            
            if body.get('vaccineGiven'):
                c.execute("UPDATE pets SET vaccination = 'Up-to-date' WHERE id = ?", (body['petId'],))
            
            conn.commit()
            res = {'status': 'success', 'id': t_id, 'invoiceId': inv_id}

        conn.close()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(res).encode('utf-8'))

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        conn = sqlite3.connect(DB_FILE)
        c = conn.cursor()

        if '/cancel' in parsed.path:
            a_id = parsed.path.split('/')[3]
            c.execute("UPDATE appointments SET status = 'Cancelled' WHERE id = ?", (a_id,))
        elif '/complete' in parsed.path:
            a_id = parsed.path.split('/')[3]
            c.execute("UPDATE appointments SET status = 'Completed' WHERE id = ?", (a_id,))
        elif '/pay' in parsed.path:
            inv_id = parsed.path.split('/')[3]
            c.execute("UPDATE invoices SET status = 'Paid', paymentMethod = 'Card' WHERE id = ?", (inv_id,))

        conn.commit()
        conn.close()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'status': 'success'}).encode('utf-8'))

if __name__ == '__main__':
    init_db()
    print(f"VetiCare Python Backend Server running on http://localhost:{PORT}")
    with socketserver.TCPServer(("", PORT), VetiCareHandler) as httpd:
        httpd.serve_forever()
