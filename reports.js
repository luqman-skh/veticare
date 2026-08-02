/**
 * VetiCare - Insights & Reports Component
 */

window.app = window.app || {};

app.reports = {
    render: () => {
        const pets = app.db.get('pets') || [];
        const appointments = app.db.get('appointments') || [];
        const treatments = app.db.get('treatments') || [];
        const invoices = app.db.get('invoices') || [];
        const owners = app.db.get('owners') || [];

        // 1. Calculate top summary cards
        // Total Invoice Revenue (Paid Invoices only)
        const totalRevenue = invoices
            .filter(inv => inv.status === 'Paid')
            .reduce((sum, inv) => sum + Number(inv.total), 0);
        
        const revCard = document.getElementById('rep-total-revenue');
        if (revCard) {
            revCard.textContent = `$${totalRevenue.toFixed(2)}`;
        }

        // Completed Consultations
        const completedConsults = appointments.filter(a => a.status === 'Completed').length;
        const consultsCard = document.getElementById('rep-total-consults');
        if (consultsCard) {
            consultsCard.textContent = completedConsults;
        }

        // Vaccine Compliance Rate
        const totalPets = pets.length;
        const fullyVaccinated = pets.filter(p => p.vaccination === 'Up-to-date').length;
        const complianceRate = totalPets > 0 ? Math.round((fullyVaccinated / totalPets) * 100) : 0;
        
        const vaccineCard = document.getElementById('rep-vaccine-rate');
        if (vaccineCard) {
            vaccineCard.textContent = `${complianceRate}%`;
        }

        // 2. Render Upcoming Vaccination Tracker Table
        app.reports.renderVaccinesTable(pets, owners);

        // 3. Render Revenue line chart
        app.reports.renderRevenueChart(invoices);

        // 4. Render Diagnoses bar chart
        app.reports.renderDiagnosesChart(treatments);
    },

    // Renders the upcoming vaccination table
    renderVaccinesTable: (pets, owners) => {
        const tbody = document.getElementById('vaccine-schedules-list');
        if (!tbody) return;

        tbody.innerHTML = '';

        // Select pets needing boosters (Partially/Not Vaccinated)
        const duePets = pets.filter(p => p.vaccination !== 'Up-to-date');

        if (duePets.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding: 16px; text-align: center; color: var(--text-muted);">All pets are up-to-date! No boosters due.</td></tr>';
            return;
        }

        const speciesIcons = { Dog: '🐶', Cat: '🐱', Bird: '🦜', Rabbit: '🐰', Reptile: '🦎', Other: '🐾' };

        duePets.forEach(pet => {
            const owner = owners.find(o => o.id === pet.ownerId) || { name: 'Unknown Owner', phone: '-' };
            const icon = speciesIcons[pet.species] || speciesIcons.Other;
            const statusClass = pet.vaccination === 'Partially Vaccinated' ? 'warning' : 'danger';

            const row = document.createElement('tr');
            row.style.borderBottom = '1px solid var(--border-color)';
            row.className = 'table-row-hover';

            row.innerHTML = `
                <td style="padding: 12px; font-weight: 700; color: var(--text-main);">${icon} ${pet.name}</td>
                <td style="padding: 12px; color: var(--text-muted);">${pet.species} (${pet.breed})</td>
                <td style="padding: 12px;">
                    <div style="font-weight: 600; color: var(--text-main);">${owner.name}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${owner.phone}</div>
                </td>
                <td style="padding: 12px;">
                    <span class="status-badge ${statusClass}" style="font-size: 10px;">${pet.vaccination}</span>
                </td>
                <td style="padding: 12px; text-align: right;">
                    <button class="primary-btn btn-sm" onclick="app.ui.openAppointmentModal(null, null); document.getElementById('appt-pet').value = '${pet.id}'; document.getElementById('appt-reason').value = 'Vaccination';">
                        Schedule Booster
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    },

    // Generates the Revenue line chart
    renderRevenueChart: (invoices) => {
        const chartContainer = document.getElementById('revenue-chart-container');
        if (!chartContainer) return;

        chartContainer.innerHTML = '';

        // Generate past 7 days date strings (YYYY-MM-DD)
        const days = [];
        const dayLabels = [];
        const dateObj = new Date();
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(dateObj.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            days.push(dateStr);
            // Label format like "Mon", "Tue"
            dayLabels.push(d.toLocaleDateString([], { weekday: 'short' }));
        }

        // Aggregate daily paid revenue
        const dailyRevenue = days.map(day => {
            return invoices
                .filter(inv => inv.status === 'Paid' && inv.dateTime.startsWith(day))
                .reduce((sum, inv) => sum + Number(inv.total), 0);
        });

        // Set dimensions for the coordinate grid
        const width = 500;
        const height = 200;
        const paddingLeft = 45;
        const paddingRight = 15;
        const paddingTop = 15;
        const paddingBottom = 30;

        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;

        // Calculate Y-scale ceiling (maximum revenue, base 100)
        const maxVal = Math.max(...dailyRevenue, 100);
        const yCeil = Math.ceil(maxVal / 50) * 50; // round up to multiple of 50

        // Helper calculations for points
        const points = dailyRevenue.map((val, idx) => {
            const x = paddingLeft + (idx / 6) * chartWidth;
            const y = paddingTop + chartHeight - (val / yCeil) * chartHeight;
            return { x, y, val };
        });

        // SVG string construction
        let svg = `<svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">
            <defs>
                <linearGradient id="chart-rev-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--color-primary)" stop-opacity="0.3"></stop>
                    <stop offset="100%" stop-color="var(--color-primary)" stop-opacity="0.0"></stop>
                </linearGradient>
            </defs>
        `;

        // Render grid lines
        const gridCount = 4;
        for (let i = 0; i <= gridCount; i++) {
            const y = paddingTop + (i / gridCount) * chartHeight;
            const val = yCeil - (i / gridCount) * yCeil;
            svg += `
                <line x1="${paddingLeft}" y1="${y}" x2="${width - paddingRight}" y2="${y}" class="chart-grid-line"></line>
                <text x="${paddingLeft - 8}" y="${y + 4}" class="chart-axis-label" text-anchor="end">$${Math.round(val)}</text>
            `;
        }

        // Render area path
        let areaPath = `M ${points[0].x} ${paddingTop + chartHeight} `;
        points.forEach(p => {
            areaPath += `L ${p.x} ${p.y} `;
        });
        areaPath += `L ${points[points.length - 1].x} ${paddingTop + chartHeight} Z`;

        svg += `<path d="${areaPath}" fill="url(#chart-rev-grad)"></path>`;

        // Render line path
        let linePath = `M ${points[0].x} ${points[0].y} `;
        for (let i = 1; i < points.length; i++) {
            linePath += `L ${points[i].x} ${points[i].y} `;
        }
        svg += `<path d="${linePath}" class="chart-line-stroke"></path>`;

        // Render data circles & interactive tooltips
        points.forEach((p, idx) => {
            svg += `
                <circle cx="${p.x}" cy="${p.y}" r="5" class="chart-line-point">
                    <title>${dayLabels[idx]}: $${p.val.toFixed(2)}</title>
                </circle>
            `;
        });

        // Render X-axis labels
        points.forEach((p, idx) => {
            svg += `<text x="${p.x}" y="${height - 8}" class="chart-axis-label" text-anchor="middle">${dayLabels[idx]}</text>`;
        });

        svg += `</svg>`;
        chartContainer.innerHTML = svg;
    },

    // Generates Horizontal Bar Chart for diagnoses
    renderDiagnosesChart: (treatments) => {
        const chartContainer = document.getElementById('diagnoses-chart-container');
        if (!chartContainer) return;

        chartContainer.innerHTML = '';

        // Aggregate diagnosis frequencies
        const counts = {};
        treatments.forEach(t => {
            const d = t.diagnosis;
            counts[d] = (counts[d] || 0) + 1;
        });

        // Convert to array and sort descending
        const data = Object.keys(counts).map(key => ({
            name: key,
            count: counts[key]
        })).sort((a, b) => b.count - a.count).slice(0, 5); // top 5

        if (data.length === 0) {
            chartContainer.innerHTML = '<div class="empty-state" style="color: var(--text-muted); font-size: 13px;">No clinical diagnoses recorded yet.</div>';
            return;
        }

        const width = 500;
        const height = 200;
        const barHeight = 22;
        const barGap = 12;
        const paddingLeft = 140; // Space for labels
        const paddingRight = 45;
        const paddingTop = 15;

        const maxCount = Math.max(...data.map(d => d.count), 1);
        const chartWidth = width - paddingLeft - paddingRight;

        let svg = `<svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">`;

        data.forEach((item, idx) => {
            const y = paddingTop + idx * (barHeight + barGap);
            const w = (item.count / maxCount) * chartWidth;
            
            // Format labels if too long
            const displayName = item.name.length > 20 ? item.name.substring(0, 18) + '...' : item.name;

            svg += `
                <text x="${paddingLeft - 10}" y="${y + 15}" class="chart-axis-label" text-anchor="end">${displayName}</text>
                <rect x="${paddingLeft}" y="${y}" width="${w}" height="${barHeight}" class="chart-bar-rect"></rect>
                <text x="${paddingLeft + w + 8}" y="${y + 15}" class="chart-bar-label">${item.count} ${item.count === 1 ? 'case' : 'cases'}</text>
            `;
        });

        svg += `</svg>`;
        chartContainer.innerHTML = svg;
    }
};
