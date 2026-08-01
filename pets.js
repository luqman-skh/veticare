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
                pets = pets.filter(pet => !['Dog', 'Cat', 'Bird'].includes(pet.species));
            } else {
                pets = pets.filter(pet => pet.species === activeFilter);
            }
        }

        // Apply text search filtering
        if (searchQuery.trim() !== '') {
            pets = pets.filter(pet => {
                const owner = owners.find(o => o.id === pet.ownerId) || { name: '' };
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

        const speciesIcons = { Dog: '🐶', Cat: '🐱', Bird: '🦜', Rabbit: '🐰', Reptile: '🦎', Other: '🐾' };

        pets.forEach(pet => {
            const card = document.createElement('div');
            card.className = 'pet-card';
            card.onclick = () => window.location.hash = `pet-details/${pet.id}`;

            const owner = owners.find(o => o.id === pet.ownerId) || { name: 'Unknown Owner' };
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
                    <span class="text-btn">Details &rarr;</span>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    // Show detailed profile for a single pet
    showDetail: (petId) => {
        const pets = app.db.get('pets') || [];
        const pet = pets.find(p => p.id === petId);
        
        if (!pet) {
            alert('Pet profile not found!');
            window.location.hash = 'pets';
            return;
        }

        const owners = app.db.get('owners') || [];
        const owner = owners.find(o => o.id === pet.ownerId) || { name: 'Unknown Owner', id: '' };

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

        const speciesIcons = { Dog: '🐶', Cat: '🐱', Bird: '🦜', Rabbit: '🐰', Reptile: '🦎', Other: '🐾' };
        document.getElementById('pd-avatar').textContent = speciesIcons[pet.species] || speciesIcons.Other;

        // Render treatment records
        const treatments = app.db.get('treatments') || [];
        const petTreatments = treatments.filter(t => t.petId === petId);
        const treatmentContainer = document.getElementById('pd-treatments');
        treatmentContainer.innerHTML = '';

        if (petTreatments.length === 0) {
            treatmentContainer.innerHTML = '<div class="empty-state">No treatment records found for this patient.</div>';
        } else {
            // Sort by date descending
            petTreatments.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
            petTreatments.forEach(t => {
                const card = document.createElement('div');
                card.className = 'treatment-history-card';
                card.innerHTML = `
                    <div class="treatment-header">
                        <span class="treatment-diag">${t.diagnosis}</span>
                        <span class="treatment-date">${new Date(t.dateTime).toLocaleDateString()}</span>
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
                        ${new Date(vt.dateTime).toLocaleDateString()}
                    </span>
                `;
                vaccContainer.appendChild(row);
            });
        }

        // Hook up detail page actions
        document.getElementById('pet-detail-back').onclick = () => window.location.hash = 'pets';
        document.getElementById('btn-edit-pet').onclick = () => app.ui.openPetModal(pet);
        
        // Modal hooks for upcoming modules (Phase 2 hooks will log/alert for now or show appropriate message)
        document.getElementById('btn-add-appointment').onclick = () => {
            alert('Appointment Scheduling module will be fully implemented in Phase 2.');
        };
        document.getElementById('btn-add-treatment').onclick = () => {
            alert('Treatment log entry module will be fully implemented in Phase 2.');
        };
    },

    // Save a new or edited pet
    save: () => {
        const id = document.getElementById('pet-id').value;
        const name = document.getElementById('pet-name').value.trim();
        const ownerId = document.getElementById('pet-owner').value;
        const species = document.getElementById('pet-species').value;
        const breed = document.getElementById('pet-breed').value.trim();
        const dob = document.getElementById('pet-dob').value;
        const weight = parseFloat(document.getElementById('pet-weight').value);
        const vaccination = document.getElementById('pet-vaccination').value;
        const notes = document.getElementById('pet-notes').value.trim();

        if (!name || !ownerId || !breed || !dob || isNaN(weight)) {
            alert('Please fill out all required fields.');
            return;
        }

        let pets = app.db.get('pets') || [];

        if (id) {
            // Edit existing pet
            const index = pets.findIndex(p => p.id === id);
            if (index !== -1) {
                pets[index] = {
                    ...pets[index],
                    name,
                    ownerId,
                    species,
                    breed,
                    dob,
                    weight,
                    vaccination,
                    notes
                };
            }
        } else {
            // Create new pet
            const newPet = {
                id: 'p-' + Date.now(),
                ownerId,
                name,
                species,
                breed,
                dob,
                weight,
                vaccination,
                notes
            };
            pets.push(newPet);
        }

        app.db.set('pets', pets);
        app.ui.closeAllModals();

        // Refresh views
        if (app.router.activeView === 'pet-details') {
            app.pets.showDetail(id);
        } else if (app.router.activeView === 'owner-details') {
            app.owners.showDetail(ownerId);
        } else {
            app.pets.renderList();
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
