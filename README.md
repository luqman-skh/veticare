# VetiCare - Veterinary Clinic Appointment & Pet Management System

**VetiCare** is a modern, desktop-based healthcare management web application designed for veterinary clinics to organize pet patient records, owner details, appointment schedules, clinical treatments, billing operations, and clinic analytics.

Unlike standard human medical systems, VetiCare maintains digital records specifically for pets and their owners. It pairs a **Node.js + Express API backend** with a **relational SQLite database (`veticare.db`)** and a responsive **Vanilla JS/CSS Single Page Application (SPA)**.

---

## 🌟 Key Features

### 👥 Owner Management
- Register pet owners with full contact info, home address, and emergency details.
- Real-time search and multi-attribute sorting (name, registration date, pet count).
- Comprehensive owner profile view detailing all linked pets and clinic interactions.

### 🐾 Pet & Patient Profiles
- Digital medical records for pets linked directly to their owners.
- Species filtering (Dogs, Cats, Birds, Rabbits, Reptiles, Others) and attribute sorting (name, age, weight).
- Dynamic age calculator converting birth dates into human-readable periods (e.g., `2 yrs 7m`).
- Health and vaccination status indicators (*Up-to-date*, *Partially Vaccinated*, *Not Vaccinated*).

### 📅 Appointment Scheduler
- Interactive monthly mini-calendar grid paired with a daily agenda timeline.
- **Double-Booking Collision Prevention**: Automatic validation alert preventing scheduling conflicts if a veterinarian is booked within a 30-minute block of another appointment.
- Appointment lifecycle tracking (*Scheduled*, *Completed*, *Cancelled*).
- One-click transition from a scheduled appointment to recording a treatment visit.

### 🩺 Clinical Visit & Treatment Records
- Log clinical visits with symptoms, primary diagnoses, prescribed medications/dosages, and internal notes.
- **Automated Vaccine Linkage**: Administering a vaccine during a visit automatically updates the patient's profile vaccination status to **"Up-to-date"**.

### 💳 Billing & Printable Receipts
- Automated invoice compilation for every treatment visit:
  - Base Consultation Fee ($50.00)
  - Clinical Treatment Charge
  - Pharmacy & Medicine Fee
  - Calculated Tax (8%)
  - Invoice Status (*Paid* / *Pending*)
- **Thermal Receipt Modal**: Thermal receipt template with custom `@media print` CSS overrides for seamless printing to physical thermal receipt printers or exporting clean PDFs.

### 📊 Clinic Insights & Reports Dashboard
- High-level metric counters (Total Revenue, Completed Consults, Vaccine Compliance Rate).
- **Revenue Summary Chart**: Dynamic SVG Area Line Chart displaying 7-day revenue trends.
- **Diagnosis Breakdown Chart**: Dynamic Horizontal SVG Bar Chart compiling top clinical diagnoses.
- **Booster Schedule Reminders**: Table highlighting non-vaccinated/partially-vaccinated pets with a direct *"Schedule Booster"* button prefilling appointment details.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: HTML5, Vanilla CSS3 (Design System, Dark/Light Themes, Glassmorphism), Vanilla JavaScript (ES6+ Modules, Fetch API).
- **Backend API**: Node.js, Express.js (`server.js`).
- **Database (DBMS)**: SQLite3 (`veticare.db`), relational tables with Foreign Keys and transactional integrity.
- **Development Tooling**: Vite (frontend bundler/dev server), Concurrently (multi-process manager).

---

## 🗄️ Relational Database Schema (`veticare.db`)

The SQLite database enforces primary keys, data types, and relational constraints (`FOREIGN KEY` with cascading deletes):

```sql
-- 1. Owners Table
CREATE TABLE owners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    emergencyContact TEXT,
    createdAt TEXT NOT NULL
);

-- 2. Pets Table
CREATE TABLE pets (
    id TEXT PRIMARY KEY,
    ownerId TEXT NOT NULL,
    name TEXT NOT NULL,
    species TEXT NOT NULL,
    breed TEXT NOT NULL,
    dob TEXT NOT NULL,
    weight REAL NOT NULL,
    vaccination TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY(ownerId) REFERENCES owners(id) ON DELETE CASCADE
);

-- 3. Appointments Table
CREATE TABLE appointments (
    id TEXT PRIMARY KEY,
    petId TEXT NOT NULL,
    vetName TEXT NOT NULL,
    dateTime TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL,
    FOREIGN KEY(petId) REFERENCES pets(id) ON DELETE CASCADE
);

-- 4. Treatments Table
CREATE TABLE treatments (
    id TEXT PRIMARY KEY,
    appointmentId TEXT,
    petId TEXT NOT NULL,
    dateTime TEXT NOT NULL,
    symptoms TEXT NOT NULL,
    diagnosis TEXT NOT NULL,
    medications TEXT,
    vaccineGiven TEXT,
    cost REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY(petId) REFERENCES pets(id) ON DELETE CASCADE
);

-- 5. Invoices Table
CREATE TABLE invoices (
    id TEXT PRIMARY KEY,
    treatmentId TEXT,
    petId TEXT NOT NULL,
    dateTime TEXT NOT NULL,
    consultationFee REAL NOT NULL,
    treatmentCost REAL NOT NULL,
    medicineCost REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    status TEXT NOT NULL,
    paymentMethod TEXT NOT NULL,
    reason TEXT NOT NULL,
    FOREIGN KEY(petId) REFERENCES pets(id) ON DELETE CASCADE
);
```

---

## 🚀 Setup & Launching Walkthrough

Follow these steps to set up and run VetiCare on your local machine:

### Prerequisites
Make sure you have **Node.js** (v16.0.0 or higher) and **npm** installed.
- Check Node version: `node -v`
- Check npm version: `npm -v`

### Step 1: Clone the Repository
```bash
git clone https://github.com/luqman-skh/veticare.git
cd veticare
```

### Step 2: Install Dependencies
Install all required Node.js packages (`express`, `cors`, `sqlite3`, `vite`, `concurrently`):
```bash
npm install
```

### Step 3: Run the Application
Start the Node.js Express API server and the Vite development server concurrently with a single command:
```bash
npm run dev
```

Upon launching:
1. The Express server starts on **`http://localhost:3000`**.
2. SQLite checks if `veticare.db` exists. If not, it automatically creates the database file, builds the table schemas, and seeds initial demo data.
3. Vite opens the frontend interface on **`http://localhost:5173`**.

### Step 4: Open in Browser
Navigate to **`http://localhost:5173`** in your web browser to interact with the application.

---

## 📡 REST API Summary

The backend exposes the following REST endpoints:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/owners` | `GET` | Retrieve all owner records |
| `/api/owners` | `POST` | Create or update an owner profile |
| `/api/pets` | `GET` | Retrieve all pet patient records |
| `/api/pets` | `POST` | Create or update a pet profile |
| `/api/appointments` | `GET` | Retrieve all scheduled appointments |
| `/api/appointments` | `POST` | Book or edit an appointment slot |
| `/api/appointments/:id/cancel` | `PUT` | Mark appointment as Cancelled |
| `/api/appointments/:id/complete` | `PUT` | Mark appointment as Completed |
| `/api/treatments` | `GET` | Retrieve all clinical treatment logs |
| `/api/treatments` | `POST` | Record a visit (creates treatment, generates invoice, updates vaccine status) |
| `/api/invoices` | `GET` | Retrieve all invoice transactions |
| `/api/invoices/:id/pay` | `PUT` | Record payment for an invoice (sets status to Paid) |

---

## 📄 License

Developed for educational and clinical management demonstration purposes.
