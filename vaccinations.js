/**
 * VetiCare - Vaccination & Deworming Management Component
 */

window.app = window.app || {};

app.vaccinations = {
    activeTypeFilter: 'all',
    activeStatusFilter: 'all',
    activeLabelFilter: 'all',
    activeFrequencyFilter: 'all',

    // Helper to calculate next date from an interval
    calculateNextDate: (baseDateStr, frequency, customDays = null) => {
        const base = baseDateStr ? new Date(baseDateStr) : new Date();
        const next = new Date(base.getTime());

        if (frequency === 'Daily') {
            next.setDate(next.getDate() + 1);
        } else if (frequency === 'Weekly') {
            next.setDate(next.getDate() + 7);
        } else if (frequency === 'Monthly') {
            next.setMonth(next.getMonth() + 1);
        } else if (frequency === 'Annual') {
            next.setFullYear(next.getFullYear() + 1);
        } else if (frequency === 'Custom' && customDays) {
            next.setDate(next.getDate() + parseInt(customDays, 10));
        } else {
            next.setFullYear(next.getFullYear() + 1);
        }

        return next.toISOString().split('T')[0];
    },

    // Helper to determine the next label in sequence
    calculateNextLabel: (currentLabel) => {
        if (currentLabel === 'Primary') return 'Secondary';
        if (currentLabel === 'Secondary') return 'Booster';
        if (currentLabel === 'Booster') return 'Annual';
        return 'Annual';
    },

    // Render list of vaccination & deworming schedules
    renderList: (searchQuery = '') => {
        const tbody = document.getElementById('vaccinations-list');
        if (!tbody) return;

        tbody.innerHTML = '';

        const vaccinations = app.db.get('vaccinations') || [];
        const pets = app.db.get('pets') || [];
        const owners = app.db.get('owners') || [];
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Compute summary stats
        let upcomingCount = 0;
        let completedCount = 0;
        let overdueCount = 0;
        let dewormingCount = 0;

        vaccinations.forEach(v => {
            const isDeworming = v.type === 'Deworming';
            if (isDeworming) dewormingCount++;

            if (v.status === 'Administered') {
                completedCount++;
            } else {
                if (v.due_date < todayStr) {
                    overdueCount++;
                } else {
                    upcomingCount++;
                }
            }
        });

        const statUpcoming = document.getElementById('stat-vac-upcoming');
        if (statUpcoming) statUpcoming.textContent = upcomingCount;
        const statCompleted = document.getElementById('stat-vac-completed');
        if (statCompleted) statCompleted.textContent = completedCount;
        const statOverdue = document.getElementById('stat-vac-overdue');
        if (statOverdue) statOverdue.textContent = overdueCount;
        const statDeworming = document.getElementById('stat-vac-deworming');
        if (statDeworming) statDeworming.textContent = dewormingCount;

        // 2. Apply filtering
        let filtered = [...vaccinations];

        const typeFilter = app.vaccinations.activeTypeFilter;
        if (typeFilter !== 'all') {
            filtered = filtered.filter(v => v.type === typeFilter);
        }

        const statusFilter = app.vaccinations.activeStatusFilter;
        if (statusFilter !== 'all') {
            if (statusFilter === 'Overdue') {
                filtered = filtered.filter(v => v.status !== 'Administered' && v.due_date < todayStr);
            } else if (statusFilter === 'Scheduled') {
                filtered = filtered.filter(v => v.status === 'Scheduled' && v.due_date >= todayStr);
            } else {
                filtered = filtered.filter(v => v.status === statusFilter);
            }
        }

        const labelFilter = app.vaccinations.activeLabelFilter;
        if (labelFilter !== 'all') {
            filtered = filtered.filter(v => v.label === labelFilter);
        }

        const freqFilter = app.vaccinations.activeFrequencyFilter;
        if (freqFilter !== 'all') {
            filtered = filtered.filter(v => v.frequency === freqFilter);
        }

        // Apply text search
        const query = (searchQuery || document.getElementById('vaccination-search')?.value || '').trim().toLowerCase();
        if (query) {
            filtered = filtered.filter(v => {
                const pet = pets.find(p => p.id === v.petid) || { name: '', breed: '', species: '' };
                const owner = owners.find(o => o.id === pet.ownerid) || { name: '' };
                return (v.name || '').toLowerCase().includes(query) ||
                       (v.type || '').toLowerCase().includes(query) ||
                       (v.label || '').toLowerCase().includes(query) ||
                       (v.frequency || '').toLowerCase().includes(query) ||
                       (v.batch_number || '').toLowerCase().includes(query) ||
                       (v.notes || '').toLowerCase().includes(query) ||
                       pet.name.toLowerCase().includes(query) ||
                       pet.species.toLowerCase().includes(query) ||
                       owner.name.toLowerCase().includes(query);
            });
        }

        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="padding: 32px; text-align: center; color: var(--text-muted);">No vaccination or deworming records matching criteria. Click <strong>Schedule Dose</strong> to add one.</td></tr>';
            return;
        }

        // Sort: Overdue first, then upcoming by due_date ascending, then administered descending
        filtered.sort((a, b) => {
            const aOverdue = a.status !== 'Administered' && a.due_date < todayStr;
            const bOverdue = b.status !== 'Administered' && b.due_date < todayStr;
            if (aOverdue && !bOverdue) return -1;
            if (!aOverdue && bOverdue) return 1;
            if (a.status === 'Scheduled' && b.status === 'Administered') return -1;
            if (a.status === 'Administered' && b.status === 'Scheduled') return 1;
            return a.due_date.localeCompare(b.due_date);
        });

        const speciesIcons = { Dog: '🐶', Dogs: '🐶', Cat: '🐱', Cats: '🐱', Bird: '🦜', Birds: '🦜', Rabbit: '🐰', Rabbits: '🐰', Reptile: '🦎', Reptiles: '🦎', Horse: '🐴', Horses: '🐴', Goat: '🐐', Goats: '🐐', Sheep: '🐑', Buffalo: '🦬', Buffaloes: '🦬', Buffalos: '🦬', Cattle: '🐄', Cattles: '🐄', Cow: '🐄', Cows: '🐄', Other: '🐾' };

        filtered.forEach(item => {
            const pet = pets.find(p => p.id === item.petid) || { name: 'Unknown Pet', species: 'Pet', ownerid: '' };
            const owner = owners.find(o => o.id === pet.ownerid) || { name: 'Unknown Owner' };
            const icon = speciesIcons[pet.species] || speciesIcons.Other;

            const isOverdue = item.status !== 'Administered' && item.due_date < todayStr;
            const isDueToday = item.status !== 'Administered' && item.due_date === todayStr;

            let statusBadge = '';
            if (item.status === 'Administered') {
                statusBadge = `<span class="status-badge completed" style="display:inline-flex; align-items:center; gap:4px;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:11px; height:11px;"><polyline points="20 6 9 17 4 12"/></svg>
                    Administered
                </span>`;
            } else if (isOverdue) {
                statusBadge = `<span class="status-badge cancelled" style="display:inline-flex; align-items:center; gap:4px; font-weight:800;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:11px; height:11px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Overdue
                </span>`;
            } else if (isDueToday) {
                statusBadge = `<span class="status-badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; font-weight:700;">Due Today</span>`;
            } else {
                statusBadge = `<span class="status-badge scheduled">Scheduled</span>`;
            }

            const typeIcon = item.type === 'Deworming' ? '💊' : '💉';
            const typeColor = item.type === 'Deworming' ? 'background: rgba(245, 158, 11, 0.15); color: #d97706;' : 'background: rgba(16, 185, 129, 0.15); color: #059669;';

            const labelClass = (item.label || 'Primary').toLowerCase();
            const freqDisplay = item.frequency === 'Custom'
                ? `Custom (${item.custom_interval_days || '?'} days)`
                : item.frequency;

            const row = document.createElement('tr');
            row.className = 'table-row-hover';
            row.style.borderBottom = '1px solid var(--border-color)';

            row.innerHTML = `
                <td style="padding: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 22px;">${icon}</span>
                        <div>
                            <div style="font-weight: 700; color: var(--text-main); cursor: pointer;" onclick="window.location.hash='pet-details/${pet.id}'">
                                ${pet.name} <span class="badge" style="font-size: 10px; padding: 2px 6px;">${pet.species}</span>
                            </div>
                            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Owner: ${owner.name}</div>
                        </div>
                    </div>
                </td>
                <td style="padding: 16px;">
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span class="badge" style="${typeColor} font-size: 11px; font-weight: 700; padding: 2px 8px;">
                            ${typeIcon} ${item.type}
                        </span>
                    </div>
                    <div style="font-weight: 700; color: var(--text-main); font-size: 14px;">${item.name}</div>
                    ${item.batch_number ? `<div style="font-size: 11px; color: var(--text-muted);">Batch: ${item.batch_number}</div>` : ''}
                </td>
                <td style="padding: 16px;">
                    <span class="badge vac-label-badge ${labelClass}">${item.label}</span>
                </td>
                <td style="padding: 16px;">
                    <span class="badge frequency-badge">${freqDisplay}</span>
                </td>
                <td style="padding: 16px;">
                    <div style="font-weight: 700; color: ${isOverdue ? 'var(--color-danger)' : 'var(--text-main)'};">
                        ${new Date(item.due_date + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    ${item.administered_date ? `
                        <div style="font-size: 11px; color: var(--color-success); margin-top: 2px;">
                            Given: ${new Date(item.administered_date + 'T00:00:00').toLocaleDateString()}
                        </div>
                    ` : ''}
                </td>
                <td style="padding: 16px;">
                    ${statusBadge}
                </td>
                <td style="padding: 16px; text-align: right;">
                    <div style="display: flex; gap: 6px; justify-content: flex-end; align-items: center; flex-wrap: wrap;">
                        ${item.status !== 'Administered' ? `
                            <button class="primary-btn btn-sm" onclick="app.vaccinations.markAdministered('${item.id}')" title="Mark this dose as administered">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="btn-icon"><polyline points="20 6 9 17 4 12"/></svg>
                                Administer
                            </button>
                        ` : `
                            <button class="secondary-btn btn-sm btn-followup" onclick="app.vaccinations.scheduleNextDose('${item.id}')" title="Schedule next cycle dose">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                                Next Dose
                            </button>
                        `}
                        <button class="secondary-btn btn-sm" onclick="app.vaccinations.openModal(${JSON.stringify(item).replace(/"/g, '&quot;')})" title="Edit details">
                            Edit
                        </button>
                        <button class="secondary-btn btn-sm btn-danger" onclick="app.vaccinations.delete('${item.id}')" title="Delete record">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </td>
            `;

            tbody.appendChild(row);
        });
    },

    // Open modal to schedule or edit a vaccination/deworming
    openModal: (recordData = null, preselectedPetId = null) => {
        app.ui.closeAllModals();

        const modal = document.getElementById('vaccination-modal');
        const title = document.getElementById('vac-modal-title');
        const petSelect = document.getElementById('vac-pet');
        const pets = app.db.get('pets') || [];
        const owners = app.db.get('owners') || [];

        // Populate pets dropdown
        petSelect.innerHTML = '<option value="" disabled selected>Select Pet / Patient...</option>';
        pets.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => {
            const o = owners.find(owner => owner.id === p.ownerid) || { name: 'Unknown Owner' };
            petSelect.innerHTML += `<option value="${p.id}">${p.name} (${p.species}) — Owner: ${o.name}</option>`;
        });

        const customGroup = document.getElementById('vac-custom-group');
        const adminDateGroup = document.getElementById('vac-admin-date-group');

        if (recordData) {
            title.textContent = recordData._isNextDose ? 'Schedule Next Cycle Dose' : 'Edit Vaccination / Deworming Dose';
            document.getElementById('vac-id').value = recordData._isNextDose ? '' : (recordData.id || '');
            document.getElementById('vac-type').value = recordData.type || 'Vaccination';
            petSelect.value = recordData.petid || '';
            document.getElementById('vac-name').value = recordData.name || '';
            document.getElementById('vac-label').value = recordData.label || 'Primary';
            document.getElementById('vac-frequency').value = recordData.frequency || 'Annual';
            document.getElementById('vac-custom-days').value = recordData.custom_interval_days || '';
            document.getElementById('vac-due-date').value = recordData.due_date || '';
            document.getElementById('vac-status').value = recordData._isNextDose ? 'Scheduled' : (recordData.status || 'Scheduled');
            document.getElementById('vac-administered-date').value = recordData._isNextDose ? '' : (recordData.administered_date || '');
            document.getElementById('vac-vet').value = recordData.vetname || '';
            document.getElementById('vac-batch').value = recordData.batch_number || '';
            document.getElementById('vac-notes').value = recordData.notes || '';
        } else {
            title.textContent = 'Schedule Vaccination / Deworming Dose';
            document.getElementById('vac-id').value = '';
            document.getElementById('vac-type').value = 'Vaccination';
            if (preselectedPetId) petSelect.value = preselectedPetId;
            document.getElementById('vac-name').value = '';
            document.getElementById('vac-label').value = 'Primary';
            document.getElementById('vac-frequency').value = 'Annual';
            document.getElementById('vac-custom-days').value = '';
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('vac-due-date').value = today;
            document.getElementById('vac-status').value = 'Scheduled';
            document.getElementById('vac-administered-date').value = '';
            document.getElementById('vac-vet').value = 'Dr. A. R. Shaikh';
            document.getElementById('vac-batch').value = '';
            document.getElementById('vac-notes').value = '';
        }

        // Toggle custom frequency and administration date fields
        const currentFreq = document.getElementById('vac-frequency').value;
        if (customGroup) customGroup.style.display = currentFreq === 'Custom' ? 'flex' : 'none';

        const currentStatus = document.getElementById('vac-status').value;
        if (adminDateGroup) adminDateGroup.style.display = currentStatus === 'Administered' ? 'flex' : 'none';

        modal.classList.add('active');
    },

    // Save scheduled or edited record
    save: async () => {
        const id = document.getElementById('vac-id').value;
        const petid = document.getElementById('vac-pet').value;
        const type = document.getElementById('vac-type').value;
        const name = document.getElementById('vac-name').value.trim();
        const label = document.getElementById('vac-label').value;
        const frequency = document.getElementById('vac-frequency').value;
        const customDaysVal = document.getElementById('vac-custom-days').value;
        const due_date = document.getElementById('vac-due-date').value;
        const status = document.getElementById('vac-status').value;
        const administered_date = document.getElementById('vac-administered-date').value;
        const vetname = document.getElementById('vac-vet').value;
        const batch_number = document.getElementById('vac-batch').value.trim();
        const notes = document.getElementById('vac-notes').value.trim();

        if (!petid || !name || !due_date) {
            alert('Please select a patient, specify the medicine/vaccine name, and set a due date.');
            return;
        }

        if (frequency === 'Custom' && (!customDaysVal || parseInt(customDaysVal, 10) <= 0)) {
            alert('Please enter a valid number of days for the custom interval.');
            return;
        }

        const payload = {
            id: id || undefined,
            petid,
            type,
            name,
            label,
            frequency,
            custom_interval_days: frequency === 'Custom' ? parseInt(customDaysVal, 10) : null,
            due_date,
            administered_date: status === 'Administered' ? (administered_date || due_date) : null,
            status,
            vetname: vetname || undefined,
            batch_number: batch_number || undefined,
            notes: notes || undefined
        };

        try {
            const res = await fetch(`${app.db.apiURL}/vaccinations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to save vaccination/deworming record');
            }

            // Reload state
            await app.db.loadState();

            app.ui.closeAllModals();

            // Refresh view
            if (app.router.activeView === 'vaccinations') {
                app.vaccinations.renderList();
            } else if (app.router.activeView === 'pet-details') {
                app.pets.showDetail(petid);
            }
        } catch (err) {
            console.error('Error saving vaccination:', err);
            alert('Could not save schedule: ' + err.message);
        }
    },

    // Mark dose as administered with 1-click
    markAdministered: async (id) => {
        const today = new Date().toISOString().split('T')[0];
        try {
            const res = await fetch(`${app.db.apiURL}/vaccinations/${id}/administer`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ administered_date: today })
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to mark as administered');
            }

            await app.db.loadState();
            app.vaccinations.renderList();

            // Prompt if user wants to schedule the next dose immediately
            const vacs = app.db.get('vaccinations') || [];
            const updatedItem = vacs.find(v => v.id === id);
            if (updatedItem && confirm(`Dose marked as Administered!\n\nWould you like to schedule the next ${updatedItem.frequency} ${updatedItem.type} dose now?`)) {
                app.vaccinations.scheduleNextDose(id);
            }
        } catch (err) {
            console.error('Error administering vaccination:', err);
            alert('Could not update status: ' + err.message);
        }
    },

    // Calculate and prefill modal for the next dose in schedule
    scheduleNextDose: (id) => {
        const vacs = app.db.get('vaccinations') || [];
        const item = vacs.find(v => v.id === id);
        if (!item) return;

        const baseDate = item.administered_date || item.due_date;
        const nextDue = app.vaccinations.calculateNextDate(baseDate, item.frequency, item.custom_interval_days);
        const nextLabel = app.vaccinations.calculateNextLabel(item.label);

        const nextData = {
            ...item,
            _isNextDose: true,
            id: '',
            label: nextLabel,
            due_date: nextDue,
            status: 'Scheduled',
            administered_date: '',
            notes: `Next scheduled cycle following ${item.label} dose.`
        };

        app.vaccinations.openModal(nextData, item.petid);
    },

    // Delete record
    delete: async (id) => {
        if (!confirm('Are you sure you want to delete this vaccination/deworming record?')) return;
        try {
            const res = await fetch(`${app.db.apiURL}/vaccinations/${id}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to delete record');
            }

            await app.db.loadState();
            app.vaccinations.renderList();
        } catch (err) {
            console.error('Error deleting record:', err);
            alert('Could not delete record: ' + err.message);
        }
    }
};

// Bind UI actions
document.addEventListener('DOMContentLoaded', () => {
    // Search input
    const searchInput = document.getElementById('vaccination-search');
    if (searchInput) {
        searchInput.oninput = (e) => app.vaccinations.renderList(e.target.value);
    }

    // Type filter
    const typeFilter = document.getElementById('vac-filter-type');
    if (typeFilter) {
        typeFilter.onchange = (e) => {
            app.vaccinations.activeTypeFilter = e.target.value;
            app.vaccinations.renderList();
        };
    }

    // Status filter
    const statusFilter = document.getElementById('vac-filter-status');
    if (statusFilter) {
        statusFilter.onchange = (e) => {
            app.vaccinations.activeStatusFilter = e.target.value;
            app.vaccinations.renderList();
        };
    }

    // Label filter
    const labelFilter = document.getElementById('vac-filter-label');
    if (labelFilter) {
        labelFilter.onchange = (e) => {
            app.vaccinations.activeLabelFilter = e.target.value;
            app.vaccinations.renderList();
        };
    }

    // Frequency filter
    const freqFilter = document.getElementById('vac-filter-frequency');
    if (freqFilter) {
        freqFilter.onchange = (e) => {
            app.vaccinations.activeFrequencyFilter = e.target.value;
            app.vaccinations.renderList();
        };
    }

    // Schedule Dose button
    const newBtn = document.getElementById('btn-new-vaccination');
    if (newBtn) {
        newBtn.onclick = () => app.vaccinations.openModal();
    }

    // Frequency change inside modal (toggle custom days input)
    const modalFreq = document.getElementById('vac-frequency');
    if (modalFreq) {
        modalFreq.onchange = (e) => {
            const customGroup = document.getElementById('vac-custom-group');
            if (customGroup) {
                customGroup.style.display = e.target.value === 'Custom' ? 'flex' : 'none';
            }
        };
    }

    // Status change inside modal (toggle administration date)
    const modalStatus = document.getElementById('vac-status');
    if (modalStatus) {
        modalStatus.onchange = (e) => {
            const adminGroup = document.getElementById('vac-admin-date-group');
            if (adminGroup) {
                adminGroup.style.display = e.target.value === 'Administered' ? 'flex' : 'none';
            }
            if (e.target.value === 'Administered') {
                const adminDate = document.getElementById('vac-administered-date');
                if (adminDate && !adminDate.value) {
                    adminDate.value = new Date().toISOString().split('T')[0];
                }
            }
        };
    }
});

