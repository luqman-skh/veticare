/**
 * VetiCare - Clinical Treatment & Medical Records Component
 */

window.app = window.app || {};

app.treatments = {
    // Render the global list of clinic treatments
    renderList: (searchQuery = '') => {
        const logsContainer = document.getElementById('clinical-logs-list');
        if (!logsContainer) return;

        logsContainer.innerHTML = '';

        let treatments = app.db.get('treatments') || [];
        const pets = app.db.get('pets') || [];
        const owners = app.db.get('owners') || [];

        // Apply text search filtering
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            treatments = treatments.filter(t => {
                const pet = pets.find(p => p.id === t.petId) || { name: '' };
                const owner = owners.find(o => o.id === pet.ownerId) || { name: '' };
                
                return t.diagnosis.toLowerCase().includes(query) ||
                       t.symptoms.toLowerCase().includes(query) ||
                       (t.medications && t.medications.toLowerCase().includes(query)) ||
                       pet.name.toLowerCase().includes(query) ||
                       owner.name.toLowerCase().includes(query);
            });
        }

        // Sort by date descending
        treatments.sort((a, b) => b.dateTime.localeCompare(a.dateTime));

        if (treatments.length === 0) {
            logsContainer.innerHTML = '<div class="empty-state">No clinical treatment records found.</div>';
            return;
        }

        const speciesIcons = { Dog: '🐶', Cat: '🐱', Bird: '🦜', Rabbit: '🐰', Reptile: '🦎', Other: '🐾' };

        treatments.forEach(t => {
            const pet = pets.find(p => p.id === t.petId) || { name: 'Unknown Patient', species: 'Other', ownerId: '' };
            const owner = owners.find(o => o.id === pet.ownerId) || { name: 'Unknown Owner' };
            const date = new Date(t.dateTime);
            const icon = speciesIcons[pet.species] || speciesIcons.Other;

            const card = document.createElement('div');
            card.className = 'clinical-card';
            
            // Generate vaccine indicator if recorded
            const vaccineBadge = t.vaccineGiven 
                ? `<span class="badge" style="background-color: var(--color-success-soft); color: var(--color-success); font-size: 11px;">💉 ${t.vaccineGiven} Shot</span>`
                : '';

            card.innerHTML = `
                <div class="clinical-patient-info">
                    <div style="font-size: 24px; margin-bottom: 4px;">${icon}</div>
                    <span class="clinical-patient-name" onclick="window.location.hash = 'pet-details/${pet.id}'">${pet.name}</span>
                    <span class="clinical-owner-name">Owner: ${owner.name}</span>
                    <span class="clinical-date-label mt-2">${date.toLocaleString()}</span>
                </div>
                
                <div class="clinical-body">
                    <div class="clinical-diag-title">
                        ${t.diagnosis}
                    </div>
                    <p class="clinical-symptom-text"><strong>Symptoms:</strong> ${t.symptoms}</p>
                    <div class="clinical-footer mt-2" style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                        ${t.medications ? `
                            <div class="clinical-meds-block">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><path d="m10.5 20.5 10-10a4.95 4.95 0 0 0-7-7l-10 10a4.95 4.95 0 0 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
                                <span>${t.medications}</span>
                            </div>` : ''
                        }
                        ${vaccineBadge}
                    </div>
                    ${t.notes ? `<div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Notes: <em>${t.notes}</em></div>` : ''}
                </div>
                
                <div class="clinical-billing-block">
                    <span class="clinical-cost">$${Number(t.cost).toFixed(2)}</span>
                    <button class="secondary-btn btn-sm" onclick="app.ui.openTreatmentModal(${JSON.stringify(t).replace(/"/g, '&quot;')})">Edit</button>
                </div>
            `;
            logsContainer.appendChild(card);
        });
    },

    // Save a clinical treatment visit
    save: () => {
        const id = document.getElementById('treatment-id').value;
        const apptId = document.getElementById('treatment-appt-id').value;
        const petId = document.getElementById('treatment-pet').value;
        const dateTime = document.getElementById('treatment-date').value;
        const symptoms = document.getElementById('treatment-symptoms').value.trim();
        const diagnosis = document.getElementById('treatment-diagnosis').value.trim();
        const medications = document.getElementById('treatment-meds').value.trim();
        const vaccineGiven = document.getElementById('treatment-vaccine').value;
        const cost = parseFloat(document.getElementById('treatment-cost').value);
        const notes = document.getElementById('treatment-notes').value.trim();

        if (!petId || !dateTime || !symptoms || !diagnosis || isNaN(cost)) {
            alert('Please fill out all required fields.');
            return;
        }

        let treatments = app.db.get('treatments') || [];

        const treatmentRecord = {
            id: id || 't-' + Date.now(),
            appointmentId: apptId || undefined,
            petId,
            dateTime,
            symptoms,
            diagnosis,
            medications,
            vaccineGiven: vaccineGiven || undefined,
            cost,
            notes
        };

        if (id) {
            // Edit existing
            const index = treatments.findIndex(t => t.id === id);
            if (index !== -1) {
                // Keep original appointment link if any
                treatmentRecord.appointmentId = treatments[index].appointmentId;
                treatments[index] = treatmentRecord;
            }
        } else {
            // Add new
            treatments.push(treatmentRecord);
        }

        app.db.set('treatments', treatments);

        // Automation vaccine linkage: If vaccine is selected, update pet's profile vaccination status
        if (vaccineGiven) {
            let pets = app.db.get('pets') || [];
            const petIndex = pets.findIndex(p => p.id === petId);
            if (petIndex !== -1) {
                pets[petIndex].vaccination = 'Up-to-date';
                app.db.set('pets', pets);
            }
        }

        app.ui.closeAllModals();

        // Refresh views depending on where we are
        if (app.router.activeView === 'pet-details') {
            app.pets.showDetail(petId);
        } else if (app.router.activeView === 'treatments') {
            app.treatments.renderList();
        } else if (app.router.activeView === 'dashboard') {
            app.dashboard.render();
        } else if (app.router.activeView === 'appointments') {
            app.appointments.renderAgenda();
        }
    }
};

// Bind elements
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('treatment-search');
    if (searchInput) {
        searchInput.oninput = (e) => {
            app.treatments.renderList(e.target.value);
        };
    }

    const newTreatmentBtn = document.getElementById('btn-new-treatment');
    if (newTreatmentBtn) {
        newTreatmentBtn.onclick = () => {
            app.ui.openTreatmentModal();
        };
    }
});
