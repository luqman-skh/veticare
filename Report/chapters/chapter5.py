import os
from docx.shared import Pt
from docx.enum.table import WD_TABLE_ALIGNMENT
from .common import (
    add_chapter_title, add_heading_1, add_heading_2, add_heading_3,
    add_body_paragraph, add_code_block, set_cell_margins, set_cell_shading
)

def build_chapter_5(doc):
    doc.add_page_break()
    add_chapter_title(doc, "Chapter V", "Implementation")

    add_heading_1(doc, "5.1 Engineering Implementation Strategy & Phased Development Sprints")
    add_body_paragraph(doc, "Implementation is the phase of software engineering where abstract design models, relational schemas, and system specifications are converted into executable source code. The VetiCare application was constructed following a modular, layered implementation process designed to maintain a clean codebase footprint (<1,100 lines) while achieving high execution performance.")
    add_body_paragraph(doc, "Development was organized across six structured two-week Agile sprints, ensuring systematic component integration and verification:")

    sprints = [
        ("Sprint 1 (Weeks 1-2): Database Schema & Seeding Engine", "Implemented relational SQLite schema (`veticare.db`) across 5 normalized tables (`owners`, `pets`, `appointments`, `treatments`, `invoices`). Enabled foreign key enforcement (`PRAGMA foreign_keys = ON;`) and developed automatic seeding logic populating demo clinic data on initial cold launch."),
        ("Sprint 2 (Weeks 3-4): Dual Zero-Dependency REST API Layer", "Constructed two interchangeable backend API servers: a native Python server (`server.py`) using standard library `http.server` and `sqlite3`, and an alternative PHP script (`api.php`) using PHP Data Objects (PDO). Implemented CORS headers and JSON dispatch tables for GET, POST, and PUT actions."),
        ("Sprint 3 (Weeks 5-6): Client SPA Core Architecture & Router", "Constructed single-page HTML layout (`index.html`) and Vanilla CSS design system (`style.css`). Engineered client JavaScript SPA controller (`app.js`) featuring URI hash routing (`#dashboard`, `#owners`, `#pets`, `#appointments`, `#billing`), state management (`app.state`), and asynchronous API fetch helpers."),
        ("Sprint 4 (Weeks 7-8): Directory & Scheduler Sub-Systems", "Developed interactive client views: Owner directory grid with real-time text search filtering, multi-pet linkage views, patient health cards with age calculation, and appointment scheduler with daily agenda filtering."),
        ("Sprint 5 (Weeks 9-10): Clinical Visit Engine & Auto-Invoicing", "Constructed consultation completion modal form capturing SOAP examination notes. Implemented atomic multi-table backend transaction logic that simultaneously writes treatment logs, synchronizes pet vaccination badges, and generates pending itemized invoices."),
        ("Sprint 6 (Weeks 11-12): Thermal POS Printing & System Hardening", "Engineered 300px thermal receipt layout using CSS `@media print` rules, suppressing browser UI during POS printing. Conducted input sanitization, error hardening, and cross-platform verification across Windows, Linux, and macOS.")
    ]
    for sp_num, sp_desc in sprints:
        add_body_paragraph(doc, sp_desc, bold_prefix=f"{sp_num}: ")

    add_heading_1(doc, "5.2 Architectural Breakdown of Core Implementation Files")
    add_body_paragraph(doc, "To achieve academic auditability and adhere to report printing standards, the VetiCare application is partitioned into five specialized source files, each serving a distinct architectural responsibility:")

    add_heading_2(doc, "5.2.1 Presentation View Layout (`index.html`)")
    add_body_paragraph(doc, "The presentation layer is implemented as a single HTML5 document (`index.html`) establishing the DOM container layout for the Single Page Application (SPA). Navigational view panels are defined as sibling container sections (`<section id=\"view-xxx\" class=\"view-panel\">`) toggled dynamically by the client router.")
    add_body_paragraph(doc, "Key structural elements include:\n"
                            "• Persistent Sidebar Navigation (`<aside class=\"sidebar\">`): Encapsulates clinic branding, SVG icons, navigation anchor links (`#dashboard`, `#owners`, `#pets`, `#appointments`, `#billing`), and theme toggle controls.\n"
                            "• Metric Overview Dashboard (`#view-dashboard`): Renders operational KPI cards (Total Clients, Active Patients, Today's Appointments, Gross Revenue) alongside recent clinical visit timelines.\n"
                            "• Modal Form Dialogs (`#owner-modal`, `#pet-modal`, `#appointment-modal`, `#treatment-modal`): Accessible overlays capturing administrative and clinical inputs without navigating away from the active screen.\n"
                            "• Thermal POS Receipt Container (`#invoice-modal`): Isolated 300px monospaced receipt layout designed for browser printing.")

    add_heading_2(doc, "5.2.2 Styling System & Print Engine (`style.css`)")
    add_body_paragraph(doc, "The styling tier (`style.css`) provides a complete Vanilla CSS design system built on CSS Custom Properties (variables) for instant Dark/Light theme switching.")
    add_body_paragraph(doc, "Core design system modules:\n"
                            "• Design Tokens (`:root`): Defines semantic variables for primary accent colors (`--primary: #2563eb`), card backgrounds (`--bg-card`), text typography (`--text-main`), and border radii (`--radius: 12px`).\n"
                            "• Dark Mode Theme Engine (`[data-theme=\"dark\"]`): Overrides background variables (`--bg-main: #0f172a`, `--bg-card: #1e293b`), delivering high visual contrast for dim clinical exam rooms.\n"
                            "• Responsive CSS Grid & Flexbox Rules: Implements dynamic responsive grids (`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`) ensuring tablet and desktop compatibility.\n"
                            "• POS Thermal Print Engine (`@media print`): Hides web application controls, sidebars, and headers (`display: none !important`), isolating the 300px monospaced receipt modal `#invoice-modal` for thermal printers.")

    add_heading_2(doc, "5.2.3 Client Single Page Application Controller (`app.js`)")
    add_body_paragraph(doc, "The client application logic (`app.js`) is organized into a modular namespace object (`window.app`) managing state, HTTP requests, URI hash routing, and DOM view rendering. Core sub-modules include:\n"
                            "• State Cache (`app.state`): Central memory store containing arrays for `owners`, `pets`, `appointments`, `treatments`, and `invoices`.\n"
                            "• Hash Router (`app.router`): Evaluates `window.location.hash`, updates navigation active classes, and displays target view sections.\n"
                            "• Module Renderers (`app.owners.render()`, `app.pets.render()`, `app.appointments.render()`, `app.billing.render()`): Generates sanitized HTML card grids and data tables via template strings.")

    add_heading_2(doc, "5.2.4 Native Python Backend Server (`server.py`)")
    add_body_paragraph(doc, "The native Python backend (`server.py`) utilizes standard library modules (`http.server`, `socketserver`, `sqlite3`, `json`, `urllib.parse`), binding to `127.0.0.1:8000`. The server dispatches incoming requests to `do_GET`, `do_POST`, and `do_PUT` handlers, managing atomic SQLite transactions and CORS headers without external dependencies.")

    add_heading_2(doc, "5.2.5 Alternative PHP PDO Backend Server (`api.php`)")
    add_body_paragraph(doc, "The alternative PHP backend (`api.php`) provides an identical REST API implementation for standard LAMP/WAMP/XAMPP hosting stacks. Utilizing PHP Data Objects (PDO), it enforces prepared statement parameter binding and atomic multi-table transactions.")

    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Table 5.1: Codebase Module Metrics & Line Count Breakdown")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(11)
    r.font.bold = True

    metric_table = doc.add_table(rows=1, cols=4)
    metric_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    h_m = metric_table.rows[0].cells
    h_m[0].text = "File Name"
    h_m[1].text = "Role & Architectural Layer"
    h_m[2].text = "Line Count"
    h_m[3].text = "Primary Responsibility"
    for c in h_m:
        set_cell_shading(c, "E6E6E6")
        c.paragraphs[0].runs[0].font.bold = True

    metrics = [
        ("`index.html`", "Presentation View Layout", "~240 lines", "Single-page HTML layout containing view panels, data grids, modal forms, and receipt templates."),
        ("`style.css`", "Styling & Responsive Theme Engine", "~160 lines", "CSS design system, CSS variables, dark/light theme definitions, card grids, and thermal print `@media` rules."),
        ("`app.js`", "Client SPA & State Manager", "~280 lines", "Hash router, asynchronous API fetch routines, local state caching, event handlers, and view rendering functions."),
        ("`server.py` / `api.php`","Zero-Dependency REST Backend API", "~170 lines", "Native HTTP routing, SQLite schema initialization, transaction management, auto-invoicing logic, and JSON API response serialization.")
    ]
    for fn, role, lc, resp in metrics:
        rc = metric_table.add_row().cells
        rc[0].text = fn
        rc[1].text = role
        rc[2].text = lc
        rc[3].text = resp
        rc[0].paragraphs[0].runs[0].font.bold = True
        for i in range(4):
            set_cell_margins(rc[i], top=35, bottom=35, left=60, right=60)
            p_c = rc[i].paragraphs[0]
            p_c.paragraph_format.line_spacing = 1.15
            p_c.paragraph_format.space_after = Pt(2)
            p_c.runs[0].font.size = Pt(9.5)

    add_heading_1(doc, "5.3 Detailed Technical Challenges & Implementation Solutions")
    add_body_paragraph(doc, "During the implementation phase, six significant technical challenges were encountered and successfully resolved:")

    issues = [
        ("Issue 1: Cross-Origin Resource Sharing (CORS) Preflight Restraints", 
         "Problem: Web browsers blocked cross-origin asynchronous `fetch` requests sent from the front-end SPA to the API server during development testing.\n"
         "Solution: Standard HTTP CORS response headers (`Access-Control-Allow-Origin: *`, `Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS`, `Access-Control-Allow-Headers: Content-Type`) were implemented in both `server.py` and `api.php`, alongside explicit `do_OPTIONS` HTTP verb handling returning HTTP 200 OK immediately."),
        
        ("Issue 2: Transaction Atomicity in Multi-Table Treatment & Invoicing Writes", 
         "Problem: Recording a clinical treatment requires writing to `treatments`, creating an entry in `invoices`, and updating `pets.vaccination`. If any write fails midway, data corruption occurs.\n"
         "Solution: Database write operations were enclosed within explicit SQL transaction boundaries (`BEGIN TRANSACTION` ... `COMMIT` / `ROLLBACK`). If any step fails, the entire transaction rolls back cleanly, guaranteeing zero orphaned invoices or un-synchronized health badges."),
        
        ("Issue 3: Orphaned Child Records on Entity Deletion", 
         "Problem: Deleting an owner or pet record in traditional databases often leaves orphaned appointment or treatment records.\n"
         "Solution: Foreign key enforcement was explicitly enabled (`PRAGMA foreign_keys = ON;`), and declarative `ON DELETE CASCADE` clauses were defined across all child relational schemas (`pets`, `appointments`, `treatments`, `invoices`)."),
        
        ("Issue 4: Seamless Dual Backend Compatibility (Python vs PHP)", 
         "Problem: Supporting dual backend runtimes (`server.py` vs `api.php`) required handling slight differences in HTTP request path parsing and query parameters.\n"
         "Solution: A dynamic API endpoint detection helper (`app.apiURL`) was implemented in `app.js` that inspects `window.location.pathname` and automatically selects between RESTful path endpoints (`/api/treatments`) and PHP action parameters (`api.php?action=save_treatment`)."),
        
        ("Issue 5: Printable Thermal Receipt POS Formatting", 
         "Problem: Standard web browser printing outputs full A4 pages with web headers, navigation sidebars, and URLs, ruining thermal receipt formatting.\n"
         "Solution: Specialized CSS `@media print` rules were written to isolate `#invoice-modal`, enforce a 300px monospaced layout, set `visibility: hidden` for all background UI elements, and force standard POS high-contrast styling."),
        
        ("Issue 6: Client-Side State Synchronization & Race Condition Prevention", 
         "Problem: Rapid successive form submissions (e.g. creating multiple appointments) could lead to race conditions where the client UI renders stale cached data.\n"
         "Solution: An asynchronous promise-chaining pattern was enforced in `app.js` (`await app.postAPI(...); await app.fetchData();`). UI submit buttons are immediately disabled upon click and re-enabled only after state synchronization finishes, preventing duplicate submissions.")
    ]

    for issue_title, issue_desc in issues:
        add_body_paragraph(doc, issue_desc, bold_prefix=f"{issue_title}: ")

    add_heading_1(doc, "5.4 Core Algorithms, Pseudocode & Mathematical Formulations")
    add_body_paragraph(doc, "The core algorithmic logic governing VetiCare operations is formally defined below with step-by-step pseudocode and mathematical formulations:")

    add_heading_2(doc, "5.4.1 Algorithm 1: Client-Side URI Hash Routing and Dynamic View Dispatching")
    add_body_paragraph(doc, "Algorithm 1 intercepts browser navigation events and dynamically toggles visible DOM views without page reloads:")
    add_code_block(doc, 
"""ALGORITHM 1: Client-Side URI Hash Routing and View Dispatcher
INPUT: Browser window.location.hash string
OUTPUT: Activated DOM view panel and updated navigation UI state

1. FUNCTION app.router():
2.     rawHash <- window.location.hash
3.     targetRoute <- rawHash.substring(1)  // Strip leading '#' character
4.     IF targetRoute IS EMPTY THEN:
5.         targetRoute <- "dashboard"        // Default view
6.     END IF
7.     
8.     validRoutes <- ["dashboard", "owners", "pets", "appointments", "billing", "owner-details", "pet-details"]
9.     IF targetRoute NOT IN validRoutes THEN:
10.        targetRoute <- "dashboard"
11.    END IF
12.    
13.    // Hide all view panels
14.    FOR EACH panel IN document.querySelectorAll(".view-panel"):
15.        panel.classList.remove("active")
16.    END FOR
17.    
18.    // Deactivate all navigation links
19.    FOR EACH link IN document.querySelectorAll(".nav-link"):
20.        link.classList.remove("active")
21.    END FOR
22.    
23.    // Activate target view panel
24.    activePanel <- document.getElementById("view-" + targetRoute)
25.    IF activePanel IS NOT NULL THEN:
26.        activePanel.classList.add("active")
27.    END IF
28.    
29.    // Highlight corresponding navigation link
30.    activeLink <- document.querySelector(".nav-link[href='#" + targetRoute + "']")
31.    IF activeLink IS NOT NULL THEN:
32.        activeLink.classList.add("active")
33.    END IF
34.    
35.    // Trigger view-specific rendering
36.    IF targetRoute == "owners" THEN app.owners.render()
37.    ELSE IF targetRoute == "pets" THEN app.pets.render()
38.    ELSE IF targetRoute == "appointments" THEN app.appointments.render()
39.    ELSE IF targetRoute == "billing" THEN app.billing.render()
40.    ELSE IF targetRoute == "dashboard" THEN app.dashboard.render()
41.    END IF
42. END FUNCTION""")

    add_heading_2(doc, "5.4.2 Algorithm 2: Atomic Multi-Table Clinical Visit Recording & Auto-Invoicing")
    add_body_paragraph(doc, "Algorithm 2 enforces transaction atomicity when persisting consultation logs, synchronizing immunization badges, and generating financial invoices:")
    add_code_block(doc,
"""ALGORITHM 2: Atomic Clinical Visit Recording, Vaccine Sync & Auto-Invoicing
INPUT: HTTP Request JSON Body { petId, appointmentId, symptoms, diagnosis, medications, vaccineGiven, cost }
OUTPUT: HTTP Response { status: 'success', treatmentId, invoiceId } OR Error Rollback

1. FUNCTION HandleClinicalVisit(payload):
2.     dbConnection <- OpenDatabaseConnection("veticare.db")
3.     dbConnection.execute("PRAGMA foreign_keys = ON")
4.     dbConnection.execute("BEGIN TRANSACTION")
5.     
6.     TRY:
7.         // 1. Generate unique identifiers and timestamps
8.         treatmentId <- "t-" + GenerateRandomHex(4)
9.         invoiceId <- "INV-" + GenerateRandomInteger(1000, 9999)
10.        currentTimestamp <- GetCurrentISOTimestamp()
11.        
12.        // 2. Insert clinical treatment record
13.        sqlTreatment <- "INSERT INTO treatments (id, appointmentId, petId, dateTime, symptoms, diagnosis, medications, vaccineGiven, cost, notes) VALUES (?,?,?,?,?,?,?,?,?,?)"
14.        dbConnection.execute(sqlTreatment, [treatmentId, payload.appointmentId, payload.petId, currentTimestamp, payload.symptoms, payload.diagnosis, payload.medications, payload.vaccineGiven, payload.cost, ""])
15.        
16.        // 3. Automated Immunization Synchronization
17.        IF payload.vaccineGiven IS NOT NULL AND TRIM(payload.vaccineGiven) != "" THEN:
18.            sqlVaccine <- "UPDATE pets SET vaccination = 'Up-to-date' WHERE id = ?"
19.            dbConnection.execute(sqlVaccine, [payload.petId])
20.        END IF
21.        
22.        // 4. Automated Fee Math & Invoicing
23.        baseConsultationFee <- 50.00
24.        procedureCost <- Float(payload.cost)
25.        IF payload.vaccineGiven != "" THEN medicineCost <- 25.00
26.        ELSE IF payload.medications != "" THEN medicineCost <- 15.00
27.        ELSE medicineCost <- 0.00
28.        END IF
29.        
30.        subtotal <- baseConsultationFee + procedureCost + medicineCost
31.        tax <- RoundToTwoDecimals(subtotal * 0.08)
32.        totalAmount <- RoundToTwoDecimals(subtotal + tax)
33.        
34.        sqlInvoice <- "INSERT INTO invoices (id, treatmentId, petId, dateTime, consultationFee, treatmentCost, medicineCost, tax, total, status, paymentMethod, reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"
35.        dbConnection.execute(sqlInvoice, [invoiceId, treatmentId, payload.petId, currentTimestamp, baseConsultationFee, procedureCost, medicineCost, tax, totalAmount, "Pending", "Pending", payload.diagnosis])
36.        
37.        // 5. Update appointment status if originating from scheduler
38.        IF payload.appointmentId IS NOT NULL AND payload.appointmentId != "" THEN:
39.            dbConnection.execute("UPDATE appointments SET status = 'Completed' WHERE id = ?", [payload.appointmentId])
40.        END IF
41.        
42.        // 6. Commit atomic transaction
43.        dbConnection.execute("COMMIT")
44.        RETURN HttpResponse(200, { status: "success", treatmentId: treatmentId, invoiceId: invoiceId })
45.        
46.    CATCH Exception AS err:
47.        dbConnection.execute("ROLLBACK")
48.        RETURN HttpResponse(500, { status: "error", message: err.toString() })
49.    END TRY
50. END FUNCTION""")

    add_heading_2(doc, "5.4.3 Algorithm 3: Financial Line-Item Computation, Sales Tax Calculation & Currency Rounding")
    add_body_paragraph(doc, "Algorithm 3 details the mathematical formulas governing invoice fee aggregation and two-decimal currency rounding:")
    add_body_paragraph(doc, "Mathematical Formulations:\n"
                            "$$\\text{Subtotal} = C_{\\text{base}} + C_{\\text{procedure}} + C_{\\text{medication}}$$\n"
                            "$$\\text{Tax} = \\text{Round}_{2}\\left(\\text{Subtotal} \\times r_{\\text{tax}}\\right), \\quad \\text{where } r_{\\text{tax}} = 0.08$$\n"
                            "$$\\text{Total} = \\text{Subtotal} + \\text{Tax}$$\n"
                            "where $C_{\\text{base}} = 50.00$ USD, $C_{\\text{procedure}} = \\text{cost}$, and $C_{\\text{medication}} \\in \\{0.00, 15.00, 25.00\\}$.")
    add_code_block(doc,
"""ALGORITHM 3: Financial Line-Item Computation & Currency Rounding
INPUT: procedureFee (float), medications (string), vaccineGiven (string)
OUTPUT: InvoiceSummary { baseFee, procedureCost, medicineCost, subtotal, tax, total }

1. FUNCTION ComputeInvoice(procedureFee, medications, vaccineGiven):
2.     baseFee <- 50.00
3.     procCost <- Max(0.00, Float(procedureFee))
4.     
5.     IF vaccineGiven != "" THEN:
6.         medCost <- 25.00
7.     ELSE IF medications != "" THEN:
8.         medCost <- 15.00
9.     ELSE:
10.        medCost <- 0.00
11.    END IF
12.    
13.    subtotal <- Round(baseFee + procCost + medCost, 2)
14.    taxRate <- 0.08
15.    tax <- Round(subtotal * taxRate, 2)
16.    total <- Round(subtotal + tax, 2)
17.    
18.    RETURN { baseFee: baseFee, procedureCost: procCost, medicineCost: medCost, subtotal: subtotal, tax: tax, total: total }
19. END FUNCTION""")

    add_heading_2(doc, "5.4.4 Algorithm 4: Patient Age Calculation and Immunization Status Evaluation")
    add_body_paragraph(doc, "Algorithm 4 computes pet patient age in years and months from the date of birth (DOB) string:")
    add_code_block(doc,
"""ALGORITHM 4: Patient Age Calculation from ISO Date of Birth
INPUT: dobString (Format: "YYYY-MM-DD")
OUTPUT: Formatted string (e.g. "3 yrs 4 mos" or "5 mos")

1. FUNCTION CalculatePetAge(dobString):
2.     IF dobString IS NULL OR dobString == "" THEN RETURN "Unknown"
3.     birthDate <- ParseDate(dobString)
4.     today <- CurrentDate()
5.     
6.     years <- today.year - birthDate.year
7.     months <- today.month - birthDate.month
8.     
9.     IF today.day < birthDate.day THEN
10.        months <- months - 1
11.    END IF
12.    
13.    IF months < 0 THEN
14.        years <- years - 1
15.        months <- months + 12
16.    END IF
17.    
18.    IF years > 0 THEN:
19.        RETURN years + " yrs " + months + " mos"
20.    ELSE:
21.        RETURN months + " mos"
22.    END IF
23. END FUNCTION""")

    add_heading_2(doc, "5.4.5 Algorithm 5: Dynamic Client-Side Real-Time Search & Card Filtering")
    add_body_paragraph(doc, "Algorithm 5 performs instantaneous client-side filtering over registered owner and pet state arrays with $O(N)$ computational complexity:")
    add_code_block(doc,
"""ALGORITHM 5: Dynamic Client-Side Real-Time Search & Card Filtering
INPUT: query (string), targetEntity ("owners" | "pets")
OUTPUT: Rendered HTML card grid in DOM

1. FUNCTION FilterDirectory(query, targetEntity):
2.     cleanQuery <- query.toLowerCase().trim()
3.     cardsContainer <- document.getElementById(targetEntity + "-grid")
4.     
5.     IF targetEntity == "owners":
6.         records <- app.state.owners
7.         filtered <- records.filter(owner => 
8.             owner.name.toLowerCase().includes(cleanQuery) ||
9.             owner.phone.toLowerCase().includes(cleanQuery) ||
10.            owner.email.toLowerCase().includes(cleanQuery)
11.        )
12.    ELSE IF targetEntity == "pets":
13.        records <- app.state.pets
14.        filtered <- records.filter(pet => 
15.            pet.name.toLowerCase().includes(cleanQuery) ||
16.            pet.species.toLowerCase().includes(cleanQuery) ||
17.            pet.breed.toLowerCase().includes(cleanQuery)
18.        )
19.    END IF
20.    
21.    IF filtered.length == 0 THEN:
22.        cardsContainer.innerHTML = "<p class='text-muted'>No matching records found.</p>"
23.    ELSE:
24.        cardsContainer.innerHTML = GenerateCardsHTML(filtered)
25.    END IF
26. END FUNCTION""")

    add_heading_1(doc, "5.5 Detailed Code Snippets & Architecture Analysis")
    add_body_paragraph(doc, "To demonstrate implementation quality and clean engineering practices, critical code sections from the production codebase are analyzed:")

    add_heading_2(doc, "5.5.1 Python Backend Transaction Handler (`server.py`)")
    add_body_paragraph(doc, "The excerpt below illustrates the atomic multi-table transaction context in `server.py`:")
    add_code_block(doc,
"""# Excerpt from server.py: Atomic multi-table write transaction
elif path == '/api/treatments':
    treatment_id = 't-' + str(int(time.time() * 1000))[-6:]
    inv_id = 'INV-' + str(random.randint(1000, 9999))
    now = datetime.datetime.utcnow().isoformat() + 'Z'
    
    conn = get_db()
    cursor = conn.cursor()
    try:
        cursor.execute("BEGIN TRANSACTION")
        # 1. Insert Treatment Log
        cursor.execute('''INSERT INTO treatments VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (treatment_id, data.get('appointmentId',''), data['petId'], now,
             data['symptoms'], data['diagnosis'], data.get('medications',''),
             data.get('vaccineGiven',''), float(data['cost']), ''))
             
        # 2. Auto-generate Invoices record
        base_fee = 50.0
        proc_cost = float(data['cost'])
        med_cost = 25.0 if data.get('vaccineGiven') else (15.0 if data.get('medications') else 0.0)
        subtotal = base_fee + proc_cost + med_cost
        tax = round(subtotal * 0.08, 2)
        total = round(subtotal + tax, 2)
        
        cursor.execute('''INSERT INTO invoices VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (inv_id, treatment_id, data['petId'], now, base_fee, proc_cost, med_cost,
             tax, total, 'Pending', 'Pending', data['diagnosis']))
             
        # 3. Synchronize Vaccine Status
        if data.get('vaccineGiven'):
            cursor.execute("UPDATE pets SET vaccination = 'Up-to-date' WHERE id = ?", (data['petId'],))
            
        conn.commit()
        self.send_json({'status': 'success', 'id': treatment_id, 'invoiceId': inv_id})
    except Exception as e:
        conn.rollback()
        self.send_error(500, str(e))
    finally:
        conn.close()""")

    add_heading_2(doc, "5.5.2 Client-Side Hash Router Listener (`app.js`)")
    add_body_paragraph(doc, "The excerpt below illustrates event-driven hash navigation in `app.js`:")
    add_code_block(doc,
"""// Excerpt from app.js: Client-Side Single Page Application Router
init() {
    window.addEventListener('hashchange', () => this.router());
    this.router();
    this.fetchData();
    this.initTheme();
},

router() {
    const hash = window.location.hash || '#dashboard';
    const view = hash.substring(1);
    
    document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    
    const target = document.getElementById(`view-${view}`);
    if (target) target.classList.add('active');
    
    const navLink = document.querySelector(`.nav-link[href="${hash}"]`);
    if (navLink) navLink.classList.add('active');
    
    if (view === 'owners') this.owners.render();
    if (view === 'pets') this.pets.render();
    if (view === 'appointments') this.appointments.render();
    if (view === 'billing') this.billing.render();
}""")

    add_heading_1(doc, "5.6 Defensive Programming, Error Handling & Security Implementation")
    add_body_paragraph(doc, "VetiCare adopts defensive programming practices across both client and server tiers:")
    add_body_paragraph(doc, "1. Client-Side HTML Entity Sanitization (`escapeHTML`): All user-generated strings (e.g. owner names, symptoms, notes) are passed through an escaping helper before DOM insertion, transforming `&`, `<`, `>`, `\"`, and `'` into safe HTML entities to prevent Cross-Site Scripting (XSS).")
    add_body_paragraph(doc, "2. Parameterized Prepared Statements: All database queries in `server.py` and `api.php` use strict parameter binding placeholders (`?`), completely preventing SQL Injection vulnerabilities.")
    add_body_paragraph(doc, "3. Localhost Socket Isolation: The backend server binds strictly to `127.0.0.1:8000`, blocking external un-authenticated requests from adjacent local area network (LAN) devices.")
