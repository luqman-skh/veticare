# Walkthrough - VetiCare Final Implementation with SQLite DBMS Backend

We have successfully designed, built, and validated the complete **VetiCare Veterinary Clinic Appointment & Pet Management System** web application. 

The application is structured as a full **Client-Server Relational DBMS architecture** utilizing a local **SQLite database** on disk (`veticare.db`) and a **Node.js/Express API server** (`server.js`) to handle all business transactions via raw SQL queries.

---

## Technical Architecture & Database Design

### 1. Database Schema (`veticare.db`)
The system creates and manages 5 relational tables on startup, enforcing primary keys, data types, and relational constraints (`FOREIGN KEY` with cascading deletes):

```sql
-- 1. Owners Table
CREATE TABLE IF NOT EXISTS owners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    emergencycontact TEXT,
    created_at TEXT NOT NULL
);

-- 2. Pets Table
CREATE TABLE IF NOT EXISTS pets (
    id TEXT PRIMARY KEY,
    ownerid TEXT NOT NULL,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT NOT NULL,
    dob TEXT NOT NULL,
    weight REAL NOT NULL,
    vaccination TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY(ownerid) REFERENCES owners(id) ON DELETE CASCADE
);

-- 3. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    petid TEXT NOT NULL,
    vetname TEXT NOT NULL,
    date_time TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY(petid) REFERENCES pets(id) ON DELETE CASCADE
);

-- 4. Treatments Table (Visits log)
CREATE TABLE IF NOT EXISTS treatments (
    id TEXT PRIMARY KEY,
    appointmentId TEXT,
    petid TEXT NOT NULL,
    date_time TEXT NOT NULL,
    symptoms TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    medications TEXT,
    vaccineGiven TEXT,
    cost REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY(petid) REFERENCES pets(id) ON DELETE CASCADE
);

-- 5. Invoices Table (Transactions)
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    treatmentId TEXT,
    petid TEXT NOT NULL,
    date_time TEXT NOT NULL,
    consultationFee REAL NOT NULL,
    treatmentCost REAL NOT NULL,
    medicineCost REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL,
    paymentMethod TEXT NOT NULL,
    reason TEXT NOT NULL,
    FOREIGN KEY(petid) REFERENCES pets(id) ON DELETE CASCADE
);
```

### 2. Express Backend REST API (`server.js`)
Exposes CRUD endpoints that perform raw SQL executions on the SQLite database:
- `GET /api/owners` / `POST /api/owners` (Executes `SELECT` and `INSERT`/`UPDATE` queries)
- `GET /api/pets` / `POST /api/pets` (Persists pet details linked to `owners`)
- `GET /api/appointments` / `POST /api/appointments` (Enforces slot bookings and cancellations)
- `POST /api/treatments` (Performs a **SQL Transaction** enclosing treatment records, auto-generating a pending invoice, and updating the pet's vaccination status)
- `GET /api/invoices` / `PUT /api/invoices/:id/pay` (Pushes invoice statuses from `Pending` to `Paid`)

### 3. Frontend Integration (`app.js`)
- Exposes `app.db.loadState()` which asynchronously fetches all tables from the DBMS and keeps a local memory cache in `app.db.state`.
- All save forms (`owners.js`, `pets.js`, `appointments.js`, `treatments.js`, `billing.js`) make asynchronous `fetch` requests (e.g. `POST /api/treatments`) and reload the cache upon completion.
- Navigation router automatically loads the latest backend state before rendering views, ensuring real-time syncing.

---

## Running the Application
The package scripts are configured using `concurrently` so that starting the app spawns both servers simultaneously:
```bash
# Starts Node API on Port 3000, SQLite DBMS, and Vite UI on Port 5173
npm run dev
```

---

## Verification & Validation Results

We verified the complete relational flow using browser subagents, validating that data is saved and persisted inside `veticare.db` across runs:
1. **Owner Registration**: Added owner **Marcus Aurelius**. His contact and billing details were saved into SQLite.
2. **Pet Patient Listing**: Registered **Shadow** (a Belgian Malinois dog) under Marcus's profile, verifying DOB calculations.
3. **Scheduler & Collision checks**: Booked Shadow for Dr. A. R. Shaikh today at 11:30 AM.
4. **Treatment Transaction**: Marked the appointment complete and filled Shadow's treatment record (cost $70.00, Rabies Vaccine shot).
5. **Invoicing & Payments**: Located the generated invoice `INV-7300` ($156.60 total) in the Billing ledger. Recorded payment (updated status to "Paid" via SQL).
6. **Vaccination Syncing**: Verified Shadow's pet profile status automatically updated to "Up-to-date".

### Browser Execution Logs & Video:
* [DBMS Relational CRUD Verification WebP](file:///C:/Users/skhlu/.gemini/antigravity-ide/brain/bd681d05-5c85-41ea-a1b9-092db6aee1ae/verify_sqlite_dbms_flow_part2_1788037399448.webp)
