/**
 * VetiCare - Core Application Script
 * State Management, Routing, Database Operations, and Global UI Controllers
 */

window.app = window.app || {};

Object.assign(window.app, {
    // Database Storage wrapper
    db: {
        get: (key) => JSON.parse(localStorage.getItem(`veticare_${key}`)),
        set: (key, data) => localStorage.setItem(`veticare_${key}`, JSON.stringify(data)),
        init: () => {
            // Seed default data if not present
            if (!localStorage.getItem('veticare_owners')) {
                const defaultOwners = [
                    { id: 'o-1', name: 'John Doe', phone: '(555) 123-4567', email: 'john.doe@example.com', address: '742 Evergreen Terrace, Springfield', emergencyContact: 'Jane Doe - (555) 123-4568', createdAt: '2025-01-10T10:00:00.000Z' },
                    { id: 'o-2', name: 'Alice Smith', phone: '(555) 987-6543', email: 'alice.smith@example.com', address: '123 Maple St, Oakville', emergencyContact: 'Bob Smith - (555) 987-6544', createdAt: '2025-03-14T14:30:00.000Z' },
                    { id: 'o-3', name: 'David Miller', phone: '(555) 456-7890', email: 'david.miller@example.com', address: '456 Pine Rd, Pineville', emergencyContact: 'Sarah Miller - (555) 456-7891', createdAt: '2025-06-20T09:15:00.000Z' },
                    { id: 'o-4', name: 'Emily Watson', phone: '(555) 321-7654', email: 'emily.w@example.com', address: '789 Birch Ave, Riverdale', emergencyContact: 'Arthur Watson - (555) 321-7650', createdAt: '2025-11-05T16:00:00.000Z' }
                ];
                app.db.set('owners', defaultOwners);
            }

            if (!localStorage.getItem('veticare_pets')) {
                const defaultPets = [
                    { id: 'p-1', ownerId: 'o-1', name: 'Buddy', species: 'Dog', breed: 'Golden Retriever', dob: '2021-04-12', weight: 32.4, vaccination: 'Up-to-date', notes: 'Friendly, loves tennis balls. Allergic to penicillin.' },
                    { id: 'p-2', ownerId: 'o-2', name: 'Luna', species: 'Cat', breed: 'Siamese', dob: '2023-01-18', weight: 4.2, vaccination: 'Up-to-date', notes: 'Quiet, easily startled. Indoor cat.' },
                    { id: 'p-3', ownerId: 'o-2', name: 'Max', species: 'Dog', breed: 'French Bulldog', dob: '2022-09-05', weight: 12.1, vaccination: 'Partially Vaccinated', notes: 'Mild skin allergies. Needs special hypoallergenic diet.' },
                    { id: 'p-4', ownerId: 'o-3', name: 'Coco', species: 'Bird', breed: 'Cockatiel', dob: '2024-03-01', weight: 0.1, vaccination: 'Not Vaccinated', notes: 'Loves mimicking whistles. Prefers sunflower seeds.' },
                    { id: 'p-5', ownerId: 'o-4', name: 'Rocky', species: 'Dog', breed: 'German Shepherd', dob: '2020-11-20', weight: 38.0, vaccination: 'Up-to-date', notes: 'Loyal guard dog, highly trained. Calm around other pets.' }
                ];
                app.db.set('pets', defaultPets);
            }

            if (!localStorage.getItem('veticare_appointments')) {
                // Generate appointments (some today for dashboard demo)
                const today = new Date().toISOString().split('T')[0];
                const defaultAppointments = [
                    { id: 'a-1', petId: 'p-1', vetName: 'Dr. S. Jenkins', dateTime: `${today}T09:30`, reason: 'Annual Checkup & Vaccines', status: 'Completed' },
                    { id: 'a-2', petId: 'p-2', vetName: 'Dr. S. Jenkins', dateTime: `${today}T11:00`, reason: 'Ear Infection Examination', status: 'Scheduled' },
                    { id: 'a-3', petId: 'p-3', vetName: 'Dr. S. Jenkins', dateTime: `${today}T14:30`, reason: 'Skin Allergy Follow-up', status: 'Scheduled' },
                    { id: 'a-4', petId: 'p-5', vetName: 'Dr. S. Jenkins', dateTime: '2026-08-02T10:00', reason: 'Routine Checkup & Rabies Shot', status: 'Scheduled' }
                ];
                app.db.set('appointments', defaultAppointments);
            }

            if (!localStorage.getItem('veticare_treatments')) {
                const defaultTreatments = [
                    { id: 't-1', petId: 'p-1', dateTime: '2025-11-12T10:15', symptoms: 'Lethargy and mild vomiting', diagnosis: 'Minor Food Poisoning (Ingested spoiled grass)', medications: 'Anti-emetic syrup, light diet for 48 hours', cost: 120.00, notes: 'Fully recovered. Owner advised to keep dog away from compost bin.' },
                    { id: 't-2', petId: 'p-3', dateTime: '2026-06-15T15:00', symptoms: 'Severe itching skin and red paws', diagnosis: 'Seasonal Atopic Dermatitis', medications: 'Apoquel 5mg daily, medicated shampoo bath twice weekly', cost: 85.00, notes: 'Follow-up appointment scheduled for checkup.' }
                ];
                app.db.set('treatments', defaultTreatments);
            }
        }
    },

    // Simple Hash Router & View Switcher
    router: {
        activeView: 'dashboard',
        
        init: () => {
            window.addEventListener('hashchange', () => {
                const hash = window.location.hash.slice(1) || 'dashboard';
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
            if (initialHash.startsWith('owner-details/')) {
                app.owners.showDetail(initialHash.split('/')[1]);
            } else if (initialHash.startsWith('pet-details/')) {
                app.pets.showDetail(initialHash.split('/')[1]);
            } else {
                app.router.navigate(initialHash, false);
            }
        },

        navigate: (viewName, updateHash = true) => {
            app.router.activeView = viewName;
            
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
        }
    },

    // Initialization hook
    init: () => {
        app.db.init();
        app.ui.init();
        app.router.init();
    }
});

// Start application when DOM is fully ready
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
