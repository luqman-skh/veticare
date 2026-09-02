/**
 * VetiCare - Veterinary Clinic Management System (Academic Single File Client Engine)
 */

window.app = {
    // API & State Layer
    apiURL: window.location.pathname.endsWith('.php') ? 'api.php' : '/api',
    state: { owners: [], pets: [], appointments: [], treatments: [], invoices: [] },

    loadData: async () => {
        try {
            const url = app.apiURL === 'api.php' ? 'api.php?action=get_data' : '/api/data';
            const res = await fetch(url);
            const data = await res.json();
            app.state = data;
        } catch (err) {
            console.error('Error connecting to backend API:', err);
        }
    },

    postAPI: async (endpoint, actionPHP, payload) => {
        const url = app.apiURL === 'api.php' ? `api.php?action=${actionPHP}` : `/api/${endpoint}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        await app.loadData();
        return await res.json();
    },

    putAPI: async (endpoint, actionPHP, payload = {}) => {
        const url = app.apiURL === 'api.php' ? `api.php?action=${actionPHP}` : `/api/${endpoint}`;
        await fetch(url, {
            method: app.apiURL === 'api.php' ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        await app.loadData();
    },

    // Hash Router
    router: {
        activeView: 'dashboard',
        init: () => {
            window.addEventListener('hashchange', async () => {
                const hash = window.location.hash.slice(1) || 'dashboard';
                await app.loadData();
                if (hash.startsWith('owner-details/')) app.owners.showDetail(hash.split('/')[1]);
                else if (hash.startsWith('pet-details/')) app.pets.showDetail(hash.split('/')[1]);
                else app.router.navigate(hash);
            });
        },
        navigate: async (viewName) => {
            app.router.activeView = viewName;
            document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.getAttribute('data-view') === viewName));
            document.querySelectorAll('.view-panel').forEach(el => el.classList.toggle('active', el.id === `view-${viewName}`));
            
            if (viewName === 'dashboard') app.dashboard.render();
            else if (viewName === 'owners') app.owners.render();
            else if (viewName === 'pets') app.pets.render();
            else if (viewName === 'appointments') app.appointments.render();
            else if (viewName === 'treatments') app.treatments.render();
            else if (viewName === 'billing') app.billing.render();
        }
    },

    // Dashboard
    dashboard: {
        render: () => {
            const { owners, pets, appointments, invoices } = app.state;
            document.getElementById('stat-pets-count').textContent = pets.length;
            document.getElementById('stat-owners-count').textContent = owners.length;
            
            const todayStr = new Date().toISOString().split('T')[0];
            const todayAppts = appointments.filter(a => a.dateTime.startsWith(todayStr));
            document.getElementById('stat-today-count').textContent = todayAppts.length;

            const paidTotal = invoices.filter(i => i.status === 'Paid').reduce((sum, i) => sum + Number(i.total), 0);
            document.getElementById('stat-revenue').textContent = `$${paidTotal.toFixed(2)}`;

            const list = document.getElementById('recent-visits-list');
            list.innerHTML = app.state.treatments.slice(0, 5).map(t => {
                const pet = pets.find(p => p.id === t.petId) || { name: 'Pet' };
                return `<div class="activity-item"><strong>${pet.name}</strong> - Diagnosis: ${t.diagnosis} ($${Number(t.cost).toFixed(2)})</div>`;
            }).join('') || '<div class="activity-item">No clinical activity recorded.</div>';
        }
    },

    // Owners Module
    owners: {
        render: (query = '') => {
            const grid = document.getElementById('owners-grid');
            let list = app.state.owners;
            if (query) list = list.filter(o => o.name.toLowerCase().includes(query.toLowerCase()));
            
            grid.innerHTML = list.map(o => {
                const petCount = app.state.pets.filter(p => p.ownerId === o.id).length;
                return `
                <div class="card" onclick="window.location.hash='owner-details/${o.id}'">
                    <h3>${o.name}</h3>
                    <p>${o.phone} • ${o.email}</p>
                    <span class="badge badge-success" style="margin-top:8px;">${petCount} Pets</span>
                </div>`;
            }).join('');
        },
        showDetail: (id) => {
            const owner = app.state.owners.find(o => o.id === id);
            if (!owner) return window.location.hash = 'owners';
            
            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('view-owner-details').classList.add('active');
            
            document.getElementById('od-avatar').textContent = owner.name[0];
            document.getElementById('od-name').textContent = owner.name;
            document.getElementById('od-contact').textContent = `${owner.phone} | ${owner.email} | ${owner.address}`;
            
            const petsList = app.state.pets.filter(p => p.ownerId === id);
            document.getElementById('od-pets-list').innerHTML = petsList.map(p => `
                <div class="card" onclick="window.location.hash='pet-details/${p.id}'">
                    <h4>${p.name} (${p.species})</h4>
                    <p>${p.breed} • ${p.weight} kg</p>
                </div>
            `).join('') || '<p>No pets registered.</p>';

            document.getElementById('btn-add-pet-to-owner').onclick = () => app.ui.openPetModal(null, owner.id);
        },
        save: async () => {
            const id = document.getElementById('owner-id').value;
            const payload = {
                id: id || undefined,
                name: document.getElementById('owner-name').value,
                phone: document.getElementById('owner-phone').value,
                email: document.getElementById('owner-email').value,
                address: document.getElementById('owner-address').value,
                emergencyContact: document.getElementById('owner-emergency').value,
            };
            await app.postAPI('owners', 'save_owner', payload);
            app.ui.closeModals();
            app.owners.render();
        }
    },

    // Pets Module
    pets: {
        render: (query = '') => {
            const grid = document.getElementById('pets-grid');
            let list = app.state.pets;
            if (query) list = list.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));

            grid.innerHTML = list.map(p => `
                <div class="card" onclick="window.location.hash='pet-details/${p.id}'">
                    <h3>${p.name}</h3>
                    <p>${p.species} - ${p.breed}</p>
                    <span class="badge ${p.vaccination === 'Up-to-date' ? 'badge-success' : 'badge-warning'}">${p.vaccination}</span>
                </div>
            `).join('');
        },
        showDetail: (id) => {
            const pet = app.state.pets.find(p => p.id === id);
            if (!pet) return window.location.hash = 'pets';

            document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'));
            document.getElementById('view-pet-details').classList.add('active');

            document.getElementById('pd-name').textContent = pet.name;
            document.getElementById('pd-meta').textContent = `${pet.species} • ${pet.breed} • DOB: ${pet.dob} (${pet.weight} kg)`;
            
            const badge = document.getElementById('pd-vaccine-badge');
            badge.textContent = pet.vaccination;
            badge.className = `badge ${pet.vaccination === 'Up-to-date' ? 'badge-success' : 'badge-warning'}`;

            const treatments = app.state.treatments.filter(t => t.petId === id);
            document.getElementById('pd-treatments-list').innerHTML = treatments.map(t => `
                <div class="activity-item">
                    <strong>${t.dateTime}</strong> - Diagnosis: ${t.diagnosis} (${t.symptoms})
                </div>
            `).join('') || '<p>No visit history recorded.</p>';
        },
        save: async () => {
            const id = document.getElementById('pet-id').value;
            const payload = {
                id: id || undefined,
                ownerId: document.getElementById('pet-owner').value,
                name: document.getElementById('pet-name').value,
                species: document.getElementById('pet-species').value,
                breed: document.getElementById('pet-breed').value,
                dob: document.getElementById('pet-dob').value,
                weight: parseFloat(document.getElementById('pet-weight').value),
                vaccination: document.getElementById('pet-vaccination').value,
                notes: document.getElementById('pet-notes').value
            };
            await app.postAPI('pets', 'save_pet', payload);
            app.ui.closeModals();
            app.pets.render();
        }
    },

    // Appointments Module
    appointments: {
        render: () => {
            const list = document.getElementById('agenda-list');
            list.innerHTML = app.state.appointments.map(a => {
                const pet = app.state.pets.find(p => p.id === a.petId) || { name: 'Pet' };
                const isScheduled = a.status === 'Scheduled';
                return `
                <div class="activity-item" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <strong>${a.dateTime}</strong> - <span>${pet.name}</span> (${a.vetName})
                        <p style="color:var(--text-muted); font-size:0.85rem;">${a.reason}</p>
                    </div>
                    <div>
                        ${isScheduled ? `
                            <button class="secondary-btn btn-sm" onclick="app.appointments.cancel('${a.id}')">Cancel</button>
                            <button class="primary-btn btn-sm" onclick="app.ui.openTreatmentModal(null, '${a.petId}', '${a.id}')">Complete</button>
                        ` : `<span class="badge ${a.status === 'Completed' ? 'badge-success' : 'badge-danger'}">${a.status}</span>`}
                    </div>
                </div>`;
            }).join('') || '<div class="activity-item">No appointments scheduled.</div>';
        },
        save: async () => {
            const payload = {
                id: document.getElementById('appointment-id').value || undefined,
                petId: document.getElementById('appt-pet').value,
                vetName: document.getElementById('appt-vet').value,
                dateTime: `${document.getElementById('appt-date').value}T${document.getElementById('appt-time').value}`,
                reason: document.getElementById('appt-reason').value
            };
            await app.postAPI('appointments', 'save_appointment', payload);
            app.ui.closeModals();
            app.appointments.render();
        },
        cancel: async (id) => {
            await app.putAPI(`appointments/${id}/cancel`, 'cancel_appointment', { id });
            app.appointments.render();
        }
    },

    // Treatments Module
    treatments: {
        render: () => {
            const list = document.getElementById('treatments-list');
            list.innerHTML = app.state.treatments.map(t => {
                const pet = app.state.pets.find(p => p.id === t.petId) || { name: 'Pet' };
                return `
                <div class="activity-item">
                    <div style="display:flex; justify-content:space-between;">
                        <strong>${pet.name} - ${t.diagnosis}</strong>
                        <span>$${Number(t.cost).toFixed(2)}</span>
                    </div>
                    <p style="color:var(--text-muted); font-size:0.85rem;">Symptoms: ${t.symptoms} | Meds: ${t.medications || 'None'}</p>
                </div>`;
            }).join('') || '<div class="activity-item">No visits recorded.</div>';
        },
        save: async () => {
            const apptId = document.getElementById('treatment-appt-id').value;
            const payload = {
                id: document.getElementById('treatment-id').value || undefined,
                appointmentId: apptId || undefined,
                petId: document.getElementById('treatment-pet').value,
                dateTime: document.getElementById('treatment-date').value,
                symptoms: document.getElementById('treatment-symptoms').value,
                diagnosis: document.getElementById('treatment-diagnosis').value,
                medications: document.getElementById('treatment-meds').value,
                vaccineGiven: document.getElementById('treatment-vaccine').value,
                cost: parseFloat(document.getElementById('treatment-cost').value)
            };
            if (apptId) await app.putAPI(`appointments/${apptId}/complete`, 'complete_appointment', { id: apptId });
            await app.postAPI('treatments', 'save_treatment', payload);
            app.ui.closeModals();
            app.treatments.render();
        }
    },

    // Billing Module
    billing: {
        render: (query = '') => {
            const tbody = document.getElementById('invoices-table-body');
            let list = app.state.invoices;
            if (query) list = list.filter(i => i.id.toLowerCase().includes(query.toLowerCase()) || i.reason.toLowerCase().includes(query.toLowerCase()));

            tbody.innerHTML = list.map(inv => {
                const pet = app.state.pets.find(p => p.id === inv.petId) || { name: 'Pet' };
                const isPaid = inv.status === 'Paid';
                return `
                <tr>
                    <td>${inv.id}</td>
                    <td>${inv.dateTime}</td>
                    <td>${pet.name}</td>
                    <td>${inv.reason}</td>
                    <td>$${Number(inv.total).toFixed(2)}</td>
                    <td><span class="badge ${isPaid ? 'badge-success' : 'badge-warning'}">${inv.status}</span></td>
                    <td>
                        <button class="secondary-btn btn-sm" onclick="app.billing.openReceipt('${inv.id}')">Receipt</button>
                        ${!isPaid ? `<button class="primary-btn btn-sm" onclick="app.billing.pay('${inv.id}')">Pay</button>` : ''}
                    </td>
                </tr>`;
            }).join('');
        },
        pay: async (id) => {
            await app.putAPI(`invoices/${id}/pay`, 'pay_invoice', { id });
            app.billing.render();
        },
        openReceipt: (invId) => {
            const inv = app.state.invoices.find(i => i.id === invId);
            if (!inv) return;
            const pet = app.state.pets.find(p => p.id === inv.petId) || { name: 'Pet' };

            document.getElementById('receipt-content').innerHTML = `
                <header>
                    <h2>VetiCare Clinic</h2>
                    <p>Official Receipt #${inv.id}</p>
                    <p>Date: ${inv.dateTime}</p>
                </header>
                <p><strong>Patient:</strong> ${pet.name}</p>
                <p><strong>Reason:</strong> ${inv.reason}</p>
                <hr style="border:none; border-top:1px dashed #000; margin:8px 0;">
                <table>
                    <tr><td>Consultation Fee:</td><td style="text-align:right">$${Number(inv.consultationFee).toFixed(2)}</td></tr>
                    <tr><td>Treatment Fee:</td><td style="text-align:right">$${Number(inv.treatmentCost).toFixed(2)}</td></tr>
                    <tr><td>Pharmacy/Meds:</td><td style="text-align:right">$${Number(inv.medicineCost).toFixed(2)}</td></tr>
                    <tr><td>Tax (8%):</td><td style="text-align:right">$${Number(inv.tax).toFixed(2)}</td></tr>
                    <tr style="font-weight:bold;"><td>Total:</td><td style="text-align:right">$${Number(inv.total).toFixed(2)}</td></tr>
                </table>
                <p style="text-align:center; margin-top:10px;">Status: <strong>${inv.status}</strong></p>
            `;
            document.getElementById('invoice-modal').classList.add('active');
        }
    },

    // UI Helpers & Modals
    ui: {
        init: () => {
            document.getElementById('theme-btn').onclick = () => {
                const current = document.documentElement.getAttribute('data-theme');
                document.documentElement.setAttribute('data-theme', current === 'dark' ? 'light' : 'dark');
            };

            document.getElementById('owner-search').oninput = (e) => app.owners.render(e.target.value);
            document.getElementById('pet-search').oninput = (e) => app.pets.render(e.target.value);
            document.getElementById('billing-search').oninput = (e) => app.billing.render(e.target.value);
        },
        closeModals: () => document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active')),
        openOwnerModal: () => {
            document.getElementById('owner-form').reset();
            document.getElementById('owner-id').value = '';
            document.getElementById('owner-modal').classList.add('active');
        },
        openPetModal: (pet = null, ownerId = null) => {
            const select = document.getElementById('pet-owner');
            select.innerHTML = app.state.owners.map(o => `<option value="${o.id}">${o.name}</option>`).join('');
            if (ownerId) select.value = ownerId;
            document.getElementById('pet-form').reset();
            document.getElementById('pet-id').value = '';
            document.getElementById('pet-modal').classList.add('active');
        },
        openAppointmentModal: () => {
            const select = document.getElementById('appt-pet');
            select.innerHTML = app.state.pets.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            document.getElementById('appointment-form').reset();
            document.getElementById('appt-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('appointment-modal').classList.add('active');
        },
        openTreatmentModal: (t = null, petId = null, apptId = null) => {
            const select = document.getElementById('treatment-pet');
            select.innerHTML = app.state.pets.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
            if (petId) select.value = petId;
            document.getElementById('treatment-form').reset();
            document.getElementById('treatment-appt-id').value = apptId || '';
            document.getElementById('treatment-date').value = new Date().toISOString().slice(0, 16);
            document.getElementById('treatment-modal').classList.add('active');
        }
    }
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
    app.ui.init();
    app.router.init();
    await app.loadData();
    const initialHash = window.location.hash.slice(1) || 'dashboard';
    app.router.navigate(initialHash);
});
