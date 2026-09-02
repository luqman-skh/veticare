# VetiCare - Veterinary Clinic Management System (Academic Submission Version)

**VetiCare** is a lightweight, academic-grade veterinary healthcare management application built with **Vanilla HTML5, CSS3, JavaScript**, and a **zero-dependency SQLite3 backend (`api.php` / `server.py`)**.

Designed specifically for inclusion in Bachelor's thesis and academic course project reports, the entire codebase is formatted into ~1,000 clean lines of code across 4 primary files—making it easy to print as a 20-30 page source code appendix.

---

## 🌟 Core Features

- 👥 **Owner Management**: Client directory, contact info, and pet linkage.
- 🐾 **Patient Directory**: Pet health profiles, species, breeds, weight, and vaccination history.
- 📅 **Appointment Scheduler**: Schedule vet consultation slots, cancel, and complete appointments.
- 🩺 **Clinical Visit Logs**: Record diagnoses, symptoms, treatments, administered vaccines, and fees.
- 💳 **Billing & Thermal Receipts**: Auto-generated invoices, payment processing, and printable thermal receipt modal.

---

## 🛠️ Codebase Structure (< 1,100 Total Lines)

| File | Purpose | Line Count |
| :--- | :--- | :--- |
| **`index.html`** | Single-page layout containing all views, tables & modals | ~240 lines |
| **`style.css`** | CSS Design system, responsive themes & thermal receipt print styling | ~160 lines |
| **`app.js`** | Unified client SPA engine (router, state management, modal logic, API calls) | ~280 lines |
| **`server.py` / `api.php`** | Zero-dependency SQLite API server & database auto-seeder | ~170 lines |

---

## 🚀 How to Run

### Option 1: Native Python Server (Zero Setup on Windows)
No npm or external pip packages required! Python comes standard with built-in SQLite3 and HTTP server.

1. Open terminal in the project directory:
   ```bash
   python server.py
   ```
2. Open your browser and go to:
   ```text
   http://localhost:8000
   ```

---

### Option 2: PHP Development Server (Academic Submission Stack)
If submitting or running in a PHP/XAMPP environment:

1. Start PHP's built-in web server:
   ```bash
   php -S localhost:8000
   ```
2. Open your browser and navigate to:
   ```text
   http://localhost:8000/index.html
   ```

---

## 🗄️ Relational Database Schema (`veticare.db`)

The system creates and manages 5 SQLite tables with foreign key constraints:
- `owners` (id, name, phone, email, address, emergencyContact, createdAt)
- `pets` (id, ownerId, name, species, breed, dob, weight, vaccination, notes)
- `appointments` (id, petId, vetName, dateTime, reason, status)
- `treatments` (id, appointmentId, petId, dateTime, symptoms, diagnosis, medications, vaccineGiven, cost, notes)
- `invoices` (id, treatmentId, petId, dateTime, consultationFee, treatmentCost, medicineCost, tax, total, status, paymentMethod, reason)
