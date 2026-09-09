import os
from docx.shared import Pt, Inches
from docx.enum.table import WD_TABLE_ALIGNMENT
from .common import (
    add_chapter_title, add_heading_1, add_heading_2, add_heading_3,
    add_body_paragraph, add_figure_image, set_cell_margins, set_cell_shading
)

def build_chapter_4(doc):
    doc.add_page_break()
    add_chapter_title(doc, "Chapter IV", "System Design")

    add_heading_1(doc, "4.1 Design Philosophy & Architectural Principles")
    add_body_paragraph(doc, "System Design transforms functional and non-functional requirements into detailed architectural blueprints, relational schemas, data flow models, and interaction diagrams. VetiCare adheres to four fundamental software design principles:")
    add_body_paragraph(doc, "1. Separation of Concerns (SoC): Decoupling the client presentation layer (`index.html`, `app.js`), application REST API layer (`server.py` / `api.php`), and data layer (`veticare.db`).")
    add_body_paragraph(doc, "2. High Cohesion and Low Coupling: Module functions (`app.owners`, `app.pets`, `app.appointments`, `app.treatments`, `app.billing`) operate independently while interacting through standard API endpoints.")
    add_body_paragraph(doc, "3. Declarative Relational Integrity: Enforcing primary keys, data types, and cascading foreign keys (`ON DELETE CASCADE`) directly at the DBMS engine level.")
    add_body_paragraph(doc, "4. Zero-Dependency Simplicity: Eliminating external third-party framework overhead to maximize execution speed, security, and academic auditability.")

    add_heading_1(doc, "4.2 Decoupled 3-Tier Layered Architecture")
    add_body_paragraph(doc, "VetiCare is architected around a 3-Tier Client-Server model, as depicted in Figure 4.1 below:")

    add_figure_image(doc, "Architecture diagram.png", "VetiCare Client-Server Layered System Architecture Blueprint", "Fig 4.1", width_inches=5.8)

    add_body_paragraph(doc, "Presentation Layer (Tier 1): Implemented using HTML5, CSS3, and ES6 JavaScript (`app.js`). Manages user input forms, renders dynamic card grids, handles hash routing, manages local state (`app.state`), and formats thermal receipt modal views.")
    add_body_paragraph(doc, "Application API Layer (Tier 2): Implemented using native Python HTTP server (`server.py`) or PHP PDO script (`api.php`). Manages REST request routing, executes auto-invoicing math, enforces transaction atomicity, and updates vaccine statuses.")
    add_body_paragraph(doc, "Data DBMS Layer (Tier 3): Embedded SQLite database (`veticare.db`) storing 5 relational tables on disk with foreign key cascade rules.")

    add_heading_1(doc, "4.3 Data Flow Diagrams")
    add_body_paragraph(doc, "Data Flow Diagrams (DFDs) visually model data movement, process transformations, external entities, and database data stores within VetiCare.")

    add_heading_2(doc, "4.3.1 Context Level 0 Data Flow Diagram")
    add_body_paragraph(doc, "The Context Level 0 DFD (Figure 4.2) illustrates the high-level system boundary between clinic staff and the VetiCare core system.")

    add_figure_image(doc, "Data Flow diagrams.png", "Context Level 0 Data Flow Diagram for Veterinary Clinic Operations", "Fig 4.2", width_inches=5.8)

    add_body_paragraph(doc, "External Actor: Clinic Staff / Receptionist / Veterinary Surgeon\n"
                            "  ---> Input Data Streams: Owner Information, Pet Demographic Data, Appointment Booking Details, Clinical Treatment Log, Payment Method\n"
                            "  ===> Central System: VETICARE VETERINARY CLINIC MANAGEMENT SYSTEM (Process 0.0)\n"
                            "  <--- Output Data Streams: Registered Owner Profile, Pet Health Card & Vaccine Badge, Consultation Agenda, Itemized Invoice, Thermal Receipt")

    add_heading_2(doc, "4.3.2 Level 1 Data Flow Diagram")
    add_body_paragraph(doc, "The Level 1 DFD (Figure 4.3) decomposes Process 0.0 into four major sub-processes: Process 1.0 (Owner & Pet Registration), Process 2.0 (Appointment Scheduler), Process 3.0 (Treatment Recording & Vaccine Sync), and Process 4.0 (Invoice Generation & Billing).")

    add_figure_image(doc, "Data Flow diagrams.png", "Level 1 Data Flow Diagram of Clinical Visit & Billing Transactions", "Fig 4.3", width_inches=5.8)

    add_body_paragraph(doc, "[Process Breakdown - Level 1 DFD]\n"
                            "Process 1.0 Owner & Pet Management: Receives Client/Pet data -> Validates & Writes to Data Stores (D1: owners, D2: pets)\n"
                            "Process 2.0 Appointment Scheduler: Receives Booking parameters -> Validates Pet ID -> Writes to Data Store (D3: appointments)\n"
                            "Process 3.0 Treatment & Vaccine Engine: Receives Visit details -> Writes (D4: treatments) -> Updates (D2: pets vaccination status)\n"
                            "Process 4.0 Invoicing & Billing Engine: Calculates Fees & Taxes -> Writes (D5: invoices) -> Updates Status on Payment -> Emits Thermal Receipt View")

    add_heading_2(doc, "4.3.3 Detailed Process Decomposition and Data Transformation Logic")
    add_body_paragraph(doc, "Process 1.1 (Validate Owner Data): Receives raw HTML form input strings, verifies regex formatting for email and telephone numbers, generates unique owner ID (`o-xxxx`), and packages validated attributes for SQL insertion into Data Store D1 (`owners`).")
    add_body_paragraph(doc, "Process 1.2 (Validate Pet Demographic Data): Validates species classification, computes date of birth constraints, checks foreign key existence of `ownerId` in D1, assigns default vaccination status ('Not Vaccinated'), and persists record to Data Store D2 (`pets`).")
    add_body_paragraph(doc, "Process 2.1 (Schedule Consultation Slot): Queries Data Store D3 (`appointments`) to verify surgeon availability, validates requested date/time slot, initializes status to 'Scheduled', and inserts booking record into D3.")
    add_body_paragraph(doc, "Process 3.1 (Log Clinical Consultation): Accepts clinical examination inputs (symptoms, diagnosis, medications, vaccine name, cost), links visit record to `petId`, and writes clinical visit record to Data Store D4 (`treatments`).")
    add_body_paragraph(doc, "Process 3.2 (Synchronize Immunization Status): Evaluates `vaccineGiven` string from Process 3.1. If non-empty, constructs and executes SQL UPDATE query modifying `pets.vaccination` column in D2 (`pets`) to 'Up-to-date'.")
    add_body_paragraph(doc, "Process 4.1 (Compute Line-Item Invoicing Math): Reads procedure cost ($) and pharmacy items from Process 3.1, adds standard consultation fee ($50.00), computes 8% sales tax, generates unique invoice ID (`INV-xxxx`), and writes pending transaction to Data Store D5 (`invoices`).")
    add_body_paragraph(doc, "Process 4.2 (Process Payment & Thermal POS Printing): Accepts payment completion command, updates payment status in D5 from 'Pending' to 'Paid', records payment method ('Card'/'Cash'), and formats POS thermal receipt layout for browser printing.")

    add_heading_2(doc, "4.3.4 Level 2 Data Flow Diagram Decomposition for Clinical Visit & Billing Transactions")
    add_body_paragraph(doc, "To provide deep structural insight into the critical visit and financial transaction engines, Process 3.0 and Process 4.0 are decomposed into their Level 2 sub-processes:")
    add_body_paragraph(doc, "• Decomposition of Process 3.0 (Clinical Visit & Treatment Engine):\n"
                            "  - Process 3.1 (Form Extraction & Validation): Extracts `appointmentId`, `petId`, `symptoms`, `diagnosis`, `medications`, `vaccineGiven`, and `cost`. Enforces non-negative numerical bounds on `cost`.\n"
                            "  - Process 3.2 (Treatment Record Insertion): Generates unique primary key `t-xxxx`, binds SQL parameters, and executes `INSERT INTO treatments`.\n"
                            "  - Process 3.3 (Vaccine Status Evaluation): Evaluates string length of `vaccineGiven`. If valid shot name detected, triggers UPDATE on `pets`.\n"
                            "  - Process 3.4 (Trigger Invoicing Engine): Transfers validated cost parameters and clinical context to Process 4.0.")
    add_body_paragraph(doc, "• Decomposition of Process 4.0 (Invoicing, Billing & POS Print Engine):\n"
                            "  - Process 4.1 (Fee Math Calculation): Applies fixed base consultation fee ($50.00), procedure fee, pharmacy charges, and 8% tax calculation.\n"
                            "  - Process 4.2 (Invoice Persistence): Generates `INV-xxxx`, sets initial status to 'Pending', and writes record to Data Store D5 (`invoices`).\n"
                            "  - Process 4.3 (Payment Reconciliation): Receives tender method ('Card'/'Cash'), executes SQL UPDATE query changing status to 'Paid'.\n"
                            "  - Process 4.4 (Thermal POS Formatting): Renders HTML receipt template, applies CSS `@media print` rules, and triggers browser print engine.")

    add_heading_1(doc, "4.4 Use Case Modeling & Tabular Specifications")
    add_body_paragraph(doc, "The Use Case Diagram (Figure 4.4) models user interactions with system functional requirements across three primary actors: Veterinary Receptionists, Veterinary Surgeons, and Clinic Administrators.")

    add_figure_image(doc, "Use case diagram.png", "Use Case Diagram for Veterinary Staff, Receptionists, and Vets", "Fig 4.4", width_inches=5.8)

    ucs = [
        ("UC-01: Register & Search Pet Owners", "Receptionist inputs owner details (name, phone, email, address). System validates input and persists to `owners` table."),
        ("UC-02: Register & Manage Pet Patient Profile", "Staff selects owner and inputs pet details (name, species, breed, DOB, weight). System links pet to owner and sets initial vaccination badge."),
        ("UC-03: Book & Cancel Appointments", "Receptionist schedules consultation slot specifying vet name, date/time, and reason. Status transitions from 'Scheduled' to 'Completed' or 'Cancelled'."),
        ("UC-04: Record Clinical Visit & Vaccine Shot", "Veterinarian inputs diagnosis, symptoms, prescribed meds, vaccines given, and cost. System logs treatment, auto-generates invoice, and updates pet vaccine status to 'Up-to-date'."),
        ("UC-05: Process Invoice Payments", "Administrative staff views pending invoices, records payment completion (status 'Paid', method 'Card'/'Cash'), and updates financial ledger."),
        ("UC-06: Print Thermal Receipt", "Staff launches thermal receipt modal for selected invoice and triggers browser printing.")
    ]
    for uc_id, uc_desc in ucs:
        add_body_paragraph(doc, uc_desc, bold_prefix=f"{uc_id}: ")

    add_heading_2(doc, "Detailed Tabular Use Case Specifications")
    add_body_paragraph(doc, "Use Case UC-04 (Record Clinical Visit & Vaccine Shot):")
    add_body_paragraph(doc, "• Primary Actor: Veterinary Surgeon\n"
                            "• Pre-conditions: Patient appointment exists in 'Scheduled' status; Pet profile registered in `pets` table.\n"
                            "• Trigger: Vet clicks 'Complete' action button on scheduled appointment row in daily agenda.\n"
                            "• Main Success Scenario:\n"
                            "  1. System opens treatment entry modal with pre-selected Pet ID.\n"
                            "  2. Vet inputs symptoms, diagnosis, medications, vaccine name, and procedure fee ($).\n"
                            "  3. Vet clicks 'Save Clinical Visit Record'.\n"
                            "  4. System validates inputs and sends HTTP POST request to `/api/treatments`.\n"
                            "  5. Backend server starts SQL transaction, inserts treatment log into `treatments` table.\n"
                            "  6. Backend server calculates invoice subtotal, 8% tax, total, and inserts into `invoices` table.\n"
                            "  7. If vaccine name is present, server updates `pets.vaccination` to 'Up-to-date'.\n"
                            "  8. Backend server commits SQL transaction and returns JSON success payload.\n"
                            "  9. Client SPA closes modal, reloads state, and renders updated visit history and billing table.\n"
                            "• Alternate Flow: If procedure fee is negative or invalid, client validation halts submission and alerts user.\n"
                            "• Post-conditions: New treatment log recorded; new pending invoice created; pet vaccination badge synchronized.")

    add_heading_1(doc, "4.5 UML Class Diagram & Entity Specifications")
    add_body_paragraph(doc, "The UML Class Diagram (Figure 4.5) details the static structural models, object attributes, operations, and associations comprising VetiCare:")

    add_figure_image(doc, "UML class diagram.png", "UML Class Diagram of Relational Domain Models", "Fig 4.5", width_inches=5.8)

    add_body_paragraph(doc, "[Domain Class Specifications]\n"
                            "1. Owner: +id: String, +name: String, +phone: String, +email: String, +address: String, +emergencyContact: String, +createdAt: String | +getRegisteredPets(), +saveOwner()\n"
                            "2. Pet: +id: String, +ownerId: String, +name: String, +species: String, +breed: String, +dob: String, +weight: float, +vaccination: String, +notes: String | +updateVaccineStatus(), +getVisitHistory()\n"
                            "3. Appointment: +id: String, +petId: String, +vetName: String, +dateTime: String, +reason: String, +status: String | +cancel(), +complete()\n"
                            "4. Treatment: +id: String, +appointmentId: String, +petId: String, +dateTime: String, +symptoms: String, +diagnosis: String, +medications: String, +vaccineGiven: String, +cost: float, +notes: String | +saveTreatment()\n"
                            "5. Invoice: +id: String, +treatmentId: String, +petId: String, +dateTime: String, +consultationFee: float, +treatmentCost: float, +medicineCost: float, +tax: float, +total: float, +status: String, +paymentMethod: String, +reason: String | +processPayment(), +generateReceipt()\n"
                            "\nAssociations: Owner (1) ---> (0..*) Pet; Pet (1) ---> (0..*) Appointment; Pet (1) ---> (0..*) Treatment; Treatment (1) ---> (1) Invoice.")

    add_heading_1(doc, "4.6 Sequence Diagrams & Interaction Flows")
    add_body_paragraph(doc, "Sequence diagrams model dynamic object interactions and message exchanges between client components, API handlers, and SQLite database entities over time.")

    add_heading_2(doc, "4.6.1 Appointment Scheduling Sequence")
    add_body_paragraph(doc, "Figure 4.6 illustrates the message sequence executed when staff book an appointment:")

    add_figure_image(doc, "Sequence diagram 1.png", "Sequence Diagram for Appointment Scheduling & Cancellation", "Fig 4.6", width_inches=5.8)

    add_body_paragraph(doc, "Message Exchange Sequence Flow:\n"
                            "1. Receptionist submits Appointment form in client SPA (`app.js`).\n"
                            "2. SPA UI sends HTTP POST `/api/appointments` with JSON payload `{ petId, vetName, dateTime, reason }`.\n"
                            "3. REST API handler validates parameters and executes parameterized SQL query `INSERT INTO appointments`.\n"
                            "4. SQLite database engine writes record to disk and returns query success acknowledgement.\n"
                            "5. REST API handler returns HTTP 200 OK with JSON payload `{ status: 'success', id: 'a-xxxx' }`.\n"
                            "6. Client SPA reloads local state, closes modal dialog, and updates the daily agenda view dynamically.")

    add_heading_2(doc, "4.6.2 Treatment Entry & Auto-Invoicing Sequence")
    add_body_paragraph(doc, "Figure 4.7 details the atomic sequence executed when recording a treatment visit:")

    add_figure_image(doc, "Sequence diagram 2.png", "Sequence Diagram for Treatment Entry & Invoice Generation", "Fig 4.7", width_inches=5.8)

    add_body_paragraph(doc, "Message Exchange Sequence Flow:\n"
                            "1. Attending Surgeon submits Clinical Visit form with diagnosis, symptoms, prescribed medications, vaccine name, and procedure fee.\n"
                            "2. SPA client dispatches asynchronous POST request to `/api/treatments`.\n"
                            "3. Backend server opens an explicit SQL transaction boundary (`BEGIN TRANSACTION`).\n"
                            "4. Backend inserts treatment record into `treatments` table (`t-xxxx`).\n"
                            "5. Backend calculates line-item fee math and inserts pending invoice into `invoices` table (`INV-xxxx`).\n"
                            "6. If vaccine name is present, backend executes UPDATE query modifying `pets.vaccination` to 'Up-to-date'.\n"
                            "7. Backend commits SQL transaction to disk (`COMMIT TRANSACTION`).\n"
                            "8. Backend returns HTTP 200 OK JSON response with treatment ID and generated invoice ID.\n"
                            "9. SPA client updates local state cache, closes modal dialog, and re-renders medical history timeline and billing ledger.")

    add_heading_1(doc, "4.7 Activity Diagrams & Decision Workflows")
    add_body_paragraph(doc, "The Activity Diagram (Figure 4.8) illustrates the decision workflow for patient admission, clinical examination, treatment, and financial settlement:")

    add_figure_image(doc, "Activity Diagram.png", "Activity Diagram for Patient Registration & Consultation Workflow", "Fig 4.8", width_inches=4.8)

    add_body_paragraph(doc, "[Workflow Activities]\n"
                            "(Start) -> Register Owner -> Register Pet Patient -> Schedule Appointment -> [Decision: Patient Arrives?]\n"
                            "  --> If Cancelled: Update Appointment Status to 'Cancelled' -> (End)\n"
                            "  --> If Present: Vet Performs Consultation -> Input Medical Log & Diagnosis -> [Decision: Vaccine Administered?]\n"
                            "       --> Yes: Auto-update Pet Vaccination Status to 'Up-to-date'\n"
                            "       --> No: Retain Existing Status\n"
                            "  --> Auto-generate Invoice -> Staff Process Payment -> Print Thermal Receipt -> (End)")

    add_heading_2(doc, "4.7.1 Detailed Finite State Machine (FSM) Specifications")
    add_body_paragraph(doc, "Entity state transitions are governed by strict finite state automata. Tables 4.1, 4.2, and 4.3 define the state transition rules for appointments, invoices, and vaccination tracking:")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("Table 4.1: Appointment Lifecycle Finite State Machine")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(10.5)
    r.font.bold = True

    t_fsm1 = doc.add_table(rows=1, cols=4)
    t_fsm1.alignment = WD_TABLE_ALIGNMENT.CENTER
    h1 = t_fsm1.rows[0].cells
    h1[0].text = "Initial State"
    h1[1].text = "Triggering Event"
    h1[2].text = "Target State"
    h1[3].text = "Operational Action / Effect"
    for c in h1:
        set_cell_shading(c, "E6E6E6")
        c.paragraphs[0].runs[0].font.bold = True

    fsm1_data = [
        ("[None]", "User submits appointment booking form", "Scheduled", "Record inserted with badge 'Scheduled'"),
        ("Scheduled", "User clicks 'Cancel' action button", "Cancelled", "Status updated to 'Cancelled' (red badge)"),
        ("Scheduled", "Vet clicks 'Complete' & saves treatment", "Completed", "Status updated to 'Completed' (green badge)"),
        ("Cancelled", "Appointment cancelled", "[Terminal]", "No further clinical transitions permitted"),
        ("Completed", "Treatment recorded & billed", "[Terminal]", "Linked to permanent medical treatment log")
    ]
    for s_i, tr, s_t, eff in fsm1_data:
        rc = t_fsm1.add_row().cells
        rc[0].text = s_i
        rc[1].text = tr
        rc[2].text = s_t
        rc[3].text = eff
        rc[0].paragraphs[0].runs[0].font.bold = True
        for i in range(4):
            set_cell_margins(rc[i], top=25, bottom=25, left=45, right=45)
            p_c = rc[i].paragraphs[0]
            p_c.paragraph_format.line_spacing = 1.15
            p_c.paragraph_format.space_after = Pt(2)
            p_c.runs[0].font.size = Pt(8.5)

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("Table 4.2: Invoice & Billing Lifecycle Finite State Machine")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(10.5)
    r.font.bold = True

    t_fsm2 = doc.add_table(rows=1, cols=4)
    t_fsm2.alignment = WD_TABLE_ALIGNMENT.CENTER
    h2 = t_fsm2.rows[0].cells
    h2[0].text = "Initial State"
    h2[1].text = "Triggering Event"
    h2[2].text = "Target State"
    h2[3].text = "Financial Effect"
    for c in h2:
        set_cell_shading(c, "E6E6E6")
        c.paragraphs[0].runs[0].font.bold = True

    fsm2_data = [
        ("[None]", "Clinical treatment log persisted", "Pending", "Invoice created with total fee ($), status 'Pending'"),
        ("Pending", "Staff clicks 'Pay' & records payment", "Paid", "Status updated to 'Paid', method recorded as 'Card'/'Cash'"),
        ("Paid", "Staff clicks 'Receipt' button", "Paid", "Launches 300px thermal POS receipt modal view")
    ]
    for s_i, tr, s_t, eff in fsm2_data:
        rc = t_fsm2.add_row().cells
        rc[0].text = s_i
        rc[1].text = tr
        rc[2].text = s_t
        rc[3].text = eff
        rc[0].paragraphs[0].runs[0].font.bold = True
        for i in range(4):
            set_cell_margins(rc[i], top=25, bottom=25, left=45, right=45)
            p_c = rc[i].paragraphs[0]
            p_c.paragraph_format.line_spacing = 1.15
            p_c.paragraph_format.space_after = Pt(2)
            p_c.runs[0].font.size = Pt(8.5)

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run("Table 4.3: Patient Immunization Tracking Finite State Machine")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(10.5)
    r.font.bold = True

    t_fsm3 = doc.add_table(rows=1, cols=4)
    t_fsm3.alignment = WD_TABLE_ALIGNMENT.CENTER
    h3 = t_fsm3.rows[0].cells
    h3[0].text = "Initial State"
    h3[1].text = "Triggering Event"
    h3[2].text = "Target State"
    h3[3].text = "Badge Representation"
    for c in h3:
        set_cell_shading(c, "E6E6E6")
        c.paragraphs[0].runs[0].font.bold = True

    fsm3_data = [
        ("[None]", "New pet patient registered", "Not Vaccinated", "Amber warning badge rendered on pet profile card"),
        ("Not Vaccinated", "Treatment logged with vaccine name", "Up-to-date", "Badge updates to green 'Up-to-date' automatically"),
        ("Up-to-date", "Subsequent non-vaccine treatment saved", "Up-to-date", "Existing 'Up-to-date' status preserved")
    ]
    for s_i, tr, s_t, eff in fsm3_data:
        rc = t_fsm3.add_row().cells
        rc[0].text = s_i
        rc[1].text = tr
        rc[2].text = s_t
        rc[3].text = eff
        rc[0].paragraphs[0].runs[0].font.bold = True
        for i in range(4):
            set_cell_margins(rc[i], top=25, bottom=25, left=45, right=45)
            p_c = rc[i].paragraphs[0]
            p_c.paragraph_format.line_spacing = 1.15
            p_c.paragraph_format.space_after = Pt(2)
            p_c.runs[0].font.size = Pt(8.5)

    add_heading_1(doc, "4.8 Entity-Relationship (E-R) Diagram & Normalization Analysis")
    add_body_paragraph(doc, "The Entity-Relationship Diagram (Figure 4.9) defines the logical schema of `veticare.db`. Table 4.4 specifies exact table column definitions, data types, primary keys, and cascading foreign key constraints:")

    add_figure_image(doc, "ER Diagram.png", "Entity-Relationship (E-R) Diagram of SQLite Database Schema", "Fig 4.9", width_inches=5.8)

    add_body_paragraph(doc, "Normalization Analysis (1NF to 3NF):")
    add_body_paragraph(doc, "1. First Normal Form (1NF): All attributes contain atomic scalar values (strings, numbers, timestamps). Multi-valued attributes (e.g. multiple pets per owner) are eliminated by establishing separate `pets` rows referencing `ownerId`.")
    add_body_paragraph(doc, "2. Second Normal Form (2NF): All non-key attributes are fully functionally dependent on the single primary key column of each table.")
    add_body_paragraph(doc, "3. Third Normal Form (3NF): No transitive dependencies exist. Attributes dependent on foreign keys (e.g., owner address) reside strictly within their primary entity table (`owners`).")

    add_heading_2(doc, "4.8.1 Functional Dependency Proofs for Relational Tables")
    add_body_paragraph(doc, "Formal mathematical proofs confirm 3NF compliance:\n"
                            "• Table `owners`: Primary Key `{id}`. Functional dependencies: `id -> name, phone, email, address, emergencyContact, createdAt`. All determinant attributes are superkeys.\n"
                            "• Table `pets`: Primary Key `{id}`. Functional dependencies: `id -> ownerId, name, species, breed, dob, weight, vaccination, notes`. Non-key attributes depend strictly on `{id}`.\n"
                            "• Table `treatments`: Primary Key `{id}`. Functional dependencies: `id -> appointmentId, petId, dateTime, symptoms, diagnosis, medications, vaccineGiven, cost, notes`.")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Table 4.4: Relational Database Schema Definitions & Foreign Key Constraints")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11)
    r.font.bold = True

    db_table = doc.add_table(rows=1, cols=5)
    db_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    h_db = db_table.rows[0].cells
    h_db[0].text = "Table Name"
    h_db[1].text = "Column Name"
    h_db[2].text = "Data Type"
    h_db[3].text = "Key / Constraint"
    h_db[4].text = "Description"
    for c in h_db:
        set_cell_shading(c, "E6E6E6")
        c.paragraphs[0].runs[0].font.bold = True

    schema_rows = [
        ("owners", "id", "TEXT", "PRIMARY KEY", "Unique owner identifier (e.g. `o-1`)"),
        ("owners", "name", "TEXT", "NOT NULL", "Full owner name"),
        ("owners", "phone", "TEXT", "NOT NULL", "Contact phone number"),
        ("owners", "email", "TEXT", "NOT NULL", "Email address"),
        ("owners", "address", "TEXT", "NOT NULL", "Residential address"),
        ("owners", "emergencyContact", "TEXT", "NULLABLE", "Emergency contact person"),
        ("owners", "createdAt", "TEXT", "NOT NULL", "Registration ISO timestamp"),
        ("pets", "id", "TEXT", "PRIMARY KEY", "Unique pet identifier (e.g. `p-1`)"),
        ("pets", "ownerId", "TEXT", "FOREIGN KEY -> owners(id)", "Owner reference (ON DELETE CASCADE)"),
        ("pets", "name", "TEXT", "NOT NULL", "Pet patient name"),
        ("pets", "species", "TEXT", "NOT NULL", "Animal species (Dog, Cat, etc.)"),
        ("pets", "breed", "TEXT", "NOT NULL", "Specific breed"),
        ("pets", "dob", "TEXT", "NOT NULL", "Date of Birth (YYYY-MM-DD)"),
        ("pets", "weight", "REAL", "NOT NULL", "Pet weight in kilograms"),
        ("pets", "vaccination", "TEXT", "NOT NULL", "Vaccine status badge"),
        ("appointments", "id", "TEXT", "PRIMARY KEY", "Appointment ID (`a-1`)"),
        ("appointments", "petId", "TEXT", "FOREIGN KEY -> pets(id)", "Pet patient reference (CASCADE)"),
        ("appointments", "vetName", "TEXT", "NOT NULL", "Attending veterinarian name"),
        ("appointments", "dateTime", "TEXT", "NOT NULL", "Scheduled date and time"),
        ("appointments", "reason", "TEXT", "NOT NULL", "Reason for consultation"),
        ("appointments", "status", "TEXT", "NOT NULL", "Status (Scheduled/Completed/Cancelled)"),
        ("treatments", "id", "TEXT", "PRIMARY KEY", "Treatment log ID (`t-1`)"),
        ("treatments", "petId", "TEXT", "FOREIGN KEY -> pets(id)", "Pet patient reference (CASCADE)"),
        ("treatments", "symptoms", "TEXT", "NOT NULL", "Presenting medical symptoms"),
        ("treatments", "diagnosis", "TEXT", "NOT NULL", "Veterinary diagnosis"),
        ("treatments", "vaccineGiven", "TEXT", "NULLABLE", "Administered vaccine shot name"),
        ("treatments", "cost", "REAL", "NOT NULL", "Procedure cost ($)"),
        ("invoices", "id", "TEXT", "PRIMARY KEY", "Invoice ID (`INV-1001`)"),
        ("invoices", "treatmentId", "TEXT", "FOREIGN KEY -> treatments(id)", "Treatment record reference"),
        ("invoices", "total", "REAL", "NOT NULL", "Total calculated invoice amount ($)"),
        ("invoices", "status", "TEXT", "NOT NULL", "Payment status (Pending / Paid)")
    ]

    for t_name, c_name, d_type, c_str, desc in schema_rows:
        rc = db_table.add_row().cells
        rc[0].text = t_name
        rc[1].text = c_name
        rc[2].text = d_type
        rc[3].text = c_str
        rc[4].text = desc
        rc[0].paragraphs[0].runs[0].font.bold = True
        for i in range(5):
            set_cell_margins(rc[i], top=30, bottom=30, left=60, right=60)
            p_c = rc[i].paragraphs[0]
            p_c.paragraph_format.line_spacing = 1.15
            p_c.paragraph_format.space_after = Pt(2)
            p_c.runs[0].font.size = Pt(9.5)

    add_heading_1(doc, "4.9 Detailed Sub-system Module Design Specifications")
    add_body_paragraph(doc, "VetiCare is partitioned into five sub-system modules:")
    add_body_paragraph(doc, "1. Owner Directory Sub-system: Handles client registration, search filtering, and multi-pet linking.")
    add_body_paragraph(doc, "2. Patient Directory Sub-system: Manages pet health profiles, demographic records, and immunization badges.")
    add_body_paragraph(doc, "3. Consultation Scheduler Sub-system: Provides real-time agenda scheduling, vet slot booking, and status updates.")
    add_body_paragraph(doc, "4. Clinical Visit Engine: Manages examination entry, diagnosis, pharmaceutical prescriptions, and vaccine auto-syncing.")
    add_body_paragraph(doc, "5. Billing & Thermal Receipt Sub-system: Handles auto-invoicing, tax calculation, payment processing, and POS receipt rendering.")

    add_heading_2(doc, "4.9.1 Exhaustive SQL Query Mapping Across Sub-System Modules")
    add_body_paragraph(doc, "Table 4.5 details the exact mapping between front-end UI actions, REST endpoints, and underlying raw SQL prepared statement queries:")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Table 4.5: Exhaustive SQL Query Mapping Across Sub-System Modules")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11)
    r.font.bold = True

    qm_table = doc.add_table(rows=1, cols=4)
    qm_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    h_q = qm_table.rows[0].cells
    h_q[0].text = "Module / Action"
    h_q[1].text = "REST Endpoint"
    h_q[2].text = "HTTP Verb"
    h_q[3].text = "Raw SQL Prepared Statement Query"
    for c in h_q:
        set_cell_shading(c, "E6E6E6")
        c.paragraphs[0].runs[0].font.bold = True

    query_mappings = [
        ("Fetch All Data", "/api/data", "GET", "SELECT * FROM owners; SELECT * FROM pets; SELECT * FROM appointments; ..."),
        ("Register Owner", "/api/owners", "POST", "INSERT INTO owners (id, name, phone, email, address, emergencyContact, createdAt) VALUES (?,?,?,?,?,?,?)"),
        ("Register Pet Patient", "/api/pets", "POST", "INSERT INTO pets (id, ownerId, name, species, breed, dob, weight, vaccination, notes) VALUES (?,?,?,?,?,?,?,?,?)"),
        ("Schedule Appointment", "/api/appointments", "POST", "INSERT INTO appointments (id, petId, vetName, dateTime, reason, status) VALUES (?,?,?,?,?,?)"),
        ("Update Appt Status", "/api/appointments", "PUT", "UPDATE appointments SET status = ? WHERE id = ?"),
        ("Record Visit & Invoicing", "/api/treatments", "POST", "BEGIN TRANSACTION; INSERT INTO treatments ...; INSERT INTO invoices ...; UPDATE pets SET vaccination = 'Up-to-date'; COMMIT;"),
        ("Process Invoice Payment", "/api/invoices", "PUT", "UPDATE invoices SET status = ?, paymentMethod = ? WHERE id = ?")
    ]
    for m_act, endp, verb, sql_q in query_mappings:
        rc = qm_table.add_row().cells
        rc[0].text = m_act
        rc[1].text = endp
        rc[2].text = verb
        rc[3].text = sql_q
        rc[0].paragraphs[0].runs[0].font.bold = True
        for i in range(4):
            set_cell_margins(rc[i], top=30, bottom=30, left=50, right=50)
            p_c = rc[i].paragraphs[0]
            p_c.paragraph_format.line_spacing = 1.15
            p_c.paragraph_format.space_after = Pt(2)
            p_c.runs[0].font.size = Pt(9.0)
