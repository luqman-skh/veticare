<?php
/**
 * VetiCare - SQLite REST API (PHP PDO Backend)
 * Academic Project Submission Engine
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// 1. Database Connection & Table Initialization
$dbFile = __DIR__ . '/veticare.db';
$db = new PDO('sqlite:' . $dbFile);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec('PRAGMA foreign_keys = ON;');

// Create Database Schemas
$db->exec("
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
");

// Seed Initial Data if empty
$count = $db->query("SELECT COUNT(*) FROM owners")->fetchColumn();
if ($count == 0) {
    $today = date('Y-m-d');
    $db->exec("
    INSERT INTO owners VALUES 
    ('o-1', 'John Doe', '(555) 123-4567', 'john.doe@example.com', '742 Evergreen Terrace', 'Jane Doe', '2025-01-10T10:00:00Z'),
    ('o-2', 'Alice Smith', '(555) 987-6543', 'alice.smith@example.com', '123 Maple St', 'Bob Smith', '2025-03-14T14:30:00Z');

    INSERT INTO pets VALUES 
    ('p-1', 'o-1', 'Buddy', 'Dog', 'Golden Retriever', '2021-04-12', 32.4, 'Up-to-date', 'Friendly dog.'),
    ('p-2', 'o-2', 'Luna', 'Cat', 'Siamese', '2023-01-18', 4.2, 'Not Vaccinated', 'Indoor cat.');

    INSERT INTO appointments VALUES 
    ('a-1', 'p-1', 'Dr. S. Jenkins', '{$today}T09:30', 'Annual Checkup', 'Completed'),
    ('a-2', 'p-2', 'Dr. S. Jenkins', '{$today}T11:00', 'Ear Examination', 'Scheduled');

    INSERT INTO treatments VALUES 
    ('t-1', 'a-1', 'p-1', '{$today}T09:30', 'Lethargy', 'Minor Allergy', 'Antihistamine', NULL, 120.00, 'Fully recovered.');

    INSERT INTO invoices VALUES 
    ('INV-1001', 't-1', 'p-1', '{$today}T09:30', 50.00, 120.00, 15.00, 14.80, 199.80, 'Paid', 'Card', 'Minor Allergy');
    ");
}

// 2. Request Routing Logic
$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

try {
    if ($action === 'get_data' || $_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode([
            'owners' => $db->query("SELECT * FROM owners")->fetchAll(PDO::FETCH_ASSOC),
            'pets' => $db->query("SELECT * FROM pets")->fetchAll(PDO::FETCH_ASSOC),
            'appointments' => $db->query("SELECT * FROM appointments")->fetchAll(PDO::FETCH_ASSOC),
            'treatments' => $db->query("SELECT * FROM treatments")->fetchAll(PDO::FETCH_ASSOC),
            'invoices' => $db->query("SELECT * FROM invoices")->fetchAll(PDO::FETCH_ASSOC),
        ]);
        exit;
    }

    if ($action === 'save_owner') {
        $id = $input['id'] ?? ('o-' . time());
        $stmt = $db->prepare("INSERT OR REPLACE INTO owners (id, name, phone, email, address, emergencyContact, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $input['name'], $input['phone'], $input['email'], $input['address'], $input['emergencyContact'] ?? '', date('c')]);
        echo json_encode(['status' => 'success', 'id' => $id]);
        exit;
    }

    if ($action === 'save_pet') {
        $id = $input['id'] ?? ('p-' . time());
        $stmt = $db->prepare("INSERT OR REPLACE INTO pets (id, ownerId, name, species, breed, dob, weight, vaccination, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $input['ownerId'], $input['name'], $input['species'], $input['breed'], $input['dob'], (float)$input['weight'], $input['vaccination'], $input['notes'] ?? '']);
        echo json_encode(['status' => 'success', 'id' => $id]);
        exit;
    }

    if ($action === 'save_appointment') {
        $id = $input['id'] ?? ('a-' . time());
        $status = $input['status'] ?? 'Scheduled';
        $stmt = $db->prepare("INSERT OR REPLACE INTO appointments (id, petId, vetName, dateTime, reason, status) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$id, $input['petId'], $input['vetName'], $input['dateTime'], $input['reason'], $status]);
        echo json_encode(['status' => 'success', 'id' => $id]);
        exit;
    }

    if ($action === 'cancel_appointment') {
        $stmt = $db->prepare("UPDATE appointments SET status = 'Cancelled' WHERE id = ?");
        $stmt->execute([$input['id']]);
        echo json_encode(['status' => 'success']);
        exit;
    }

    if ($action === 'complete_appointment') {
        $stmt = $db->prepare("UPDATE appointments SET status = 'Completed' WHERE id = ?");
        $stmt->execute([$input['id']]);
        echo json_encode(['status' => 'success']);
        exit;
    }

    if ($action === 'save_treatment') {
        $db->beginTransaction();
        $tId = $input['id'] ?? ('t-' . time());
        $invId = 'INV-' . rand(1000, 9999);
        $cost = (float)$input['cost'];
        $medsCost = !empty($input['vaccineGiven']) ? 25.0 : (!empty($input['medications']) ? 15.0 : 0.0);
        $subtotal = 50.0 + $medsCost + $cost;
        $tax = $subtotal * 0.08;
        $total = $subtotal + $tax;

        // Insert Treatment
        $stmt = $db->prepare("INSERT OR REPLACE INTO treatments (id, appointmentId, petId, dateTime, symptoms, diagnosis, medications, vaccineGiven, cost, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$tId, $input['appointmentId'] ?? null, $input['petId'], $input['dateTime'], $input['symptoms'], $input['diagnosis'], $input['medications'] ?? null, $input['vaccineGiven'] ?? null, $cost, $input['notes'] ?? '']);

        // Insert Invoice
        $stmt2 = $db->prepare("INSERT OR REPLACE INTO invoices (id, treatmentId, petId, dateTime, consultationFee, treatmentCost, medicineCost, tax, total, status, paymentMethod, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt2->execute([$invId, $tId, $input['petId'], $input['dateTime'], 50.0, $cost, $medsCost, $tax, $total, 'Pending', 'Pending', $input['diagnosis']]);

        // Auto-update Vaccine Status if vaccine given
        if (!empty($input['vaccineGiven'])) {
            $stmt3 = $db->prepare("UPDATE pets SET vaccination = 'Up-to-date' WHERE id = ?");
            $stmt3->execute([$input['petId']]);
        }

        $db->commit();
        echo json_encode(['status' => 'success', 'id' => $tId, 'invoiceId' => $invId]);
        exit;
    }

    if ($action === 'pay_invoice') {
        $stmt = $db->prepare("UPDATE invoices SET status = 'Paid', paymentMethod = 'Card' WHERE id = ?");
        $stmt->execute([$input['id']]);
        echo json_encode(['status' => 'success']);
        exit;
    }
} catch (Exception $e) {
    if ($db->inTransaction()) $db->rollBack();
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
