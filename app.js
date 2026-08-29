/**
 * VetiCare - Core Application Script
 * State Management, Routing, Database Operations, and Global UI Controllers
 */

window.app = window.app || {};

Object.assign(window.app, {
    // Database Storage wrapper
    db: {
        // Base API URL
        apiURL: 'http://localhost:3000/api',

        // Memory cache representing DBMS state
        state: {
            owners: [],
            pets: [],
            appointments: [],
            treatments: [],
            invoices: []
        },

        // Helper wrapper to fetch table data from the backend
        loadState: async () => {
            try {
                const [owners, pets, appointments, treatments, invoices] = await Promise.all([
                    fetch(`${app.db.apiURL}/owners`).then(r => r.json()),
                    fetch(`${app.db.apiURL}/pets`).then(r => r.json()),
                    fetch(`${app.db.apiURL}/appointments`).then(r => r.json()),
                    fetch(`${app.db.apiURL}/treatments`).then(r => r.json()),
                    fetch(`${app.db.apiURL}/invoices`).then(r => r.json())
                ]);

                app.db.state = { owners, pets, appointments, treatments, invoices };
            } catch (err) {
                console.error('Error fetching state from DBMS backend:', err);
            }
        },

        // Syncs with cached data synchronously to avoid breaking existing renderer logic
        get: (key) => {
            return app.db.state[key] || [];
        },

        // For backward compatibility and local states like theme
        getLocal: (key) => JSON.parse(localStorage.getItem(`veticare_${key}`)),
        setLocal: (key, data) => localStorage.setItem(`veticare_${key}`, JSON.stringify(data)),
        
        init: async () => {
            // Seeding is handled backend-side in server.js now!
            await app.db.loadState();
        }
    },

    // Simple Hash Router & View Switcher
    router: {
        activeView: 'dashboard',
        
        init: () => {
            window.addEventListener('hashchange', async () => {
                const hash = window.location.hash.slice(1) || 'dashboard';
                // Reload state from backend
                await app.db.loadState();

                // Handle sub-pages (e.g. owner-details, pet-details)
                if (hash.startsWith('owner-details/')) {
                    const id = hash.split('/')[1];
                    app.owners.showDetail(id);
                } else if (hash.startsWith('pet-details/')) {
                    const id = hash.split('/')[1];
                    app.pets.showDetail(id);
                } else {
                    app.router.navigate(hash, false);
                }
            });

            // Trigger initial load
            const initialHash = window.location.hash.slice(1) || 'dashboard';
            (async () => {
                await app.db.loadState();
                if (initialHash.startsWith('owner-details/')) {
                    app.owners.showDetail(initialHash.split('/')[1]);
                } else if (initialHash.startsWith('pet-details/')) {
                    app.pets.showDetail(initialHash.split('/')[1]);
                } else {
                    app.router.navigate(initialHash, false);
                }
            })();
        },

        navigate: async (viewName, updateHash = true) => {
            app.router.activeView = viewName;

            // Load fresh data before render
            await app.db.loadState();
            
            // Toggle active class on sidebar navigation links
            document.querySelectorAll('.nav-item').forEach(link => {
                if (link.getAttribute('data-view') === viewName) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });

            // Update main action button in header based on current view
            const actionBtn = document.getElementById('header-action-btn');
            const actionText = document.getElementById('header-action-text');
            
            if (viewName === 'owners') {
                actionBtn.style.display = 'inline-flex';
                actionText.textContent = 'Add Owner';
                actionBtn.onclick = () => app.ui.openOwnerModal();
            } else if (viewName === 'pets') {
                actionBtn.style.display = 'inline-flex';
                actionText.textContent = 'Add Patient';
                actionBtn.onclick = () => app.ui.openPetModal();
            } else if (viewName === 'appointments') {
                actionBtn.style.display = 'inline-flex';
                actionText.textContent = 'Book Slot';
                actionBtn.onclick = () => app.ui.openAppointmentModal();
            } else if (viewName === 'treatments') {
                actionBtn.style.display = 'inline-flex';
                actionText.textContent = 'Record Visit';
                actionBtn.onclick = () => app.ui.openTreatmentModal();
            } else {
                actionBtn.style.display = 'none';
            }

            // Switch visible panel in UI
            document.querySelectorAll('.view-panel').forEach(panel => {
                if (panel.id === `view-${viewName}`) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });

            // Render view-specific content
            if (viewName === 'dashboard') {
                app.dashboard.render();
            } else if (viewName === 'owners') {
                app.owners.renderList();
            } else if (viewName === 'pets') {
                app.pets.renderList();
            } else if (viewName === 'appointments') {
                app.appointments.initCalendar();
                app.appointments.renderAgenda();
            } else if (viewName === 'treatments') {
                app.treatments.renderList();
            } else if (viewName === 'billing') {
                app.billing.renderList();
            } else if (viewName === 'reports') {
                app.reports.render();
            }

            if (updateHash) {
                window.location.hash = viewName;
            }

            // Scroll view back to top
            document.querySelector('.view-viewport').scrollTop = 0;
        }
    },

    // Dashboard calculations and visualizations
    dashboard: {
        render: () => {
            const owners = app.db.get('owners') || [];
            const pets = app.db.get('pets') || [];
            const appointments = app.db.get('appointments') || [];
            const treatments = app.db.get('treatments') || [];

            // Stats computations
            const todayStr = new Date().toISOString().split('T')[0];
            const todayAppointments = appointments.filter(a => a.dateTime.startsWith(todayStr));
            
            // Calculate today's revenue (from treatments recorded today, plus general consultation fee $50 for finished appointments)
            const completedToday = appointments.filter(a => a.dateTime.startsWith(todayStr) && a.status === 'Completed');
            let todayRevenue = completedToday.length * 50; // base fee
            
            treatments.forEach(t => {
                if (t.dateTime.startsWith(todayStr)) {
                    todayRevenue += Number(t.cost || 0);
                }
            });

            // Update UI Elements
            document.getElementById('stat-owners').textContent = owners.length;
            document.getElementById('stat-pets').textContent = pets.length;
            document.getElementById('stat-appointments').textContent = todayAppointments.length;
            document.getElementById('today-apt-count').textContent = todayAppointments.length;
            document.getElementById('stat-revenue').textContent = `$${todayRevenue.toFixed(2)}`;

            // Render Today's Schedule List
            const scheduleContainer = document.getElementById('dashboard-schedule');
            scheduleContainer.innerHTML = '';

            if (todayAppointments.length === 0) {
                scheduleContainer.innerHTML = '<div class="empty-state">No appointments scheduled for today.</div>';
            } else {
                // Sort by time
                todayAppointments.sort((a, b) => a.dateTime.localeCompare(b.dateTime));
                
                todayAppointments.forEach(apt => {
                    const pet = pets.find(p => p.id === apt.petId) || { name: 'Unknown Patient' };
                    const owner = owners.find(o => o.id === pet.ownerId) || { name: 'Unknown Owner' };
                    const time = apt.dateTime.split('T')[1];
                    
                    const item = document.createElement('div');
                    item.className = 'schedule-item';
                    item.onclick = () => window.location.hash = `pet-details/${pet.id}`;
                    item.innerHTML = `
                        <div class="sch-time">${time}</div>
                        <div class="sch-info">
                            <div class="sch-pet-name">
                                ${pet.name} 
                                <span class="badge" style="background-color: var(--bg-surface-elevated); font-size: 10px; padding: 2px 6px;">
                                    ${pet.species}
                                </span>
                            </div>
                            <div class="sch-owner">Owner: ${owner.name}</div>
                        </div>
                        <span class="sch-type">${apt.reason}</span>
                    `;
                    scheduleContainer.appendChild(item);
                });
            }

            // Render Species breakdown chart (Dynamic SVG Pie/Donut Chart)
            app.dashboard.renderSpeciesChart(pets);
        },

        renderSpeciesChart: (pets) => {
            const chartDiv = document.getElementById('species-breakdown-chart');
            const legendDiv = document.getElementById('species-legends');
            chartDiv.innerHTML = '';
            legendDiv.innerHTML = '';

            if (pets.length === 0) {
                chartDiv.innerHTML = '<div style="font-size:12px;color:var(--text-muted);text-align:center;padding-top:40px;">No Data</div>';
                return;
            }

            // Calculate frequencies
            const speciesCounts = {};
            pets.forEach(p => {
                const sp = p.species || 'Other';
                speciesCounts[sp] = (speciesCounts[sp] || 0) + 1;
            });

            const total = pets.length;
            const speciesArray = Object.entries(speciesCounts).map(([name, count]) => ({
                name,
                count,
                percentage: (count / total) * 100
            }));

            // Colors array
            const colors = ['var(--color-primary)', 'var(--color-secondary)', 'var(--color-accent)', 'var(--color-success)', '#94a3b8'];

            // Generate Donut SVG
            let svgContent = `<svg width="100%" height="100%" viewBox="0 0 42 42" class="donut">
                <circle class="donut-hole" cx="21" cy="21" r="15.91549430918954" fill="transparent"></circle>
                <circle class="donut-ring" cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="var(--border-color)" stroke-width="4"></circle>
            `;

            let accumulatedPercentage = 0;
            speciesArray.forEach((item, index) => {
                const color = colors[index % colors.length];
                const dashArray = `${item.percentage} ${100 - item.percentage}`;
                const dashOffset = 100 - accumulatedPercentage + 25; // start from top (12 o'clock)
                
                svgContent += `
                    <circle class="donut-segment" cx="21" cy="21" r="15.91549430918954" 
                            fill="transparent" stroke="${color}" stroke-width="4.2" 
                            stroke-dasharray="${dashArray}" stroke-dashoffset="${dashOffset}">
                    </circle>
                `;
                
                accumulatedPercentage += item.percentage;

                // Render legend
                const legendItem = document.createElement('div');
                legendItem.className = 'legend-item';
                legendItem.innerHTML = `
                    <span class="legend-color" style="background-color: ${color};"></span>
                    <span>${item.name} (${item.count})</span>
                `;
                legendDiv.appendChild(legendItem);
            });

            // Center text
            svgContent += `
                <g class="chart-text">
                    <text x="50%" y="50%" class="chart-number" text-anchor="middle" dy="-2" fill="var(--text-main)" font-size="6" font-weight="800">${total}</text>
                    <text x="50%" y="50%" class="chart-label" text-anchor="middle" dy="4" fill="var(--text-muted)" font-size="3" font-weight="600">Total Pets</text>
                </g>
            </svg>`;

            chartDiv.innerHTML = svgContent;
        }
    },

    // UI Overlay / Modals Controller
    ui: {
        theme: 'dark',

        init: () => {
            // Theme Toggle
            const savedTheme = localStorage.getItem('veticare_theme') || 'dark';
            app.ui.setTheme(savedTheme);

            document.getElementById('theme-toggle').onclick = () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
                app.ui.setTheme(nextTheme);
            };

            // Global search interaction
            const searchInput = document.getElementById('global-search');
            searchInput.oninput = (e) => {
                const query = e.target.value.toLowerCase();
                if (app.router.activeView === 'owners') {
                    app.owners.renderList(query);
                } else if (app.router.activeView === 'pets') {
                    app.pets.renderList(query);
                }
            };

            // Setup modals click-to-close on overlay
            document.querySelectorAll('.modal-overlay').forEach(overlay => {
                overlay.onclick = (e) => {
                    if (e.target === overlay) {
                        app.ui.closeAllModals();
                    }
                };
            });

            // Modal Close Buttons
            document.getElementById('close-owner-modal').onclick = () => app.ui.closeAllModals();
            document.getElementById('cancel-owner-modal').onclick = () => app.ui.closeAllModals();
            document.getElementById('close-pet-modal').onclick = () => app.ui.closeAllModals();
            document.getElementById('cancel-pet-modal').onclick = () => app.ui.closeAllModals();
            document.getElementById('close-appointment-modal').onclick = () => app.ui.closeAllModals();
            document.getElementById('cancel-appointment-modal').onclick = () => app.ui.closeAllModals();
            document.getElementById('close-treatment-modal').onclick = () => app.ui.closeAllModals();
            document.getElementById('cancel-treatment-modal').onclick = () => app.ui.closeAllModals();
            document.getElementById('close-invoice-modal').onclick = () => app.ui.closeAllModals();
            document.getElementById('cancel-invoice-modal').onclick = () => app.ui.closeAllModals();

            // Submit Forms
            document.getElementById('owner-form').onsubmit = (e) => {
                e.preventDefault();
                app.owners.save();
            };

            document.getElementById('pet-form').onsubmit = (e) => {
                e.preventDefault();
                app.pets.save();
            };

            document.getElementById('appointment-form').onsubmit = (e) => {
                e.preventDefault();
                app.appointments.save();
            };

            document.getElementById('treatment-form').onsubmit = (e) => {
                e.preventDefault();
                app.treatments.save();
            };
        },

        setTheme: (theme) => {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('veticare_theme', theme);
            app.ui.theme = theme;
        },

        closeAllModals: () => {
            document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
            document.getElementById('owner-form').reset();
            document.getElementById('pet-form').reset();
            document.getElementById('appointment-form').reset();
            document.getElementById('treatment-form').reset();
            document.getElementById('owner-id').value = '';
            document.getElementById('pet-id').value = '';
            document.getElementById('appointment-id').value = '';
            document.getElementById('treatment-id').value = '';
            document.getElementById('treatment-appt-id').value = '';
            document.getElementById('appointment-collision-alert').style.display = 'none';
        },

        openAppointmentModal: (apptData = null, preselectedDate = null) => {
            app.ui.closeAllModals();
            const modal = document.getElementById('appointment-modal');
            const title = document.getElementById('appointment-modal-title');
            const petSelect = document.getElementById('appt-pet');
            
            // Populate pets select
            const pets = app.db.get('pets') || [];
            petSelect.innerHTML = '<option value="" disabled selected>Select Pet / Patient...</option>';
            pets.sort((a, b) => a.name.localeCompare(b.name)).forEach(pet => {
                petSelect.innerHTML += `<option value="${pet.id}">${pet.name} (${pet.species})</option>`;
            });

            if (apptData) {
                title.textContent = 'Edit Consultation Slot';
                document.getElementById('appointment-id').value = apptData.id;
                document.getElementById('appt-pet').value = apptData.petId;
                document.getElementById('appt-vet').value = apptData.vetName;
                document.getElementById('appt-date').value = apptData.dateTime.split('T')[0];
                document.getElementById('appt-time').value = apptData.dateTime.split('T')[1];
                document.getElementById('appt-reason').value = apptData.reason;
            } else {
                title.textContent = 'Book Consultation Slot';
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('appt-date').value = preselectedDate || today;
            }

            modal.classList.add('active');
        },

        openTreatmentModal: (treatmentData = null, prefilledPetId = null, prefilledApptId = null) => {
            app.ui.closeAllModals();
            const modal = document.getElementById('treatment-modal');
            const title = document.getElementById('treatment-modal-title');
            const petSelect = document.getElementById('treatment-pet');

            // Populate pets select
            const pets = app.db.get('pets') || [];
            petSelect.innerHTML = '<option value="" disabled selected>Select Pet / Patient...</option>';
            pets.sort((a, b) => a.name.localeCompare(b.name)).forEach(pet => {
                petSelect.innerHTML += `<option value="${pet.id}">${pet.name} (${pet.species})</option>`;
            });

            if (treatmentData) {
                title.textContent = 'Edit Treatment Record';
                document.getElementById('treatment-id').value = treatmentData.id;
                document.getElementById('treatment-appt-id').value = treatmentData.appointmentId || '';
                document.getElementById('treatment-pet').value = treatmentData.petId;
                document.getElementById('treatment-date').value = treatmentData.dateTime;
                document.getElementById('treatment-symptoms').value = treatmentData.symptoms;
                document.getElementById('treatment-diagnosis').value = treatmentData.diagnosis;
                document.getElementById('treatment-meds').value = treatmentData.medications || '';
                document.getElementById('treatment-vaccine').value = treatmentData.vaccineGiven || '';
                document.getElementById('treatment-cost').value = treatmentData.cost;
                document.getElementById('treatment-notes').value = treatmentData.notes || '';
            } else {
                title.textContent = 'Record Clinic Visit & Treatments';
                
                // Prefills
                if (prefilledPetId) {
                    petSelect.value = prefilledPetId;
                }
                if (prefilledApptId) {
                    document.getElementById('treatment-appt-id').value = prefilledApptId;
                }
                
                // Prefill current date & time
                const now = new Date();
                const tzOffset = now.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(now - tzOffset)).toISOString().slice(0, 16);
                document.getElementById('treatment-date').value = localISOTime;
            }

            modal.classList.add('active');
        },

        openOwnerModal: (ownerData = null) => {
            app.ui.closeAllModals();
            const modal = document.getElementById('owner-modal');
            const title = document.getElementById('owner-modal-title');
            
            if (ownerData) {
                title.textContent = 'Edit Owner Profile';
                document.getElementById('owner-id').value = ownerData.id;
                document.getElementById('owner-name').value = ownerData.name;
                document.getElementById('owner-phone').value = ownerData.phone;
                document.getElementById('owner-email').value = ownerData.email;
                document.getElementById('owner-address').value = ownerData.address || '';
                document.getElementById('owner-emergency').value = ownerData.emergencyContact || '';
            } else {
                title.textContent = 'Register New Owner';
            }
            
            modal.classList.add('active');
            document.getElementById('owner-name').focus();
        },

        openPetModal: (petData = null, preselectedOwnerId = null) => {
            app.ui.closeAllModals();
            const modal = document.getElementById('pet-modal');
            const title = document.getElementById('pet-modal-title');
            const ownerSelect = document.getElementById('pet-owner');
            
            // Populate owners dropdown selection list
            const owners = app.db.get('owners') || [];
            ownerSelect.innerHTML = '<option value="" disabled selected>Select Owner...</option>';
            owners.sort((a, b) => a.name.localeCompare(b.name)).forEach(owner => {
                ownerSelect.innerHTML += `<option value="${owner.id}">${owner.name}</option>`;
            });

            if (petData) {
                title.textContent = 'Edit Patient Profile';
                document.getElementById('pet-id').value = petData.id;
                document.getElementById('pet-name').value = petData.name;
                document.getElementById('pet-owner').value = petData.ownerId;
                document.getElementById('pet-species').value = petData.species;
                document.getElementById('pet-breed').value = petData.breed;
                document.getElementById('pet-dob').value = petData.dob;
                document.getElementById('pet-weight').value = petData.weight;
                document.getElementById('pet-vaccination').value = petData.vaccination;
                document.getElementById('pet-notes').value = petData.notes || '';
            } else {
                title.textContent = 'Add New Patient Profile';
                if (preselectedOwnerId) {
                    ownerSelect.value = preselectedOwnerId;
                }
            }

            modal.classList.add('active');
            document.getElementById('pet-name').focus();
        },

        openInvoiceModal: (invoice) => {
            app.ui.closeAllModals();
            const modal = document.getElementById('invoice-modal');

            const pets = app.db.get('pets') || [];
            const owners = app.db.get('owners') || [];

            const pet = pets.find(p => p.id === invoice.petId) || { name: 'Unknown Pet', species: 'Other', breed: 'Unknown', ownerId: '' };
            const owner = owners.find(o => o.id === pet.ownerId) || { name: 'Unknown Owner', email: '-', phone: '-' };

            // Populate text elements
            document.getElementById('inv-id').textContent = invoice.id;
            document.getElementById('inv-date').textContent = new Date(invoice.dateTime).toLocaleString();
            document.getElementById('inv-owner-name').textContent = owner.name;
            document.getElementById('inv-owner-email').textContent = owner.email;
            document.getElementById('inv-owner-phone').textContent = owner.phone;
            document.getElementById('inv-pet-name').textContent = pet.name;
            document.getElementById('inv-pet-details').textContent = `${pet.species} / ${pet.breed}`;

            // Line items
            const chargesList = document.getElementById('inv-charges-list');
            chargesList.innerHTML = `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px 0; color: #0f172a;">Base Consultation Fee</td>
                    <td style="padding: 8px 0; text-align: right; color: #0f172a;">$${Number(invoice.consultationFee).toFixed(2)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px 0; color: #0f172a;">Clinical Treatment (${invoice.reason})</td>
                    <td style="padding: 8px 0; text-align: right; color: #0f172a;">$${Number(invoice.treatmentCost).toFixed(2)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 8px 0; color: #0f172a;">Pharmacy / Medicines</td>
                    <td style="padding: 8px 0; text-align: right; color: #0f172a;">$${Number(invoice.medicineCost).toFixed(2)}</td>
                </tr>
            `;

            // Totals
            const subtotal = Number(invoice.consultationFee) + Number(invoice.treatmentCost) + Number(invoice.medicineCost);
            const tax = Number(invoice.tax);
            const total = Number(invoice.total);

            document.getElementById('inv-subtotal').textContent = `$${subtotal.toFixed(2)}`;
            document.getElementById('inv-tax').textContent = `$${tax.toFixed(2)}`;
            document.getElementById('inv-total').textContent = `$${total.toFixed(2)}`;

            // Stamp boxes
            const stampBox = document.getElementById('inv-status-stamp-box');
            const stampLabel = document.getElementById('inv-status-stamp');
            const payBtn = document.getElementById('pay-invoice-btn');

            stampBox.className = 'receipt-status-stamp-box';
            if (invoice.status === 'Paid') {
                stampBox.classList.add('stamp-paid');
                stampLabel.textContent = 'Paid';
                payBtn.style.display = 'none';
            } else {
                stampBox.classList.add('stamp-pending');
                stampLabel.textContent = 'Pending';
                payBtn.style.display = 'inline-flex';
                payBtn.onclick = () => {
                    app.billing.pay(invoice.id);
                };
            }

            modal.classList.add('active');
        }
    },

    // Initialization hook
    init: async () => {
        await app.db.init();
        app.ui.init();
        app.router.init();
    }
});

// Start application when DOM is fully ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
