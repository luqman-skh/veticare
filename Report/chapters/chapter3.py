import os
from docx.shared import Pt
from docx.enum.table import WD_TABLE_ALIGNMENT
from .common import (
    add_chapter_title, add_heading_1, add_heading_2, add_heading_3,
    add_body_paragraph, set_cell_margins, set_cell_shading
)

def build_chapter_3(doc):
    doc.add_page_break()
    add_chapter_title(doc, "Chapter III", "System Requirements Specification")

    add_heading_1(doc, "3.1 User Characteristics & Operational Personas")
    add_body_paragraph(doc, "The System Requirements Specification (SRS) defines the complete functional capabilities, non-functional performance benchmarks, hardware/software constraints, and user interface specifications for the VetiCare Veterinary Clinic Management System. Understanding the operational personas and user characteristics of clinical staff is essential to establish software requirements.")

    add_body_paragraph(doc, "VetiCare accommodates four distinct operational user personas within a veterinary healthcare facility:")

    personas = [
        ("Veterinary Receptionist / Front-Desk Staff", "Responsible for client onboarding, pet patient registration, phone inquiries, scheduling appointments, checking in arriving patients, and collecting payments at the front desk. Requires intuitive search filters, fast form inputs, and real-time schedule visibility."),
        ("Veterinary Surgeon / Attending Physician", "Responsible for conducting clinical physical examinations, diagnosing medical conditions, performing surgical procedures, administering vaccines, prescribing medications, and logging visit records. Requires fast medical chart retrieval, clear diagnosis inputs, and automated vaccination status updates."),
        ("Clinic Administrator / Practice Manager", "Responsible for overseeing clinic operations, monitoring financial billing ledgers, auditing revenue reports, reviewing treatment records, and ensuring regulatory compliance. Requires access to global financial totals, billing ledgers, and thermal receipt reprints."),
        ("Pet Owner / Client (Secondary Stakeholder)", "The human client responsible for bringing the animal patient to the clinic, providing medical history details, consenting to procedures, and settling financial invoices. Interacts indirectly via thermal receipts, vaccination badges, and billing statements.")
    ]
    for p_title, p_desc in personas:
        add_body_paragraph(doc, p_desc, bold_prefix=f"{p_title}: ")

    add_heading_2(doc, "3.1.1 Detailed User Interaction Workflows & Ergonomic Touchpoints")
    add_body_paragraph(doc, "Detailed ergonomics analysis maps clinical staff touchpoints across four operational workflows:\n"
                            "• Receptionist Check-In Workflow: Fast client search via top navbar search input -> Instant owner card lookup -> Select pet patient profile -> Click 'Book Appointment' -> Form submission initializes agenda entry in < 3 seconds.\n"
                            "• Veterinary Examination Workflow: Select scheduled appointment from daily agenda -> Click 'Complete' -> Modal pops up pre-populated with Pet ID -> Input symptoms, diagnosis, pharmacy prescriptions, and vaccine name -> Click 'Save Clinical Visit' -> Backend executes atomic SQL write, auto-generates invoice, updates vaccine status, and reloads visit history timeline.\n"
                            "• Financial Settlement Workflow: Access Billing Ledger view -> Inspect itemized consultation fee ($50.00), procedure charge, pharmacy cost, tax, and total -> Select payment method ('Card'/'Cash') -> Click 'Pay' -> System updates invoice status to 'Paid' -> Click 'Receipt' to launch 300px thermal receipt view and trigger browser printing.")

    add_heading_2(doc, "3.1.2 Formal Agile User Stories & Acceptance Criteria")
    add_body_paragraph(doc, "To bridge operational clinical workflows with software verification, formal Agile user stories were specified in the standardized 'As a [Role], I want [Feature], so that [Benefit]' format, accompanied by formal 'Given-When-Then' acceptance criteria in Table 3.1:")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Table 3.1: Formal Agile User Stories & Acceptance Criteria")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11)
    r.font.bold = True

    story_table = doc.add_table(rows=1, cols=4)
    story_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    h_s = story_table.rows[0].cells
    h_s[0].text = "Story ID"
    h_s[1].text = "User Persona"
    h_s[2].text = "User Story Statement"
    h_s[3].text = "Formal Acceptance Criteria (Given-When-Then)"
    for c in h_s:
        set_cell_shading(c, "E6E6E6")
        c.paragraphs[0].runs[0].font.bold = True

    user_stories = [
        ("US-01", "Receptionist", "As a receptionist, I want to search pet owners in real-time, so that client check-in occurs without delay.", "Given the owner directory is displayed, When I type a client name or phone number in the search input, Then matching cards are filtered instantly in < 5 ms."),
        ("US-02", "Receptionist", "As a receptionist, I want to book an appointment with an attending vet, so that consultations are scheduled cleanly.", "Given a registered pet exists, When I submit the booking form with vet name, date, and reason, Then the appointment appears in the agenda with 'Scheduled' status."),
        ("US-03", "Veterinary Surgeon", "As a veterinarian, I want to record visit examination findings and administered vaccines, so that patient medical history is maintained.", "Given an appointment is scheduled, When I click 'Complete' and enter symptoms, diagnosis, and 'Rabies Vaccine', Then a treatment record is saved and the pet's vaccine badge updates to 'Up-to-date'."),
        ("US-04", "Veterinary Surgeon", "As a veterinarian, I want invoices generated automatically upon treatment logging, so that clinic billing is error-free.", "Given a treatment log with cost $70.00 is submitted, When the record is saved, Then an invoice is generated with base fee $50.00, procedure $70.00, vaccine $25.00, 8% tax ($11.60), and total $156.60."),
        ("US-05", "Receptionist", "As a receptionist, I want to record payment completion for an invoice, so that financial accounts are balanced.", "Given an invoice exists in 'Pending' status, When I click the 'Pay' button and select payment method, Then the status updates to 'Paid' and revenue metrics increase."),
        ("US-06", "Receptionist", "As a receptionist, I want to print a narrow thermal receipt for the client, so that thermal POS printers can emit receipts.", "Given an invoice is displayed, When I click 'Receipt', Then a 300px thermal receipt layout opens, and clicking 'Print' triggers printing with background UI hidden."),
        ("US-07", "Clinical Staff", "As clinical staff, I want to toggle between light and dark visual themes, so that eye strain is minimized in dim exam rooms.", "Given any screen view, When I click the theme toggle button, Then CSS design variables switch seamlessly between light and dark contrast modes."),
        ("US-08", "Practice Manager", "As a clinic manager, I want the system to operate completely offline, so that clinic operations continue during internet outages.", "Given the clinic local server is running, When the external internet connection drops, Then all search, scheduling, treatment logging, and invoicing continue with 100% functionality.")
    ]
    for s_id, s_role, s_stmt, s_acc in user_stories:
        rc = story_table.add_row().cells
        rc[0].text = s_id
        rc[1].text = s_role
        rc[2].text = s_stmt
        rc[3].text = s_acc
        rc[0].paragraphs[0].runs[0].font.bold = True
        for i in range(4):
            set_cell_margins(rc[i], top=35, bottom=35, left=60, right=60)
            p_c = rc[i].paragraphs[0]
            p_c.paragraph_format.line_spacing = 1.15
            p_c.paragraph_format.space_after = Pt(2)
            p_c.runs[0].font.size = Pt(9.5)

    add_heading_1(doc, "3.2 Detailed Functional Requirements")
    add_body_paragraph(doc, "Functional requirements define the specific actions, calculations, data transformations, and workflows that the VetiCare application must execute. The requirements are categorized into twelve core functional requirements (FR-1 to FR-12):")

    fr_specs = [
        ("FR-1: Owner Registration & Profile Management", 
         "The system shall provide web forms to capture and store pet owner details. Required fields include Owner ID (`o-xxxx`), Full Name, Contact Phone, Email Address, Physical Address, Emergency Contact Person, and Registration ISO Timestamp. Inputs shall be validated for correct formatting before saving.\n"
         "• Pre-conditions: User is on Owner Directory view; form inputs are non-empty.\n"
         "• Trigger: User clicks '+ Add Owner' button and submits form.\n"
         "• Main Success Scenario: System validates fields, generates unique ID (`o-xxxx`), executes HTTP POST `/api/owners`, inserts record into `owners` table, reloads local state, and renders new card in `#owners-grid`.\n"
         "• Post-conditions: Owner persisted in SQLite; owner directory re-rendered; modal closed."),
        
        ("FR-2: Owner Directory Search & Filter Engine", 
         "The system shall maintain a dynamic owner directory card grid (`#view-owners`). The interface shall provide a real-time text input filter allowing staff to filter owners instantly by name, telephone number, or email address without initiating server reloads.\n"
         "• Pre-conditions: Owner records exist in `app.state.owners`.\n"
         "• Trigger: User inputs keystrokes into `#owner-search` input.\n"
         "• Main Success Scenario: JavaScript `input` event listener filters `app.state.owners` array in memory and re-renders matching cards in < 5 ms.\n"
         "• Exception Flow: If no matches are found, display 'No matching owners found' placeholder."),
        
        ("FR-3: Multi-Pet Owner Association", 
         "The system shall support a one-to-many relationship between pet owners and pet patients. The owner detailed profile view (`#view-owner-details`) shall display all pet patients linked to that specific owner ID and provide a direct '+ Add Patient Profile' action button.\n"
         "• Pre-conditions: Owner record exists; user navigates to `#view-owner-details`.\n"
         "• Main Success Scenario: System queries `pets` filtered by `ownerId == currentOwnerId` and renders patient summary cards showing breed, age, and vaccine badge."),
        
        ("FR-4: Pet Patient Directory & Demographic Profiling", 
         "The system shall maintain pet patient records (`#view-pets`) linked to owner IDs via relational foreign keys (`FOREIGN KEY (ownerId) REFERENCES owners(id)`). Required attributes include Pet ID (`p-xxxx`), Pet Name, Species (Dog, Cat, Bird, Other), Breed, Date of Birth (YYYY-MM-DD), Weight (kg), Vaccination Status, and Medical Notes.\n"
         "• Main Success Scenario: Staff submits '+ Add Pet' modal form; system persists record in `pets` table with initial vaccine status 'Not Vaccinated' unless specified otherwise."),
        
        ("FR-5: Pet Detail Profile & Medical History Timeline", 
         "The system shall render an individual pet patient detail panel (`#view-pet-details`). The view shall compute patient age from DOB, render a color-coded vaccination status badge ('Up-to-date' green vs 'Not Vaccinated' amber), and list the complete chronological history of clinical visit logs.\n"
         "• Main Success Scenario: System extracts all treatments where `petId == currentPetId`, orders by `dateTime DESC`, and renders diagnostic timeline."),
        
        ("FR-6: Consultation Appointment Scheduler", 
         "The system shall allow staff to schedule vet appointments by selecting a registered pet, attending veterinarian name (e.g., Dr. S. Jenkins, Dr. M. Vance), appointment date, time slot, and consultation reason. The scheduler shall initialize new appointments with a status of 'Scheduled'.\n"
         "• Main Success Scenario: POST `/api/appointments` saves booking; agenda table updates dynamically."),
        
        ("FR-7: Real-Time Appointment Agenda & Status Management", 
         "The scheduler module (`#view-appointments`) shall display an interactive daily agenda list. Staff shall be able to transition appointment statuses in real time: clicking 'Cancel' updates status to 'Cancelled' (red badge), while clicking 'Complete' opens the clinical treatment entry modal.\n"
         "• Main Success Scenario: PUT `/api/appointments` updates `status` column in SQLite database."),
        
        ("FR-8: Clinical Visit & Medical Treatment Logging", 
         "The system shall provide a clinical visit form (`#treatment-modal`) allowing veterinarians to record medical consultations. Inputs include Pet ID, Visit Date/Time, Reported Symptoms, Diagnostic Findings, Prescribed Medications, Administered Vaccine Name, and Procedure Fee ($).\n"
         "• Main Success Scenario: Vet submits form; system executes multi-table atomic transaction."),
        
        ("FR-9: Automated Vaccination Status Synchronization", 
         "When a clinical treatment form is submitted containing an administered vaccine name (e.g., 'Rabies Vaccine', 'DHPP Vaccine'), the backend database engine shall automatically execute an SQL UPDATE query modifying the pet's `vaccination` column to 'Up-to-date'.\n"
         "• Main Success Scenario: Backend verifies `vaccineGiven` is non-empty; updates `pets.vaccination = 'Up-to-date'` within the same transaction."),
        
        ("FR-10: Automated Financial Invoice Generation", 
         "Upon saving a clinical visit record, the backend server shall execute an atomic SQL transaction that automatically generates a pending financial invoice record (`INV-xxxx`). Invoices shall calculate subtotal (Consultation Base Fee $50.00 + Procedure Fee + Medication/Vaccine Fee) and 8% Tax.\n"
         "• Main Success Scenario: Invoice record created in `invoices` table with status 'Pending' and payment method 'Pending'."),
        
        ("FR-11: Financial Ledger & Payment Processing", 
         "The billing module (`#view-billing`) shall render a comprehensive financial table listing Invoice ID, Date, Pet/Owner Name, Visit Reason, Total Amount, and Payment Status ('Pending' vs 'Paid'). Clicking 'Pay' shall update invoice status to 'Paid' and record payment method as 'Card'.\n"
         "• Main Success Scenario: PUT `/api/invoices` updates `status='Paid'` and `paymentMethod='Card'`."),
        
        ("FR-12: Thermal Receipt View & Browser Printing", 
         "The system shall provide a printable thermal receipt modal (`#invoice-modal`). The view shall format a narrow 300px thermal receipt layout containing clinic header, invoice ID, date, patient name, itemized fee breakdown, tax, total, and status. Clicking 'Print Receipt' shall trigger the browser's print engine while hiding web application controls via CSS `@media print` rules.\n"
         "• Main Success Scenario: Modal formats receipt; triggers `window.print()`; outputs clean receipt layout.")
    ]

    for fr_id, fr_text in fr_specs:
        add_body_paragraph(doc, fr_text, bold_prefix=f"{fr_id}: ")

    add_heading_2(doc, "3.2.1 Field-Level Form Input Validation Specifications")
    add_body_paragraph(doc, "To enforce data integrity, Table 3.2 specifies field-level validation rules across all form inputs:")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Table 3.2: Field-Level Form Input Validation Specifications")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11)
    r.font.bold = True

    val_table = doc.add_table(rows=1, cols=5)
    val_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    h_v = val_table.rows[0].cells
    h_v[0].text = "Entity"
    h_v[1].text = "Field Name"
    h_v[2].text = "Data Type"
    h_v[3].text = "Validation Constraint"
    h_v[4].text = "Error Message"
    for c in h_v:
        set_cell_shading(c, "E6E6E6")
        c.paragraphs[0].runs[0].font.bold = True

    val_rules = [
        ("Owner", "name", "Text", "Non-empty, 2-100 characters", "Full name is required."),
        ("Owner", "phone", "Text", "Standard phone regex pattern", "Valid phone number required."),
        ("Owner", "email", "Text", "Standard RFC 5322 email regex", "Valid email address required."),
        ("Pet", "name", "Text", "Non-empty, 1-50 characters", "Pet name is required."),
        ("Pet", "weight", "Real", "Numeric float > 0.0 kg", "Weight must be positive number."),
        ("Pet", "dob", "Text", "ISO Date YYYY-MM-DD (Past Date)", "Valid birth date required."),
        ("Appointment", "dateTime", "Text", "Valid ISO Timestamp string", "Scheduled slot must be valid."),
        ("Treatment", "cost", "Real", "Numeric float >= 0.0", "Procedure fee cannot be negative.")
    ]
    for ent, f_name, d_t, v_c, err in val_rules:
        rc = val_table.add_row().cells
        rc[0].text = ent
        rc[1].text = f_name
        rc[2].text = d_t
        rc[3].text = v_c
        rc[4].text = err
        rc[0].paragraphs[0].runs[0].font.bold = True
        for i in range(5):
            set_cell_margins(rc[i], top=30, bottom=30, left=50, right=50)
            p_c = rc[i].paragraphs[0]
            p_c.paragraph_format.line_spacing = 1.15
            p_c.paragraph_format.space_after = Pt(2)
            p_c.runs[0].font.size = Pt(9.0)

    add_heading_2(doc, "3.2.2 State Transition Matrix & Entity Lifecycle Rules")
    add_body_paragraph(doc, "Entity lifecycle rules govern valid state changes:\n"
                            "1. Appointment Status Lifecycle: 'Scheduled' -> 'Completed' (upon treatment logging) OR 'Cancelled' (upon cancellation action).\n"
                            "2. Pet Vaccination Lifecycle: 'Not Vaccinated' -> 'Up-to-date' (upon clinical treatment recording vaccine administration).\n"
                            "3. Invoice Payment Lifecycle: 'Pending' -> 'Paid' (upon recording payment method as 'Card' or 'Cash').")

    add_heading_2(doc, "3.2.3 Comprehensive Data Dictionary Specifications")
    add_body_paragraph(doc, "The comprehensive Data Dictionary (Table 3.3) defines every attribute across the five relational database tables, specifying structural constraints, nullability, and operational descriptions:")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Table 3.3: Comprehensive Data Dictionary Specifications")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11)
    r.font.bold = True

    dict_table = doc.add_table(rows=1, cols=6)
    dict_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    h_d = dict_table.rows[0].cells
    h_d[0].text = "Entity"
    h_d[1].text = "Attribute"
    h_d[2].text = "Data Type"
    h_d[3].text = "Constraint"
    h_d[4].text = "Null?"
    h_d[5].text = "Functional Description"
    for c in h_d:
        set_cell_shading(c, "E6E6E6")
        c.paragraphs[0].runs[0].font.bold = True

    dict_rows = [
        ("owners", "id", "TEXT", "PRIMARY KEY", "No", "Unique owner identifier string (`o-xxxx`)."),
        ("owners", "name", "TEXT", "NOT NULL", "No", "Full legal name of the registered client."),
        ("owners", "phone", "TEXT", "NOT NULL", "No", "Primary contact telephone number."),
        ("owners", "email", "TEXT", "NOT NULL", "No", "Electronic mail address for statements."),
        ("owners", "address", "TEXT", "NOT NULL", "No", "Physical street address for billing."),
        ("owners", "emergencyContact", "TEXT", "None", "Yes", "Secondary emergency contact phone/name."),
        ("owners", "createdAt", "TEXT", "NOT NULL", "No", "ISO 8601 registration timestamp."),
        ("pets", "id", "TEXT", "PRIMARY KEY", "No", "Unique pet patient identifier (`p-xxxx`)."),
        ("pets", "ownerId", "TEXT", "FOREIGN KEY (CASCADE)", "No", "Relational reference to parent owner record."),
        ("pets", "name", "TEXT", "NOT NULL", "No", "Companion animal patient name."),
        ("pets", "species", "TEXT", "NOT NULL", "No", "Species classification (Dog, Cat, Bird, Exotic)."),
        ("pets", "breed", "TEXT", "NOT NULL", "No", "Specific animal breed classification."),
        ("pets", "dob", "TEXT", "NOT NULL", "No", "Date of birth in YYYY-MM-DD format."),
        ("pets", "weight", "REAL", "CHECK(weight > 0)", "No", "Body weight measured in kilograms."),
        ("pets", "vaccination", "TEXT", "DEFAULT 'Not Vaccinated'", "No", "Vaccine status badge ('Up-to-date'/'Not Vaccinated')."),
        ("pets", "notes", "TEXT", "None", "Yes", "Clinical alerts, behavioral notes, or allergies."),
        ("appointments", "id", "TEXT", "PRIMARY KEY", "No", "Unique appointment identifier (`a-xxxx`)."),
        ("appointments", "petId", "TEXT", "FOREIGN KEY (CASCADE)", "No", "Relational reference to scheduled pet patient."),
        ("appointments", "vetName", "TEXT", "NOT NULL", "No", "Attending veterinary surgeon name."),
        ("appointments", "dateTime", "TEXT", "NOT NULL", "No", "Scheduled consultation date and time string."),
        ("appointments", "reason", "TEXT", "NOT NULL", "No", "Chief complaint or consultation reason."),
        ("appointments", "status", "TEXT", "CHECK(status IN...)", "No", "Current status ('Scheduled', 'Completed', 'Cancelled')."),
        ("treatments", "id", "TEXT", "PRIMARY KEY", "No", "Unique clinical treatment record ID (`t-xxxx`)."),
        ("treatments", "appointmentId", "TEXT", "None", "Yes", "Reference to originating consultation appointment."),
        ("treatments", "petId", "TEXT", "FOREIGN KEY (CASCADE)", "No", "Relational reference to treated pet patient."),
        ("treatments", "dateTime", "TEXT", "NOT NULL", "No", "Timestamp when examination occurred."),
        ("treatments", "symptoms", "TEXT", "NOT NULL", "No", "Presenting clinical symptoms observed."),
        ("treatments", "diagnosis", "TEXT", "NOT NULL", "No", "Veterinary clinician assessment and diagnosis."),
        ("treatments", "medications", "TEXT", "None", "Yes", "Prescribed pharmaceutical drugs and dosages."),
        ("treatments", "vaccineGiven", "TEXT", "None", "Yes", "Administered vaccine name (triggers sync)."),
        ("treatments", "cost", "REAL", "CHECK(cost >= 0)", "No", "Procedure fee charged in dollars ($)."),
        ("treatments", "notes", "TEXT", "None", "Yes", "Post-operative or follow-up instructions."),
        ("invoices", "id", "TEXT", "PRIMARY KEY", "No", "Unique invoice identifier (`INV-xxxx`)."),
        ("invoices", "treatmentId", "TEXT", "None", "Yes", "Reference to originating treatment record."),
        ("invoices", "petId", "TEXT", "FOREIGN KEY (CASCADE)", "No", "Reference to patient for itemized billing."),
        ("invoices", "dateTime", "TEXT", "NOT NULL", "No", "Invoice issuance date and time."),
        ("invoices", "consultationFee", "REAL", "DEFAULT 50.00", "No", "Standard consultation base fee ($50.00)."),
        ("invoices", "treatmentCost", "REAL", "NOT NULL", "No", "Procedure charge derived from treatment log."),
        ("invoices", "medicineCost", "REAL", "DEFAULT 0.00", "No", "Pharmacy and vaccine medication charges ($)."),
        ("invoices", "tax", "REAL", "NOT NULL", "No", "Calculated local sales tax (8% rate)."),
        ("invoices", "total", "REAL", "NOT NULL", "No", "Total financial settlement amount ($)."),
        ("invoices", "status", "TEXT", "CHECK(status IN...)", "No", "Payment settlement status ('Pending'/'Paid')."),
        ("invoices", "paymentMethod", "TEXT", "NOT NULL", "No", "Tender method ('Card', 'Cash', 'Pending')."),
        ("invoices", "reason", "TEXT", "NOT NULL", "No", "Brief line-item description for receipt.")
    ]
    for ent, attr, dt, cons, nl, desc in dict_rows:
        rc = dict_table.add_row().cells
        rc[0].text = ent
        rc[1].text = attr
        rc[2].text = dt
        rc[3].text = cons
        rc[4].text = nl
        rc[5].text = desc
        rc[0].paragraphs[0].runs[0].font.bold = True
        for i in range(6):
            set_cell_margins(rc[i], top=25, bottom=25, left=45, right=45)
            p_c = rc[i].paragraphs[0]
            p_c.paragraph_format.line_spacing = 1.15
            p_c.paragraph_format.space_after = Pt(2)
            p_c.runs[0].font.size = Pt(8.5)

    add_heading_1(doc, "3.3 Detailed Non-Functional Requirements")
    add_body_paragraph(doc, "Non-functional requirements (NFRs) specify quality attributes, performance bounds, security parameters, and operational constraints governing system behavior:")

    nfr_specs = [
        ("NFR-1: API Response Latency & Execution Speed", "All REST API endpoints (`GET /api/data`, `POST /api/owners`, `POST /api/treatments`) shall return JSON data responses in less than 15 milliseconds under local host execution. Front-end DOM rendering and modal dialog transitions shall complete in under 16 milliseconds (ensuring 60 FPS fluidity)."),
        ("NFR-2: Database ACID Reliability & Zero Data Loss", "The SQLite database engine (`veticare.db`) shall maintain 100% ACID transaction compliance. Database write operations shall utilize Write-Ahead Logging (WAL) and foreign key enforcement (`PRAGMA foreign_keys = ON;`) to prevent database corruption or orphaned child records."),
        ("NFR-3: Security, Local Binding & Parameterized Queries", "The backend web server shall bind strictly to `localhost` (`127.0.0.1`) to prevent unauthorized remote network access. All SQL database queries shall use parameterized prepared statements (`INSERT INTO ... VALUES (?, ?, ?)`) to eliminate SQL Injection vulnerabilities. Client UI rendering shall sanitize string inputs to prevent Cross-Site Scripting (XSS)."),
        ("NFR-4: UI Visual Ergonomics & Theme Customization", "The user interface shall adhere to modern visual ergonomics principles, utilizing high-contrast typography ('Segoe UI' / 'Times New Roman'), responsive grid layouts, card hover micro-animations, and an integrated Dark/Light theme toggle (`var(--bg-main)`, `var(--text-main)`)."),
        ("NFR-5: Cross-Platform Portability & Zero Dependencies", "The complete application shall execute seamlessly across Microsoft Windows 10/11, Linux, and macOS without requiring external package downloads (`npm install` or `pip install`), relying strictly on standard Python 3.8+ or PHP 8.0+ standard libraries."),
        ("NFR-6: System Maintainability & Codebase Footprint", "The total codebase size shall be constrained to ~1,000 clean lines across 4 primary files (`index.html`, `style.css`, `app.js`, `server.py` / `api.php`), making the entire system easily readable, maintainable, and printable within academic report appendices."),
        ("NFR-7: High Availability & Offline Execution", "The application shall operate with 100% availability in local host environments without requiring external Internet connectivity, ensuring uninterrupted clinic operations during Internet outages."),
        ("NFR-8: Print Compatibility & Thermal POS Standards", "The thermal receipt view shall strictly follow POS receipt printing standards, rendering a 300px monospaced Courier text layout that prints cleanly on standard 80mm thermal receipt printers.")
    ]

    for nfr_id, nfr_text in nfr_specs:
        add_body_paragraph(doc, nfr_text, bold_prefix=f"{nfr_id}: ")

    add_heading_2(doc, "3.3.1 Quantitative Service Level Indicators (SLIs) & Thresholds")
    add_body_paragraph(doc, "To provide clear criteria for engineering validation, Table 3.4 outlines the target Service Level Indicators (SLIs), operational thresholds, and measurement methodologies:")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Table 3.4: Quantitative Service Level Indicators (SLIs) & Thresholds")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11)
    r.font.bold = True

    sli_table = doc.add_table(rows=1, cols=4)
    sli_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    h_sl = sli_table.rows[0].cells
    h_sl[0].text = "Service Metric"
    h_sl[1].text = "Target SLA Threshold"
    h_sl[2].text = "Worst-Case Bound"
    h_sl[3].text = "Measurement Instrument"
    for c in h_sl:
        set_cell_shading(c, "E6E6E6")
        c.paragraphs[0].runs[0].font.bold = True

    sli_data = [
        ("REST API Response Latency (GET)", "< 5.0 ms", "< 15.0 ms", "Python `time.perf_counter()` benchmark harness"),
        ("Transaction Write Latency (POST)", "< 8.0 ms", "< 20.0 ms", "SQLite transaction timer across 3-table writes"),
        ("Client SPA View Switch Latency", "< 10.0 ms", "< 16.6 ms (60 FPS)", "Chrome DevTools Performance Profiler"),
        ("System Cold Startup Time", "< 0.50 seconds", "< 1.50 seconds", "Operating system process launch timer"),
        ("Memory Consumption (Server)", "< 20 MB RAM", "< 50 MB RAM", "Windows Task Manager / Linux `ps -aux` RSS"),
        ("Memory Consumption (Client)", "< 40 MB RAM", "< 100 MB RAM", "Browser Task Manager per active tab"),
        ("Mean Time to Recovery (MTTR)", "< 5.0 seconds", "< 15.0 seconds", "Server restart and database auto-reconnect"),
        ("Mean Time Between Failures (MTBF)", "> 2,000 Hours", "> 1,000 Hours", "24-hour synthetic stress testing soak cycle")
    ]
    for sm, sla, wc, mi in sli_data:
        rc = sli_table.add_row().cells
        rc[0].text = sm
        rc[1].text = sla
        rc[2].text = wc
        rc[3].text = mi
        rc[0].paragraphs[0].runs[0].font.bold = True
        for i in range(4):
            set_cell_margins(rc[i], top=30, bottom=30, left=50, right=50)
            p_c = rc[i].paragraphs[0]
            p_c.paragraph_format.line_spacing = 1.15
            p_c.paragraph_format.space_after = Pt(2)
            p_c.runs[0].font.size = Pt(9.0)

    add_heading_1(doc, "3.4 Hardware Requirements & Infrastructure Sizing")
    add_body_paragraph(doc, "The hardware requirements for deploying and running VetiCare in clinic workstations or academic demonstration environments are detailed in Table 3.5 below:")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Table 3.5: Hardware Requirements Specification & Infrastructure Sizing")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11)
    r.font.bold = True

    hw_table = doc.add_table(rows=1, cols=3)
    hw_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    h_hw = hw_table.rows[0].cells
    h_hw[0].text = "Hardware Component"
    h_hw[1].text = "Minimum Specification"
    h_hw[2].text = "Recommended Specification"
    for c in h_hw:
        set_cell_shading(c, "E6E6E6")
        c.paragraphs[0].runs[0].font.bold = True

    hw_specs = [
        ("Processor (CPU)", "Intel Core i3 or AMD Ryzen 3 (Dual Core 2.0 GHz)", "Intel Core i5 / AMD Ryzen 5 / Apple M1 (Quad Core 3.0 GHz+)"),
        ("System Memory (RAM)", "2 GB RAM", "8 GB RAM or higher"),
        ("Storage (Disk Space)", "100 MB available local disk space", "500 MB Solid State Drive (SSD) storage"),
        ("Display Resolution", "1024 x 768 pixels", "1920 x 1080 (Full HD) responsive display"),
        ("Network Interface", "Local Loopback (`127.0.0.1`)", "Gigabit Ethernet / Wi-Fi for local LAN clinic access"),
        ("Receipt Printer (Opt.)", "Standard A4 Document Printer", "80mm Thermal Receipt Printer (POS Thermal)")
    ]
    for comp, min_s, rec_s in hw_specs:
        rc = hw_table.add_row().cells
        rc[0].text = comp
        rc[1].text = min_s
        rc[2].text = rec_s
        rc[0].paragraphs[0].runs[0].font.bold = True
        for i in range(3):
            set_cell_margins(rc[i], top=35, bottom=35, left=70, right=70)
            p_c = rc[i].paragraphs[0]
            p_c.paragraph_format.line_spacing = 1.15
            p_c.paragraph_format.space_after = Pt(2)
            p_c.runs[0].font.size = Pt(9.5)

    add_heading_1(doc, "3.5 Software Requirements Specification")
    add_body_paragraph(doc, "The software stack required for host execution, web client rendering, and relational database management is detailed in Table 3.6:")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Table 3.6: Software Requirements Specification & Dependencies")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11)
    r.font.bold = True

    sw_table = doc.add_table(rows=1, cols=3)
    sw_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    h_sw = sw_table.rows[0].cells
    h_sw[0].text = "Software Layer"
    h_sw[1].text = "Required Component"
    h_sw[2].text = "Purpose & Version"
    for c in h_sw:
        set_cell_shading(c, "E6E6E6")
        c.paragraphs[0].runs[0].font.bold = True

    sw_specs = [
        ("Operating System", "Windows 10/11, macOS, or Linux", "Cross-platform host environment"),
        ("Web Browser Client", "Google Chrome, Mozilla Firefox, Microsoft Edge, Safari", "Modern HTML5/CSS3/ES6 JavaScript web browser runtime"),
        ("Python Backend Engine", "Python 3.8+", "Native HTTP server (`server.py`) with standard `sqlite3` module"),
        ("PHP Backend Engine (Alt)", "PHP 8.0+", "Alternative web server runtime (`api.php`) with PDO SQLite driver"),
        ("Database Management System", "SQLite 3", "Serverless embedded relational DBMS engine (`veticare.db`)"),
        ("Development IDE", "VS Code / Antigravity IDE", "Code authoring, testing, and debugging environment")
    ]
    for layer, req_c, purp in sw_specs:
        rc = sw_table.add_row().cells
        rc[0].text = layer
        rc[1].text = req_c
        rc[2].text = purp
        rc[0].paragraphs[0].runs[0].font.bold = True
        for i in range(3):
            set_cell_margins(rc[i], top=35, bottom=35, left=70, right=70)
            p_c = rc[i].paragraphs[0]
            p_c.paragraph_format.line_spacing = 1.15
            p_c.paragraph_format.space_after = Pt(2)
            p_c.runs[0].font.size = Pt(9.5)

    add_heading_1(doc, "3.6 External Interface Requirements")
    add_body_paragraph(doc, "External interface requirements define logical and physical connections between VetiCare and external hardware, software, and human users:")
    add_body_paragraph(doc, "1. User Interface (UI): Web-based graphical user interface featuring a left navigation sidebar, top search bar, dashboard metric cards, card grid layouts, data tables, modal form dialogs, and thermal receipt views.")
    add_body_paragraph(doc, "2. Hardware Interface: Standard keyboard and mouse inputs, high-resolution color monitor display, and optional USB/LAN connection to 80mm thermal receipt printers.")
    add_body_paragraph(doc, "3. Software Interface: Operating system local socket interface (`127.0.0.1:8000`), standard POSIX file system access for `veticare.db`, and W3C-compliant browser DOM rendering engine.")
    add_body_paragraph(doc, "4. Communication Interface: Standard HTTP protocol communications exchanging JSON formatted request-response payloads over local TCP loopback connections.")

    add_heading_1(doc, "3.7 Security & Data Integrity Requirements")
    add_body_paragraph(doc, "Security and data integrity requirements ensure that clinical records remain safe against corruption, tampering, or unauthorized external exposure:")
    add_body_paragraph(doc, "• Parameterized Database Queries: All SQL queries executing against `veticare.db` must utilize prepared statement placeholders (`?`) to prevent SQL Injection attacks.")
    add_body_paragraph(doc, "• Input HTML Sanitization: String inputs captured from form controls must be sanitized before DOM insertion to prevent Cross-Site Scripting (XSS) attacks.")
    add_body_paragraph(doc, "• Local Socket Binding: Server listeners must bind exclusively to `127.0.0.1` to prevent remote un-authenticated TCP access.")

    add_heading_1(doc, "3.8 System Constraints & Operational Assumptions")
    add_body_paragraph(doc, "Development and deployment of VetiCare proceed under explicit operational assumptions: single-clinic concurrent execution bounds, local disk availability for SQLite storage, and standard W3C browser compatibility.")
