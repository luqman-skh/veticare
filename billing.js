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
                const pet = pets.find(p => p.id === inv.petId) || { name: '' };
                const owner = owners.find(o => o.id === pet.ownerId) || { name: '' };
                
                return inv.id.toLowerCase().includes(query) ||
                       inv.reason.toLowerCase().includes(query) ||
                       pet.name.toLowerCase().includes(query) ||
                       owner.name.toLowerCase().includes(query);
            });
        }

        // Sort chronologically descending
        invoices.sort((a, b) => b.dateTime.localeCompare(a.dateTime));

        if (invoices.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="7" class="empty-state" style="padding: 32px; text-align: center; color: var(--text-muted);">No invoices found matching criteria.</td></tr>';
            return;
        }

        invoices.forEach(inv => {
            const pet = pets.find(p => p.id === inv.petId) || { name: 'Unknown Patient', ownerId: '' };
            const owner = owners.find(o => o.id === pet.ownerId) || { name: 'Unknown Owner' };
            const date = new Date(inv.dateTime);

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
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button class="secondary-btn btn-sm" onclick="app.ui.openInvoiceModal(${JSON.stringify(inv).replace(/"/g, '&quot;')})">
                            Receipt
                        </button>
                        ${inv.status === 'Pending' ? `
                            <button class="primary-btn btn-sm" onclick="app.billing.pay('${inv.id}')">
                                Pay
                            </button>` : ''
                        }
                    </div>
                </td>
            `;
            listContainer.appendChild(row);
        });
    },

    // Record invoice payment
    pay: (invoiceId) => {
        let invoices = app.db.get('invoices') || [];
        const index = invoices.findIndex(inv => inv.id === invoiceId);
        if (index !== -1) {
            invoices[index].status = 'Paid';
            invoices[index].paymentMethod = 'Card';
            app.db.set('invoices', invoices);

            app.ui.closeAllModals();

            // Refresh current view context
            if (app.router.activeView === 'billing') {
                app.billing.renderList();
            } else if (app.router.activeView === 'reports') {
                app.reports.render();
            } else if (app.router.activeView === 'dashboard') {
                app.dashboard.render();
            }
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
