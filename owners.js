/**
 * VetiCare - Owner Management Component
 */

window.app = window.app || {};

app.owners = {
    // Render the main grid of owners
    renderList: (searchQuery = '') => {
        const grid = document.getElementById('owners-grid');
        if (!grid) return;
        
        let owners = app.db.get('owners') || [];
        const pets = app.db.get('pets') || [];
        const sortVal = document.getElementById('owner-sort').value;

        // Perform text search filtering
        if (searchQuery.trim() !== '') {
            owners = owners.filter(owner => 
                owner.name.toLowerCase().includes(searchQuery) ||
                owner.phone.includes(searchQuery) ||
                owner.email.toLowerCase().includes(searchQuery) ||
                (owner.address && owner.address.toLowerCase().includes(searchQuery))
            );
        }

        // Helper to count pets
        const getPetCount = (ownerid) => pets.filter(p => p.ownerid === ownerid).length;

        // Sorting
        if (sortVal === 'name-asc') {
            owners.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sortVal === 'name-desc') {
            owners.sort((a, b) => b.name.localeCompare(a.name));
        } else if (sortVal === 'pets-desc') {
            owners.sort((a, b) => getPetCount(b.id) - getPetCount(a.id));
        } else if (sortVal === 'recent') {
            owners.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        }

        grid.innerHTML = '';

        if (owners.length === 0) {
            grid.innerHTML = '<div class="col-span-2 empty-state">No pet owners found matching search criteria.</div>';
            return;
        }

        owners.forEach(owner => {
            const petCount = getPetCount(owner.id);
            const card = document.createElement('div');
            card.className = 'owner-card';
            card.onclick = () => {
                window.location.hash = `owner-details/${owner.id}`;
            };

            const initials = owner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

            card.innerHTML = `
                <div class="owner-card-header">
                    <div class="owner-avatar-circle">${initials}</div>
                    <div class="owner-title">
                        <h4>${owner.name}</h4>
                        <span>Registered ${new Date(owner.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div class="owner-card-details">
                    <div class="owner-detail-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        <span>${owner.phone}</span>
                    </div>
                    <div class="owner-detail-row">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                        <span>${owner.email}</span>
                    </div>
                </div>
                <div class="owner-card-footer">
                    <span class="pet-count-tag">${petCount} ${petCount === 1 ? 'Pet' : 'Pets'}</span>
                    <div style="display: flex; gap: 8px; align-items: center;">
                        <button class="secondary-btn btn-sm btn-danger" onclick="event.stopPropagation(); app.owners.delete('${owner.id}', '${owner.name.replace(/'/g, "\\'")}')" title="Delete Owner">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            Delete
                        </button>
                        <span class="text-btn">View Profile &rarr;</span>
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });
    },

    // Show detailed profile for a single owner
    showDetail: (ownerid) => {
        const owners = app.db.get('owners') || [];
        const owner = owners.find(o => o.id === ownerid);
        
        if (!owner) {
            alert('Owner not found!');
            window.location.hash = 'owners';
            return;
        }

        // Switch to the owner details panel
        app.router.activeView = 'owner-details';
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.classList.remove('active');
        });
        document.getElementById('view-owner-details').classList.add('active');

        // Populate basic information
        document.getElementById('od-name').textContent = owner.name;
        document.getElementById('od-phone').textContent = owner.phone;
        document.getElementById('od-email').textContent = owner.email;
        document.getElementById('od-address').textContent = owner.address || 'Not Provided';
        document.getElementById('od-emergency').textContent = owner.emergencycontact || 'Not Provided';
        document.getElementById('od-date').textContent = new Date(owner.created_at).toLocaleDateString();
        
        const initials = owner.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
        document.getElementById('od-avatar').textContent = initials;

        // Render associated pets
        const pets = app.db.get('pets') || [];
        const ownerPets = pets.filter(p => p.ownerid === ownerid);
        const petsListContainer = document.getElementById('od-pets-list');
        petsListContainer.innerHTML = '';

        if (ownerPets.length === 0) {
            petsListContainer.innerHTML = '<div class="empty-state">No registered pets for this owner.</div>';
        } else {
            const speciesIcons = { Dog: '🐶', Dogs: '🐶', Cat: '🐱', Cats: '🐱', Bird: '🦜', Birds: '🦜', Rabbit: '🐰', Rabbits: '🐰', Reptile: '🦎', Reptiles: '🦎', Horse: '🐴', Horses: '🐴', Goat: '🐐', Goats: '🐐', Sheep: '🐑', Buffalo: '🦬', Buffaloes: '🦬', Buffalos: '🦬', Cattle: '🐄', Cattles: '🐄', Cow: '🐄', Cows: '🐄', Other: '🐾' };
            
            ownerPets.forEach(pet => {
                const item = document.createElement('div');
                item.className = 'owner-pet-item';
                item.onclick = () => window.location.hash = `pet-details/${pet.id}`;
                
                const icon = speciesIcons[pet.species] || speciesIcons.Other;
                
                item.innerHTML = `
                    <div class="owner-pet-icon">${icon}</div>
                    <div class="owner-pet-meta" style="flex-grow: 1;">
                        <h5>${pet.name}</h5>
                        <p>${pet.breed} • ${pet.weight} kg</p>
                    </div>
                    <button class="icon-btn-danger" onclick="event.stopPropagation(); app.pets.delete('${pet.id}', '${pet.name.replace(/'/g, "\\'")}', '${owner.id}')" title="Delete Pet">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>
                `;
                petsListContainer.appendChild(item);
            });
        }

        // Hook up detail page actions
        document.getElementById('owner-detail-back').onclick = () => {
            window.location.hash = 'owners';
        };

        const deleteOwnerBtn = document.getElementById('btn-delete-owner');
        if (deleteOwnerBtn) {
            deleteOwnerBtn.onclick = () => {
                app.owners.delete(owner.id, owner.name);
            };
        }

        document.getElementById('btn-edit-owner').onclick = () => {
            app.ui.openOwnerModal(owner);
        };

        document.getElementById('btn-add-pet-to-owner').onclick = () => {
            app.ui.openPetModal(null, owner.id);
        };
    },

    // Delete owner and cascade to all associated records
    delete: async (ownerId, ownerName = 'this owner') => {
        const confirmMsg = `Are you sure you want to delete ${ownerName}?\n\nWARNING: Deleting this owner will also permanently delete all associated pets, appointments, clinical treatments, and invoices!`;
        if (!confirm(confirmMsg)) return;

        try {
            const res = await fetch(`${app.db.apiURL}/owners/${ownerId}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to delete owner');
            }

            await app.db.loadState();

            if (app.router.activeView === 'owner-details') {
                window.location.hash = 'owners';
            } else {
                app.owners.renderList();
            }
        } catch (err) {
            console.error('Error deleting owner:', err);
            alert('Could not delete owner: ' + err.message);
        }
    },

    // Save a new or edited owner
    save: async () => {
        const id = document.getElementById('owner-id').value;
        const name = document.getElementById('owner-name').value.trim();
        const phone = document.getElementById('owner-phone').value.trim();
        const email = document.getElementById('owner-email').value.trim();
        const address = document.getElementById('owner-address').value.trim();
        const emergencycontact = document.getElementById('owner-emergency').value.trim();

        if (!name || !phone || !email) {
            alert('Please fill out all required fields.');
            return;
        }

        const payload = {
            id: id || undefined,
            name,
            phone,
            email,
            address,
            emergencycontact
        };

        try {
            const res = await fetch(`${app.db.apiURL}/owners`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            // Reload DBMS State
            await app.db.loadState();
            
            app.ui.closeAllModals();

            // Refresh view
            const activeId = id || data.id;
            if (app.router.activeView === 'owner-details') {
                app.owners.showDetail(activeId);
            } else {
                app.owners.renderList();
            }
        } catch (err) {
            console.error('Error saving owner to SQLite:', err);
            alert('Could not save owner details.');
        }
    }
};

// Bind events specific to owner listings
document.addEventListener('DOMContentLoaded', () => {
    const ownerSort = document.getElementById('owner-sort');
    if (ownerSort) {
        ownerSort.onchange = () => app.owners.renderList();
    }
});
