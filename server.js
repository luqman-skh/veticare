/**
 * VetiCare - Node.js Backend API Server
 * Uses Express and SQLite3 for DBMS integration.
 */

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Open SQLite Database connection
const dbPath = path.resolve(__dirname, 'veticare.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening SQLite database:', err.message);
    } else {
        console.log('Connected to SQLite database at:', dbPath);
        initializeDatabase();
    }
});

// Helper wrapper to run db.run with Promises
const dbRun = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

// Helper wrapper to run db.all with Promises
const dbAll = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

// Helper wrapper to run db.get with Promises
const dbGet = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

// Initialize Database schema and seed default data
async function initializeDatabase() {
    try {
        // Enable Foreign Keys
        await dbRun("PRAGMA foreign_keys = ON;");

        // 1. Create Owners Table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS owners (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                phone TEXT NOT NULL,
                email TEXT NOT NULL,
                address TEXT NOT NULL,
                emergencyContact TEXT,
                createdAt TEXT NOT NULL
            );
        `);

        // 2. Create Pets Table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS pets (
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
        `);

        // 3. Create Appointments Table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS appointments (
                id TEXT PRIMARY KEY,
                petId TEXT NOT NULL,
                vetName TEXT NOT NULL,
                dateTime TEXT NOT NULL,
                reason TEXT NOT NULL,
                status TEXT NOT NULL,
                FOREIGN KEY(petId) REFERENCES pets(id) ON DELETE CASCADE
            );
        `);

        // 4. Create Treatments Table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS treatments (
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
        `);

        // 5. Create Invoices Table
        await dbRun(`
            CREATE TABLE IF NOT EXISTS invoices (
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
        `);

        console.log('Database relational schemas verified.');

        // Seed data if empty
        const ownersCount = await dbGet("SELECT COUNT(*) as count FROM owners");
        if (ownersCount.count === 0) {
            console.log('Database empty. Seeding default data...');
            await seedDefaultData();
        }
    } catch (err) {
        console.error('Database initialization error:', err.message);
    }
}

async function seedDefaultData() {
    // 1. Seed Owners
    const defaultOwners = [
        ['o-1', 'John Doe', '(555) 123-4567', 'john.doe@example.com', '742 Evergreen Terrace, Springfield', 'Jane Doe - (555) 123-4568', '2025-01-10T10:00:00.000Z'],
        ['o-2', 'Alice Smith', '(555) 987-6543', 'alice.smith@example.com', '123 Maple St, Oakville', 'Bob Smith - (555) 987-6544', '2025-03-14T14:30:00.000Z'],
        ['o-3', 'David Miller', '(555) 456-7890', 'david.miller@example.com', '456 Pine Rd, Pineville', 'Sarah Miller - (555) 456-7891', '2025-06-20T09:15:00.000Z'],
        ['o-4', 'Emily Watson', '(555) 321-7654', 'emily.w@example.com', '789 Birch Ave, Riverdale', 'Arthur Watson - (555) 321-7650', '2025-11-05T16:00:00.000Z']
    ];
    for (const owner of defaultOwners) {
        await dbRun("INSERT INTO owners VALUES (?, ?, ?, ?, ?, ?, ?)", owner);
    }

    // 2. Seed Pets
    const defaultPets = [
        ['p-1', 'o-1', 'Buddy', 'Dog', 'Golden Retriever', '2021-04-12', 32.4, 'Up-to-date', 'Friendly, loves tennis balls. Allergic to penicillin.'],
        ['p-2', 'o-2', 'Luna', 'Cat', 'Siamese', '2023-01-18', 4.2, 'Up-to-date', 'Quiet, easily startled. Indoor cat.'],
        ['p-3', 'o-2', 'Max', 'Dog', 'French Bulldog', '2022-09-05', 12.1, 'Partially Vaccinated', 'Mild skin allergies. Needs special hypoallergenic diet.'],
        ['p-4', 'o-3', 'Coco', 'Bird', 'Cockatiel', '2024-03-01', 0.1, 'Not Vaccinated', 'Loves mimicking whistles. Prefers sunflower seeds.'],
        ['p-5', 'o-4', 'Rocky', 'Dog', 'German Shepherd', '2020-11-20', 38.0, 'Up-to-date', 'Loyal guard dog, highly trained. Calm around other pets.']
    ];
    for (const pet of defaultPets) {
        await dbRun("INSERT INTO pets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", pet);
    }

    // 3. Seed Appointments
    const today = new Date().toISOString().split('T')[0];
    const defaultAppointments = [
        ['a-1', 'p-1', 'Dr. S. Jenkins', `${today}T09:30`, 'Annual Checkup & Vaccines', 'Completed'],
        ['a-2', 'p-2', 'Dr. S. Jenkins', `${today}T11:00`, 'Ear Infection Examination', 'Scheduled'],
        ['a-3', 'p-3', 'Dr. S. Jenkins', `${today}T14:30`, 'Skin Allergy Follow-up', 'Scheduled'],
        ['a-4', 'p-5', 'Dr. S. Jenkins', '2026-08-02T10:00', 'Routine Checkup & Rabies Shot', 'Scheduled']
    ];
    for (const apt of defaultAppointments) {
        await dbRun("INSERT INTO appointments VALUES (?, ?, ?, ?, ?, ?)", apt);
    }

    // 4. Seed Treatments
    const defaultTreatments = [
        ['t-1', 'a-1', 'p-1', '2025-11-12T10:15', 'Lethargy and mild vomiting', 'Minor Food Poisoning (Ingested spoiled grass)', 'Anti-emetic syrup, light diet for 48 hours', undefined, 120.00, 'Fully recovered. Owner advised to keep dog away from compost bin.'],
        ['t-2', undefined, 'p-3', '2026-06-15T15:00', 'Severe itching skin and red paws', 'Seasonal Atopic Dermatitis', 'Apoquel 5mg daily, medicated shampoo bath twice weekly', undefined, 85.00, 'Follow-up appointment scheduled for checkup.']
    ];
    for (const t of defaultTreatments) {
        await dbRun("INSERT INTO treatments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", t);
    }

    // 5. Seed Invoices
    const defaultInvoices = [
        ['INV-1001', 't-1', 'p-1', '2025-11-12T10:15', 50.00, 120.00, 15.00, 14.80, 199.80, 'Paid', 'Card', 'Minor Food Poisoning (Ingested spoiled grass)'],
        ['INV-1002', 't-2', 'p-3', '2026-06-15T15:00', 50.00, 85.00, 25.00, 12.80, 172.80, 'Pending', 'Pending', 'Seasonal Atopic Dermatitis']
    ];
    for (const inv of defaultInvoices) {
        await dbRun("INSERT INTO invoices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", inv);
    }

    console.log('Database seed data successfully inserted.');
}

// ==================== REST API ENDPOINTS ====================

// --- Owners API ---
app.get('/api/owners', async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM owners ORDER BY name ASC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/owners', async (req, res) => {
    const { id, name, phone, email, address, emergencyContact, createdAt } = req.body;
    if (!name || !phone || !email || !address) {
        return res.status(400).json({ error: 'Required fields missing: name, phone, email, address.' });
    }

    const oId = id || 'o-' + Date.now();
    const createdDate = createdAt || new Date().toISOString();

    try {
        const existing = await dbGet("SELECT id FROM owners WHERE id = ?", [oId]);
        if (existing) {
            // Update
            await dbRun(
                "UPDATE owners SET name = ?, phone = ?, email = ?, address = ?, emergencyContact = ? WHERE id = ?",
                [name, phone, email, address, emergencyContact, oId]
            );
            res.json({ message: 'Owner profile updated successfully.', id: oId });
        } else {
            // Insert
            await dbRun(
                "INSERT INTO owners VALUES (?, ?, ?, ?, ?, ?, ?)",
                [oId, name, phone, email, address, emergencyContact, createdDate]
            );
            res.status(201).json({ message: 'Owner profile created successfully.', id: oId });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Pets API ---
app.get('/api/pets', async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM pets ORDER BY name ASC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/pets', async (req, res) => {
    const { id, ownerId, name, species, breed, dob, weight, vaccination, notes } = req.body;
    if (!ownerId || !name || !species || !breed || !dob || isNaN(weight)) {
        return res.status(400).json({ error: 'Required fields missing or invalid.' });
    }

    const pId = id || 'p-' + Date.now();

    try {
        const existing = await dbGet("SELECT id FROM pets WHERE id = ?", [pId]);
        if (existing) {
            // Update
            await dbRun(
                "UPDATE pets SET ownerId = ?, name = ?, species = ?, breed = ?, dob = ?, weight = ?, vaccination = ?, notes = ? WHERE id = ?",
                [ownerId, name, species, breed, dob, weight, vaccination, notes, pId]
            );
            res.json({ message: 'Pet profile updated successfully.', id: pId });
        } else {
            // Insert
            await dbRun(
                "INSERT INTO pets VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [pId, ownerId, name, species, breed, dob, weight, vaccination, notes]
            );
            res.status(201).json({ message: 'Pet profile created successfully.', id: pId });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Appointments API ---
app.get('/api/appointments', async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM appointments ORDER BY dateTime ASC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/appointments', async (req, res) => {
    const { id, petId, vetName, dateTime, reason, status } = req.body;
    if (!petId || !vetName || !dateTime || !reason || !status) {
        return res.status(400).json({ error: 'Required fields missing.' });
    }

    const aId = id || 'a-' + Date.now();

    try {
        const existing = await dbGet("SELECT id FROM appointments WHERE id = ?", [aId]);
        if (existing) {
            await dbRun(
                "UPDATE appointments SET petId = ?, vetName = ?, dateTime = ?, reason = ?, status = ? WHERE id = ?",
                [petId, vetName, dateTime, reason, status, aId]
            );
            res.json({ message: 'Appointment updated successfully.', id: aId });
        } else {
            await dbRun(
                "INSERT INTO appointments VALUES (?, ?, ?, ?, ?, ?)",
                [aId, petId, vetName, dateTime, reason, status]
            );
            res.status(201).json({ message: 'Appointment booked successfully.', id: aId });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Cancel or Complete Appointments
app.put('/api/appointments/:id/cancel', async (req, res) => {
    const { id } = req.params;
    try {
        await dbRun("UPDATE appointments SET status = 'Cancelled' WHERE id = ?", [id]);
        res.json({ message: 'Appointment status updated to Cancelled.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/appointments/:id/complete', async (req, res) => {
    const { id } = req.params;
    try {
        await dbRun("UPDATE appointments SET status = 'Completed' WHERE id = ?", [id]);
        res.json({ message: 'Appointment status updated to Completed.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Treatments API (Visit log + Automatic Invoice generation) ---
app.get('/api/treatments', async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM treatments ORDER BY dateTime DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/treatments', async (req, res) => {
    const { id, appointmentId, petId, dateTime, symptoms, diagnosis, medications, vaccineGiven, cost, notes } = req.body;
    if (!petId || !dateTime || !symptoms || !diagnosis || isNaN(cost)) {
        return res.status(400).json({ error: 'Required fields missing or invalid.' });
    }

    const tId = id || 't-' + Date.now();
    
    // Invoicing calculations
    const baseConsultation = 50.00;
    const medsCost = vaccineGiven ? 25.00 : (medications ? 15.00 : 0.00);
    const subtotal = baseConsultation + medsCost + Number(cost);
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    try {
        // Encase DB writes inside SQL Transaction
        await dbRun("BEGIN TRANSACTION;");

        const existingTreatment = await dbGet("SELECT id FROM treatments WHERE id = ?", [tId]);
        
        if (existingTreatment) {
            // Update treatment
            await dbRun(
                `UPDATE treatments 
                 SET appointmentId = ?, petId = ?, dateTime = ?, symptoms = ?, diagnosis = ?, medications = ?, vaccineGiven = ?, cost = ?, notes = ? 
                 WHERE id = ?`,
                [appointmentId, petId, dateTime, symptoms, diagnosis, medications, vaccineGiven, cost, notes, tId]
            );

            // Update associated invoice (recalculates fees)
            await dbRun(
                `UPDATE invoices 
                 SET petId = ?, dateTime = ?, treatmentCost = ?, medicineCost = ?, tax = ?, total = ?, reason = ? 
                 WHERE treatmentId = ?`,
                [petId, dateTime, cost, medsCost, tax, total, diagnosis, tId]
            );
        } else {
            // Insert treatment
            await dbRun(
                "INSERT INTO treatments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [tId, appointmentId, petId, dateTime, symptoms, diagnosis, medications, vaccineGiven, cost, notes]
            );

            // Insert new pending invoice
            const invId = 'INV-' + (Math.floor(Math.random() * 9000) + 1000);
            await dbRun(
                "INSERT INTO invoices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [invId, tId, petId, dateTime, baseConsultation, cost, medsCost, tax, total, 'Pending', 'Pending', diagnosis]
            );
        }

        // If vaccine administered, update pet status automatically
        if (vaccineGiven) {
            await dbRun("UPDATE pets SET vaccination = 'Up-to-date' WHERE id = ?", [petId]);
        }

        await dbRun("COMMIT;");
        res.status(201).json({ message: 'Clinical treatment saved and invoice registered.', id: tId });
    } catch (err) {
        await dbRun("ROLLBACK;");
        res.status(500).json({ error: err.message });
    }
});

// --- Invoices API ---
app.get('/api/invoices', async (req, res) => {
    try {
        const rows = await dbAll("SELECT * FROM invoices ORDER BY dateTime DESC");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/invoices/:id/pay', async (req, res) => {
    const { id } = req.params;
    try {
        await dbRun("UPDATE invoices SET status = 'Paid', paymentMethod = 'Card' WHERE id = ?", [id]);
        res.json({ message: `Invoice ${id} payment recorded.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Start Express Server
app.listen(PORT, () => {
    console.log(`VetiCare Backend DBMS Server listening on port ${PORT}`);
});
