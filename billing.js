/**
 * VetiCare - Billing & Invoicing Module
 */

window.app = window.app || {};

app.billing = {
    // Render list of invoices in table
    renderList: (searchQuery = '') => {
        const listContainer = document.getElementById('invoices-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        let invoices = app.db.get('invoices') || [];
        const pets = app.db.get('pets') || [];
        const owners = app.db.get('owners') || [];
        const statusFilter = document.getElementById('billing-status-filter')?.value || 'all';

        // Filter by status
        if (statusFilter !== 'all') {
            invoices = invoices.filter(inv => inv.status === statusFilter);
        }

        // Apply text search filtering
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            invoices = invoices.filter(inv => {
                const pet = pets.find(p => p.id === inv.petid) || { name: '' };
                const owner = owners.find(o => o.id === pet.ownerid) || { name: '' };
                
                return inv.id.toLowerCase().includes(query) ||
                       inv.reason.toLowerCase().includes(query) ||
                       pet.name.toLowerCase().includes(query) ||
                       owner.name.toLowerCase().includes(query);
            });
        }

        // Sort chronologically descending
        invoices.sort((a, b) => b.date_time.localeCompare(a.date_time));

        if (invoices.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="7" class="empty-state" style="padding: 32px; text-align: center; color: var(--text-muted);">No invoices found matching criteria.</td></tr>';
            return;
        }

        invoices.forEach(inv => {
            const pet = pets.find(p => p.id === inv.petid) || { name: 'Unknown Patient', ownerid: '' };
            const owner = owners.find(o => o.id === pet.ownerid) || { name: 'Unknown Owner' };
            const date = new Date(inv.date_time);

            const statusClass = inv.status.toLowerCase(); // 'paid' or 'pending'

            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--border-color)';
            row.className = 'table-row-hover';

            row.innerHTML = `
                <td style="padding: 16px; font-weight: 700; color: var(--text-main);">${inv.id}</td>
                <td style="padding: 16px; color: var(--text-muted);">${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td style="padding: 16px;">
                    <div style="font-weight: 600; color: var(--text-main);">${pet.name}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${owner.name}</div>
                </td>
                <td style="padding: 16px; color: var(--text-muted);">${inv.reason}</td>
                <td style="padding: 16px; font-weight: 800; color: var(--text-main);">$${Number(inv.total).toFixed(2)}</td>
                <td style="padding: 16px;">
                    <span class="invoice-status ${statusClass}">
                        <span class="pulse-dot" style="background-color: currentColor;"></span>
                        ${inv.status}
                    </span>
                </td>
                <td style="padding: 16px; text-align: right;">
                    <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center;">
                        <button class="secondary-btn btn-sm" onclick="app.ui.openInvoiceModal(${JSON.stringify(inv).replace(/"/g, '&quot;')})">
                            Receipt
                        </button>
                        ${inv.status === 'Pending' ? `
                            <button class="primary-btn btn-sm" onclick="app.billing.pay('${inv.id}')">
                                Pay
                            </button>` : ''
                        }
                        <button class="secondary-btn btn-sm btn-danger" onclick="app.billing.delete('${inv.id}')" title="Delete Invoice">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px; height:12px;"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                            Delete
                        </button>
                    </div>
                </td>
            `;
            listContainer.appendChild(row);
        });
    },

    // Record invoice payment
    pay: async (invoiceId) => {
        try {
            await fetch(`${app.db.apiURL}/invoices/${invoiceId}/pay`, {
                method: 'PUT'
            });

            // Reload DBMS State
            await app.db.loadState();

            app.ui.closeAllModals();

            // Refresh current view context
            if (app.router.activeView === 'billing') {
                app.billing.renderList();
            } else if (app.router.activeView === 'reports') {
                app.reports.render();
            } else if (app.router.activeView === 'dashboard') {
                app.dashboard.render();
            }
        } catch (err) {
            console.error('Error recording invoice payment:', err);
            alert('Could not record payment.');
        }
    },

    // Delete invoice
    delete: async (invoiceId) => {
        if (!confirm(`Are you sure you want to delete invoice ${invoiceId}?`)) return;
        try {
            const res = await fetch(`${app.db.apiURL}/invoices/${invoiceId}`, {
                method: 'DELETE'
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || 'Failed to delete invoice');
            }

            await app.db.loadState();
            app.ui.closeAllModals();

            if (app.router.activeView === 'billing') {
                app.billing.renderList();
            } else if (app.router.activeView === 'reports') {
                app.reports.render();
            } else if (app.router.activeView === 'dashboard') {
                app.dashboard.render();
            }
        } catch (err) {
            console.error('Error deleting invoice:', err);
            alert('Could not delete invoice: ' + err.message);
        }
    }
};

// Bind inputs on load
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('billing-search');
    if (searchInput) {
        searchInput.oninput = (e) => {
            app.billing.renderList(e.target.value);
        };
    }

    const filterSelect = document.getElementById('billing-status-filter');
    if (filterSelect) {
        filterSelect.onchange = () => {
            app.billing.renderList(searchInput?.value || '');
        };
    }
});
