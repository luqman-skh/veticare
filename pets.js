/**
 * VetiCare - Pet Management Component
 */

window.app = window.app || {};

app.pets = {
    activeSpeciesFilter: 'all',

    // Helper to calculate pet age in years & months
    calculateAge: (dobString) => {
        if (!dobString) return 'Unknown Age';
        const birthDate = new Date(dobString);
        const today = new Date();
        
        let years = today.getFullYear() - birthDate.getFullYear();
        let months = today.getMonth() - birthDate.getMonth();
        
        if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
            years--;
            months += 12;
        }
        
        if (years === 0) {
            return `${months} ${months === 1 ? 'm' : 'm'} old`;
        }
        
        return `${years} ${years === 1 ? 'yr' : 'yrs'}${months > 0 ? ` ${months}m` : ''}`;
    },

    // Render the grid of pet profile cards
    renderList: (searchQuery = '') => {
        const grid = document.getElementById('pets-grid');
        if (!grid) return;

        let pets = app.db.get('pets') || [];
        const owners = app.db.get('owners') || [];
        const sortVal = document.getElementById('pet-sort').value;
        const activeFilter = app.pets.activeSpeciesFilter;

        // Apply species filtering pills
        if (activeFilter !== 'all') {
            if (activeFilter === 'Other') {
                const knownSpecies = ['dog', 'cat', 'bird', 'rabbit', 'reptile', 'horse', 'horses', 'goat', 'goats', 'sheep', 'buffalo', 'buffaloes', 'buffalos', 'cattle', 'cattles', 'cow', 'cows'];
                pets = pets.filter(pet => !knownSpecies.includes((pet.species || '').toLowerCase().trim()));
            } else {
                const target = activeFilter.toLowerCase().trim();
                pets = pets.filter(pet => {
                    const sp = (pet.species || '').toLowerCase().trim();
                    return sp === target ||
                           sp === target + 's' ||
                           sp + 's' === target ||
                           (target === 'cattle' && (sp === 'cattles' || sp === 'cow' || sp === 'cows')) ||
                           (target === 'cattles' && (sp === 'cattle' || sp === 'cow' || sp === 'cows')) ||
                           (target === 'buffalo' && (sp === 'buffaloes' || sp === 'buffalos'));
                });
            }
        }

        // Apply text search filtering
        if (searchQuery.trim() !== '') {
            pets = pets.filter(pet => {
                const owner = owners.find(o => o.id === pet.ownerid) || { name: '' };
                return pet.name.toLowerCase().includes(searchQuery) ||
                       pet.breed.toLowerCase().includes(searchQuery) ||
                       pet.species.toLowerCase().includes(searchQuery) ||
                       owner.name.toLowerCase().includes(searchQuery);
            });
        }

        // Sorting logic
        if (sortVal === 'name-asc') {
            pets.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortVal === 'age-desc') {
            pets.sort((a, b) => new Date(a.dob) - new Date(b.dob)); // older date means older age
        } else if (sortVal === 'age-asc') {
            pets.sort((a, b) => new Date(b.dob) - new Date(a.dob));
        } else if (sortVal === 'weight-desc') {
            pets.sort((a, b) => b.weight - a.weight);
        }

        grid.innerHTML = '';

        if (pets.length === 0) {
            grid.innerHTML = '<div class="col-span-2 empty-state">No patients found matching search criteria.</div>';
            return;
        }

        const speciesIcons = { Dog: '🐶', Dogs: '🐶', Cat: '🐱', Cats: '🐱', Bird: '🦜', Birds: '🦜', Rabbit: '🐰', Rabbits: '🐰', Reptile: '🦎', Reptiles: '🦎', Horse: '🐴', Horses: '🐴', Goat: '🐐', Goats: '🐐', Sheep: '🐑', Buffalo: '🦬', Buffaloes: '🦬', Buffalos: '🦬', Cattle: '🐄', Cattles: '🐄', Cow: '🐄', Cows: '🐄', Other: '🐾' };

        pets.forEach(pet => {
            const card = document.createElement('div');
            card.className = 'pet-card';
            card.onclick = () => window.location.hash = `pet-details/${pet.id}`;

            const owner = owners.find(o => o.id === pet.ownerid) || { name: 'Unknown Owner' };
            const ageStr = app.pets.calculateAge(pet.dob);
            const icon = speciesIcons[pet.species] || speciesIcons.Other;
            
            // Vaccination status indicators
            let dotColor = 'dot-green';
            if (pet.vaccination === 'Partially Vaccinated') dotColor = 'dot-amber';
            if (pet.vaccination === 'Not Vaccinated') dotColor = 'dot-red';
            if (pet.vaccination === 'Unknown') dotColor = 'dot-amber';

            card.innerHTML = `
                <div class="pet-species-badge">${pet.species}</div>
                <div class="pet-card-avatar">${icon}</div>
                <h4>${pet.name}</h4>
                
                <div class="pet-card-info">
                    <div class="pet-info-row">
                        <span>Breed:</span>
                        <span class="pet-info-value">${pet.breed}</span>
                    </div>
                    <div class="pet-info-row">
                        <span>Age / Weight:</span>
                        <span class="pet-info-value">${ageStr} • ${pet.weight} kg</span>
                    </div>
                    <div class="pet-info-row">
                        <span>Owner:</span>
                        <span class="pet-info-value" style="color: var(--color-primary); font-weight: 700;">${owner.name}</span>
                    </div>
                </div>
                
                <div class="pet-card-footer">
                    <span class="vaccination-indicator">
                        <span class="indicator-dot ${dotColor}"></span>
                        ${pet.vaccination}
                    </span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="secondary-btn btn-sm btn-danger" onclick="event.stopPropagation(); app.pets.delete('${pet.id}', '${pet.name.replace(/'/g, "\\'")}')" title="Delete Patient">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            Delete
                        </button>
                        <span class="text-btn">Details &rarr;</span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    // Show detailed profile for a single pet
    showDetail: (petid) => {
        const pets = app.db.get('pets') || [];
        const pet = pets.find(p => p.id === petid);
        
        if (!pet) {
            alert('Pet profile not found!');
            window.location.hash = 'pets';
            return;
        }

        const owners = app.db.get('owners') || [];
        const owner = owners.find(o => o.id === pet.ownerid) || { name: 'Unknown Owner', id: '' };

        // Switch panel visibility
        app.router.activeView = 'pet-details';
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById('view-pet-details').classList.add('active');

        // Populate basic information
        document.getElementById('pd-name').textContent = pet.name;
        document.getElementById('pd-species-breed').textContent = `${pet.species} / ${pet.breed}`;
        document.getElementById('pd-age').textContent = `${app.pets.calculateAge(pet.dob)} (${new Date(pet.dob).toLocaleDateString()})`;
        document.getElementById('pd-weight').textContent = `${pet.weight} kg`;
        
        const ownerLink = document.getElementById('pd-owner');
        ownerLink.textContent = owner.name;
        ownerLink.onclick = (e) => {
            e.preventDefault();
            if (owner.id) window.location.hash = `owner-details/${owner.id}`;
        };

        // Vaccination badge color styling
        const vaccBadge = document.getElementById('pd-vaccination');
        vaccBadge.textContent = pet.vaccination;
        vaccBadge.className = 'badge'; // reset
        if (pet.vaccination === 'Up-to-date') vaccBadge.style.backgroundColor = 'var(--color-success-soft)', vaccBadge.style.color = 'var(--color-success)';
        else if (pet.vaccination === 'Not Vaccinated') vaccBadge.style.backgroundColor = 'var(--color-danger-soft)', vaccBadge.style.color = 'var(--color-danger)';
        else vaccBadge.style.backgroundColor = 'var(--color-accent-soft)', vaccBadge.style.color = 'var(--color-accent)';

        const speciesIcons = { Dog: '🐶', Dogs: '🐶', Cat: '🐱', Cats: '🐱', Bird: '🦜', Birds: '🦜', Rabbit: '🐰', Rabbits: '🐰', Reptile: '🦎', Reptiles: '🦎', Horse: '🐴', Horses: '🐴', Goat: '🐐', Goats: '🐐', Sheep: '🐑', Buffalo: '🦬', Buffaloes: '🦬', Buffalos: '🦬', Cattle: '🐄', Cattles: '🐄', Cow: '🐄', Cows: '🐄', Other: '🐾' };
        document.getElementById('pd-avatar').textContent = speciesIcons[pet.species] || speciesIcons.Other;

        // Render treatment records
        const treatments = app.db.get('treatments') || [];
        const petTreatments = treatments.filter(t => t.petid === petid);
        const treatmentContainer = document.getElementById('pd-treatments');
        treatmentContainer.innerHTML = '';

        if (petTreatments.length === 0) {
            treatmentContainer.innerHTML = '<div class="empty-state">No treatment records found for this patient.</div>';
        } else {
            // Sort by date descending
            petTreatments.sort((a, b) => b.date_time.localeCompare(a.date_time));
            petTreatments.forEach(t => {
                const card = document.createElement('div');
                card.className = 'treatment-history-card';
                card.innerHTML = `
                    <div class="treatment-header">
                        <span class="treatment-diag">${t.diagnosis}</span>
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="treatment-date">${new Date(t.date_time).toLocaleDateString()}</span>
                            <button class="icon-btn-danger" style="width: 24px; height: 24px;" onclick="app.treatments.delete('${t.id}', '${pet.id}')" title="Delete Treatment">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="treatment-details">
                        <p><strong>Symptoms:</strong> ${t.symptoms}</p>
                        <p><strong>Prescription:</strong> ${t.medications}</p>
                        ${t.notes ? `<p><strong>Notes:</strong> ${t.notes}</p>` : ''}
                        <span class="treatment-cost-badge">Cost: $${Number(t.cost).toFixed(2)}</span>
                    </div>
                `;
                treatmentContainer.appendChild(card);
            });
        }

        // Render vaccination histories from treatments (where diagnosis was "Vaccine" or similar) OR from custom tracker
        // Since it's Phase 1, we can query mock vaccine lines
        const vaccContainer = document.getElementById('pd-vaccinations');
        vaccContainer.innerHTML = '';
        
        const vaccineTreatments = petTreatments.filter(t => 
            t.diagnosis.toLowerCase().includes('vacc') || 
            t.medications.toLowerCase().includes('vacc') ||
            t.diagnosis.toLowerCase().includes('shot')
        );

        if (vaccineTreatments.length === 0) {
            if (pet.vaccination === 'Up-to-date') {
                vaccContainer.innerHTML = `
                    <div class="vaccination-row">
                        <div class="vacc-info">
                            <h5>Core Vaccination Cycle (Initial)</h5>
                            <p>Administered before registration</p>
                        </div>
                        <span class="badge" style="background-color: var(--color-success-soft); color: var(--color-success)">Active</span>
                    </div>
                `;
            } else {
                vaccContainer.innerHTML = '<div class="empty-state">No vaccination administration records found.</div>';
            }
        } else {
            vaccineTreatments.forEach(vt => {
                const row = document.createElement('div');
                row.className = 'vaccination-row';
                row.innerHTML = `
                    <div class="vacc-info">
                        <h5>${vt.diagnosis}</h5>
                        <p>Prescribed: ${vt.medications}</p>
                    </div>
                    <span class="badge" style="background-color: var(--color-success-soft); color: var(--color-success)">
                        ${new Date(vt.date_time).toLocaleDateString()}
                    </span>
                `;
                vaccContainer.appendChild(row);
            });
        }

        // Hook up detail page actions
        document.getElementById('pet-detail-back').onclick = () => window.location.hash = 'pets';
        
        const deletePetBtn = document.getElementById('btn-delete-pet');
        if (deletePetBtn) {
            deletePetBtn.onclick = () => {
                app.pets.delete(pet.id, pet.name, owner.id);
            };
        }

        document.getElementById('btn-edit-pet').onclick = () => app.ui.openPetModal(pet);
        
        document.getElementById('btn-add-appointment').onclick = () => {
            app.ui.openAppointmentModal(null, null);
            document.getElementById('appt-pet').value = pet.id;
        };
        document.getElementById('btn-add-treatment').onclick = () => {
            app.ui.openTreatmentModal(null, pet.id);
        };
    },

    // Delete pet and all related appointments, treatments, invoices
    delete: async (petId, petName = 'this patient', redirectOwnerId = null) => {
        const confirmMsg = `Are you sure you want to delete ${petName}?\n\nWARNING: Deleting this patient will also permanently delete all their appointments, medical treatments, and billing records!`;
        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch(`${app.db.apiURL}/pets/${petId}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to delete pet');
            }

            await app.db.loadState();

            if (app.router.activeView === 'pet-details') {
                window.location.hash = redirectOwnerId ? `owner-details/${redirectOwnerId}` : 'pets';
            } else if (app.router.activeView === 'owner-details' && redirectOwnerId) {
                app.owners.showDetail(redirectOwnerId);
            } else {
                app.pets.renderList();
            }
        } catch (err) {
            console.error('Error deleting pet:', err);
            alert('Could not delete patient: ' + err.message);
        }
    },

    // Save a new or edited pet
    save: async () => {
        const id = document.getElementById('pet-id').value;
        const name = document.getElementById('pet-name').value.trim();
        const ownerid = document.getElementById('pet-owner').value;
        const species = document.getElementById('pet-species').value;
        const breed = document.getElementById('pet-breed').value.trim();
        const dob = document.getElementById('pet-dob').value;
        const weight = parseFloat(document.getElementById('pet-weight').value);
        const vaccination = document.getElementById('pet-vaccination').value;
        const notes = document.getElementById('pet-notes').value.trim();

        if (!name || !ownerid || !breed || !dob || isNaN(weight)) {
            alert('Please fill out all required fields.');
            return;
        }

        const payload = {
            id: id || undefined,
            ownerid,
            name,
            species,
            breed,
            dob,
            weight,
            vaccination,
            notes
        };

        try {
            const res = await fetch(`${app.db.apiURL}/pets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            // Reload DBMS State
            await app.db.loadState();
            
            app.ui.closeAllModals();

            // Refresh views
            const activeId = id || data.id;
            if (app.router.activeView === 'pet-details') {
                app.pets.showDetail(activeId);
            } else if (app.router.activeView === 'owner-details') {
                app.owners.showDetail(ownerid);
            } else {
                app.pets.renderList();
            }
        } catch (err) {
            console.error('Error saving pet to SQLite:', err);
            alert('Could not save pet details.');
        }
    }
};

// Bind UI filter actions on page load
document.addEventListener('DOMContentLoaded', () => {
    // Setup filter pills
    document.querySelectorAll('.filter-pill').forEach(pill => {
        pill.onclick = (e) => {
            document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            app.pets.activeSpeciesFilter = pill.getAttribute('data-species');
            app.pets.renderList();
        };
    });

    const petSort = document.getElementById('pet-sort');
    if (petSort) {
        petSort.onchange = () => app.pets.renderList();
    }

    // Detail medical records tab switching
    document.querySelectorAll('.tabs-header .tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tabs-header .tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(`tab-${targetTab}`).classList.add('active');
        };
    });
});
