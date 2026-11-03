/**
 * VetiCare - Clinical Treatment & Medical Records Component
 */

window.app = window.app || {};

app.treatments = {
    modalAttachments: [],

    // Storage bucket helper (configurable via VITE_SUPABASE_STORAGE_BUCKET or window config)
    getBucketName: () => {
        return (typeof window !== 'undefined' && window.VETICARE_STORAGE_BUCKET)
            || (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SUPABASE_STORAGE_BUCKET)
            || 'treatment-reports';
    },

    // Parse attachments from DB (handles Array, JSON string, or single URL string)
    parseAttachments: (raw) => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                if (raw.startsWith('http') || raw.startsWith('/')) {
                    const fname = raw.split('/').pop().split('?')[0] || 'Attachment';
                    return [{
                        id: 'att-legacy',
                        name: decodeURIComponent(fname),
                        category: 'Report',
                        url: raw,
                        path: raw,
                        type: 'file',
                        size: 0
                    }];
                }
                return [];
            }
        }
        return [];
    },

    // Category emoji & icon helper
    getCategoryIcon: (category = '', fileType = '') => {
        const cat = String(category).toLowerCase();
        if (cat.includes('x-ray') || cat.includes('xray')) return '🩻';
        if (cat.includes('ecg')) return '🩺';
        if (cat.includes('ultra') || cat.includes('sono')) return '🔍';
        if (cat.includes('lab') || cat.includes('blood') || cat.includes('test')) return '📄';
        if (fileType.includes('image')) return '🖼️';
        if (fileType.includes('pdf')) return '📕';
        return '📎';
    },

    // Format bytes to readable size
    formatFileSize: (bytes) => {
        if (!bytes || isNaN(bytes) || bytes === 0) return '';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    },

    // Render attachments list inside the treatment modal
    renderModalAttachments: () => {
        const listEl = document.getElementById('treatment-attachments-list');
        const countBadge = document.getElementById('treatment-attachment-count');
        if (!listEl) return;

        const count = app.treatments.modalAttachments.length;
        if (countBadge) {
            countBadge.textContent = `${count} attached`;
        }

        if (count === 0) {
            listEl.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); padding: 4px 0;">No diagnostic reports or media attached yet.</div>';
            return;
        }

        listEl.innerHTML = app.treatments.modalAttachments.map((att, idx) => `
            <div class="modal-attachment-chip">
                <div class="modal-attachment-info">
                    <span class="modal-attachment-icon">${app.treatments.getCategoryIcon(att.category, att.type)}</span>
                    <a href="${att.url}" target="_blank" rel="noopener noreferrer" class="modal-attachment-name" title="Click to preview">${att.name}</a>
                    <span class="attachment-pill-tag">${att.category || 'File'}</span>
                    <span class="modal-attachment-meta">${app.treatments.formatFileSize(att.size)}</span>
                </div>
                <div class="modal-attachment-actions">
                    <a href="${att.url}" target="_blank" rel="noopener noreferrer" class="icon-btn-danger" style="width: 24px; height: 24px; color: var(--color-primary-light); border-color: var(--border-color);" title="View file">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                    <button type="button" class="icon-btn-danger" style="width: 24px; height: 24px;" onclick="app.treatments.removeAttachment(${idx})" title="Remove attachment">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    },

    // Remove single attachment from active modal list
    removeAttachment: async (idx) => {
        const item = app.treatments.modalAttachments[idx];
        if (item && item.path) {
            try {
                const client = (app.auth && app.auth.client) || window.supabase;
                const bucket = app.treatments.getBucketName();
                if (client && client.storage) {
                    await client.storage.from(bucket).remove([item.path]);
                }
            } catch (err) {
                console.warn('Could not remove file from bucket:', err);
            }
        }
        app.treatments.modalAttachments.splice(idx, 1);
        app.treatments.renderModalAttachments();
    },

    // Upload one or multiple files to Supabase Storage (Max 50MB)
    handleFileUpload: async (files) => {
        if (!files || files.length === 0) return;

        const maxBytes = 50 * 1024 * 1024; // 50MB
        const bucket = app.treatments.getBucketName();
        const client = (app.auth && app.auth.client) || window.supabase;

        if (!client || !client.storage) {
            alert('Supabase storage client is not available. Please verify Supabase credentials.');
            return;
        }

        const progressContainer = document.getElementById('treatment-upload-progress');
        const progressText = document.getElementById('upload-progress-text');
        const progressPercent = document.getElementById('upload-progress-percent');
        const progressBar = document.getElementById('upload-progress-bar');
        const categorySelect = document.getElementById('treatment-attachment-category');
        const category = categorySelect ? categorySelect.value : 'Lab Report';
        const petid = document.getElementById('treatment-pet')?.value || 'general';

        if (progressContainer) progressContainer.style.display = 'block';

        let uploadErrors = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            // 50MB size limit check
            if (file.size > maxBytes) {
                alert(`File "${file.name}" exceeds the 50MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB). Upload skipped.`);
                continue;
            }

            const pct = Math.round(((i + 1) / files.length) * 100);
            if (progressText) progressText.textContent = `Uploading ${file.name} (${i + 1}/${files.length})...`;
            if (progressPercent) progressPercent.textContent = `${pct}%`;
            if (progressBar) progressBar.style.width = `${pct}%`;

            // Clean, safe path: petid/timestamp_filename
            const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const filePath = `${petid}/${Date.now()}_${cleanName}`;

            try {
                const { data, error } = await client.storage
                    .from(bucket)
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: true
                    });

                if (error) throw error;

                // Obtain public URL
                const { data: pubData } = client.storage
                    .from(bucket)
                    .getPublicUrl(filePath);

                const finalUrl = pubData?.publicUrl || filePath;

                app.treatments.modalAttachments.push({
                    id: 'att-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
                    name: file.name,
                    category: category,
                    url: finalUrl,
                    path: filePath,
                    type: file.type || 'application/octet-stream',
                    size: file.size,
                    created_at: new Date().toISOString()
                });

            } catch (err) {
                console.error(`Upload error for ${file.name}:`, err);
                uploadErrors.push(`${file.name}: ${err.message || 'Upload failed'}`);
            }
        }

        if (progressContainer) progressContainer.style.display = 'none';
        app.treatments.renderModalAttachments();

        if (uploadErrors.length > 0) {
            alert(`Could not upload some files:\n\n${uploadErrors.join('\n')}\n\nTip: Please verify that bucket "${bucket}" exists on Supabase Storage with policies enabled.`);
        }
    },
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
                const pet = pets.find(p => p.id === t.petid) || { name: '' };
                const owner = owners.find(o => o.id === pet.ownerid) || { name: '' };
                
                return t.diagnosis.toLowerCase().includes(query) ||
                       t.symptoms.toLowerCase().includes(query) ||
                       (t.medications && t.medications.toLowerCase().includes(query)) ||
                       pet.name.toLowerCase().includes(query) ||
                       owner.name.toLowerCase().includes(query);
            });
        }

        // Sort by date descending
        treatments.sort((a, b) => b.date_time.localeCompare(a.date_time));

        if (treatments.length === 0) {
            logsContainer.innerHTML = '<div class="empty-state">No clinical treatment records found.</div>';
            return;
        }

        const speciesIcons = { Dog: '🐶', Dogs: '🐶', Cat: '🐱', Cats: '🐱', Bird: '🦜', Birds: '🦜', Rabbit: '🐰', Rabbits: '🐰', Reptile: '🦎', Reptiles: '🦎', Horse: '🐴', Horses: '🐴', Goat: '🐐', Goats: '🐐', Sheep: '🐑', Buffalo: '🦬', Buffaloes: '🦬', Buffalos: '🦬', Cattle: '🐄', Cattles: '🐄', Cow: '🐄', Cows: '🐄', Other: '🐾' };

        treatments.forEach(t => {
            const pet = pets.find(p => p.id === t.petid) || { name: 'Unknown Patient', species: 'Other', ownerid: '' };
            const owner = owners.find(o => o.id === pet.ownerid) || { name: 'Unknown Owner' };
            const date = new Date(t.date_time);
            const icon = speciesIcons[pet.species] || speciesIcons.Other;

            const card = document.createElement('div');
            card.className = 'clinical-card';
            
            // Generate vaccine indicator if recorded
            const vaccineBadge = t.vaccinegiven 
                ? `<span class="badge" style="background-color: var(--color-success-soft); color: var(--color-success); font-size: 11px;">💉 ${t.vaccinegiven} Shot</span>`
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
                    ${(() => {
                        const atts = app.treatments.parseAttachments(t.attachments);
                        if (atts.length === 0) return '';
                        return `
                            <div class="treatment-attachments-bar mt-2">
                                <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px;">Diagnostic Reports &amp; Imaging (${atts.length})</span>
                                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                                    ${atts.map(att => `
                                        <a href="${att.url}" target="_blank" rel="noopener noreferrer" class="attachment-pill" title="Open ${att.name}">
                                            <span class="attachment-pill-icon">${app.treatments.getCategoryIcon(att.category, att.type)}</span>
                                            <span class="attachment-pill-name">${att.name}</span>
                                            <span class="attachment-pill-tag">${att.category || 'Report'}</span>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px; height:10px; margin-left: 2px;"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                                        </a>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    })()}
                </div>
                
                <div class="clinical-billing-block">
                    <span class="clinical-cost">$${Number(t.cost).toFixed(2)}</span>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <button class="secondary-btn btn-sm" onclick="app.ui.openTreatmentModal(${JSON.stringify(t).replace(/"/g, '&quot;')})">Edit</button>
                        <button class="secondary-btn btn-sm btn-danger" onclick="app.treatments.delete('${t.id}', '${t.petid}')" title="Delete Treatment">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            Delete
                        </button>
                    </div>
                </div>
            `;
            logsContainer.appendChild(card);
        });
    },

    // Save a clinical treatment visit
    save: async () => {
        const id = document.getElementById('treatment-id').value;
        const apptId = document.getElementById('treatment-appt-id').value;
        const petid = document.getElementById('treatment-pet').value;
        const date_time = document.getElementById('treatment-date').value;
        const symptoms = document.getElementById('treatment-symptoms').value.trim();
        const diagnosis = document.getElementById('treatment-diagnosis').value.trim();
        const medications = document.getElementById('treatment-meds').value.trim();
        const vaccinegiven = document.getElementById('treatment-vaccine').value;
        const cost = parseFloat(document.getElementById('treatment-cost').value);
        const notes = document.getElementById('treatment-notes').value.trim();
        const payment_status = document.getElementById('treatment-payment-status')?.value || 'Paid';
        const payment_method = document.getElementById('treatment-payment-method')?.value || 'Card';

        if (!petid || !date_time || !symptoms || !diagnosis || isNaN(cost)) {
            alert('Please fill out all required fields.');
            return;
        }

        const payload = {
            id: id || undefined,
            appointmentid: apptId || undefined,
            petid,
            date_time,
            symptoms,
            diagnosis,
            medications: medications || undefined,
            vaccinegiven: vaccinegiven || undefined,
            cost,
            notes: notes || undefined,
            payment_status,
            payment_method,
            attachments: app.treatments.modalAttachments || []
        };

        try {
            await fetch(`${app.db.apiURL}/treatments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Reload DBMS State
            await app.db.loadState();

            app.ui.closeAllModals();

            // Refresh views depending on where we are
            if (app.router.activeView === 'pet-details') {
                app.pets.showDetail(petid);
            } else if (app.router.activeView === 'treatments') {
                app.treatments.renderList();
            } else if (app.router.activeView === 'dashboard') {
                app.dashboard.render();
            } else if (app.router.activeView === 'appointments') {
                app.appointments.renderAgenda();
            } else if (app.router.activeView === 'reports') {
                app.reports.render();
            }
        } catch (err) {
            console.error('Error saving clinical treatment:', err);
            alert('Could not save treatment record.');
        }
    },

    // Delete treatment record and cascade to associated invoice
    delete: async (treatmentid, petid = null) => {
        if (!confirm('Are you sure you want to delete this treatment record and its associated invoice?')) return;
        try {
            // Client-side cleanup attempt as additional safeguard
            const localTreatment = (app.db.get('treatments') || []).find(t => t.id === treatmentid);
            if (localTreatment && localTreatment.attachments) {
                const atts = app.treatments.parseAttachments(localTreatment.attachments);
                const paths = atts.map(a => a.path).filter(Boolean);
                if (paths.length > 0) {
                    try {
                        const client = (app.auth && app.auth.client) || window.supabase;
                        const bucket = app.treatments.getBucketName();
                        if (client && client.storage) {
                            await client.storage.from(bucket).remove(paths);
                        }
                    } catch (e) {
                        console.warn('Client-side storage cleanup notice:', e);
                    }
                }
            }

            const res = await fetch(`${app.db.apiURL}/treatments/${treatmentid}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to delete treatment');
            }

            await app.db.loadState();

            if (app.router.activeView === 'pet-details' && petid) {
                app.pets.showDetail(petid);
            } else if (app.router.activeView === 'treatments') {
                app.treatments.renderList();
            } else if (app.router.activeView === 'dashboard') {
                app.dashboard.render();
            } else if (app.router.activeView === 'billing') {
                app.billing.renderList();
            }
        } catch (err) {
            console.error('Error deleting treatment:', err);
            alert('Could not delete treatment: ' + err.message);
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


});
