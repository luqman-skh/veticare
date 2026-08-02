/**
 * VetiCare - Appointments Scheduling Component
 */

window.app = window.app || {};

app.appointments = {
    currentDate: new Date(),
    selectedDateStr: new Date().toISOString().split('T')[0],

    // Initialize calendar controls
    initCalendar: () => {
        const prevBtn = document.getElementById('prev-month-btn');
        const nextBtn = document.getElementById('next-month-btn');
        
        if (prevBtn) {
            prevBtn.onclick = () => {
                app.appointments.currentDate.setMonth(app.appointments.currentDate.getMonth() - 1);
                app.appointments.renderCalendar();
            };
        }
        
        if (nextBtn) {
            nextBtn.onclick = () => {
                app.appointments.currentDate.setMonth(app.appointments.currentDate.getMonth() + 1);
                app.appointments.renderCalendar();
            };
        }

        // Vet filter in agenda view
        const vetSelect = document.getElementById('scheduler-vet-select');
        if (vetSelect) {
            vetSelect.onchange = () => {
                app.appointments.renderAgenda();
            };
        }

        // Collision detection on form input changes
        const checkInputsForCollision = () => {
            const vet = document.getElementById('appt-vet').value;
            const date = document.getElementById('appt-date').value;
            const time = document.getElementById('appt-time').value;
            const id = document.getElementById('appointment-id').value;

            if (vet && date && time) {
                const isColliding = app.appointments.checkCollision(vet, date, time, id);
                const alertDiv = document.getElementById('appointment-collision-alert');
                const saveBtn = document.getElementById('save-appointment-btn');
                
                if (isColliding) {
                    alertDiv.style.display = 'block';
                    saveBtn.disabled = true;
                    saveBtn.style.opacity = '0.5';
                    saveBtn.style.cursor = 'not-allowed';
                } else {
                    alertDiv.style.display = 'none';
                    saveBtn.disabled = false;
                    saveBtn.style.opacity = '1';
                    saveBtn.style.cursor = 'pointer';
                }
            }
        };

        const formVet = document.getElementById('appt-vet');
        const formDate = document.getElementById('appt-date');
        const formTime = document.getElementById('appt-time');

        if (formVet) formVet.onchange = checkInputsForCollision;
        if (formDate) formDate.onchange = checkInputsForCollision;
        if (formTime) formTime.onchange = checkInputsForCollision;

        // Hook up Book Slot header action button inside calendar view
        const bookBtn = document.getElementById('book-appt-btn');
        if (bookBtn) {
            bookBtn.onclick = () => {
                app.ui.openAppointmentModal(null, app.appointments.selectedDateStr);
            };
        }

        app.appointments.renderCalendar();
    },

    // Render calendar grid days
    renderCalendar: () => {
        const monthYearHeader = document.getElementById('calendar-month-year');
        const daysContainer = document.getElementById('calendar-days');
        if (!daysContainer || !monthYearHeader) return;

        daysContainer.innerHTML = '';

        const year = app.appointments.currentDate.getFullYear();
        const month = app.appointments.currentDate.getMonth();

        // Set month header text
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        monthYearHeader.textContent = `${monthNames[month]} ${year}`;

        // Get first day of month and total days
        const firstDayIndex = new Date(year, month, 1).getDay();
        const totalDays = new Date(year, month + 1, 0).getDate();

        // Get appointments to mark event indicator dots
        const appointments = app.db.get('appointments') || [];

        // Render empty day spaces before first of month
        for (let i = 0; i < firstDayIndex; i++) {
            const emptySpace = document.createElement('div');
            emptySpace.className = 'calendar-day empty';
            daysContainer.appendChild(emptySpace);
        }

        // Render calendar days
        const todayStr = new Date().toISOString().split('T')[0];
        
        for (let day = 1; day <= totalDays; day++) {
            const dayButton = document.createElement('button');
            dayButton.className = 'calendar-day';
            dayButton.textContent = day;
            
            // Format single digits to YYYY-MM-DD
            const formattedMonth = String(month + 1).padStart(2, '0');
            const formattedDay = String(day).padStart(2, '0');
            const dateStr = `${year}-${formattedMonth}-${formattedDay}`;

            // Check if day matches selected date
            if (dateStr === app.appointments.selectedDateStr) {
                dayButton.classList.add('selected');
            }

            // Check if day is today
            if (dateStr === todayStr) {
                dayButton.classList.add('today');
            }

            // Check if day has active/scheduled appointments
            const hasEvents = appointments.some(appt => appt.dateTime.startsWith(dateStr) && appt.status !== 'Cancelled');
            if (hasEvents) {
                dayButton.classList.add('has-events');
            }

            dayButton.onclick = () => {
                // Clear previous selection
                document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
                dayButton.classList.add('selected');
                app.appointments.selectedDateStr = dateStr;
                app.appointments.renderAgenda();
            };

            daysContainer.appendChild(dayButton);
        }
    },

    // Render detailed agenda list for selected date
    renderAgenda: () => {
        const agendaList = document.getElementById('agenda-list');
        const agendaTitle = document.getElementById('agenda-date-title');
        const agendaSubtitle = document.getElementById('agenda-date-subtitle');
        if (!agendaList) return;

        agendaList.innerHTML = '';

        const selectedDate = new Date(app.appointments.selectedDateStr + 'T00:00:00');
        agendaTitle.textContent = selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

        const appointments = app.db.get('appointments') || [];
        const pets = app.db.get('pets') || [];
        const owners = app.db.get('owners') || [];
        const selectedVetFilter = document.getElementById('scheduler-vet-select').value;

        // Filter appointments matching selected date
        let dayAppts = appointments.filter(appt => appt.dateTime.startsWith(app.appointments.selectedDateStr));

        // Apply veterinarian filter
        if (selectedVetFilter !== 'all') {
            dayAppts = dayAppts.filter(appt => appt.vetName === selectedVetFilter);
        }

        // Sort by time slot
        dayAppts.sort((a, b) => a.dateTime.localeCompare(b.dateTime));

        agendaSubtitle.textContent = `${dayAppts.length} ${dayAppts.length === 1 ? 'appointment' : 'appointments'} scheduled`;

        if (dayAppts.length === 0) {
            agendaList.innerHTML = '<div class="empty-state">No appointments booked for this day.</div>';
            return;
        }

        dayAppts.forEach(appt => {
            const pet = pets.find(p => p.id === appt.petId) || { name: 'Unknown Pet', species: 'Other', breed: 'Unknown' };
            const owner = owners.find(o => o.id === pet.ownerId) || { name: 'Unknown Owner' };
            const time = appt.dateTime.split('T')[1];

            // Hour styling
            const [hour, min] = time.split(':');
            const hourNum = parseInt(hour);
            const period = hourNum >= 12 ? 'PM' : 'AM';
            const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
            const displayTime = `${displayHour}:${min}`;

            const card = document.createElement('div');
            card.className = `agenda-card ${appt.status.toLowerCase()}`;

            // Render action buttons depending on appointment state
            let actionsHTML = '';
            if (appt.status === 'Scheduled') {
                actionsHTML = `
                    <div class="agenda-actions">
                        <button class="secondary-btn btn-sm" onclick="app.appointments.changeStatus('${appt.id}', 'Cancelled')" style="color: var(--color-danger); border-color: var(--color-danger-soft);">Cancel</button>
                        <button class="primary-btn btn-sm" onclick="app.appointments.completeAppointment('${appt.id}', '${appt.petId}')">Complete</button>
                    </div>
                `;
            } else {
                actionsHTML = `
                    <span class="status-badge ${appt.status.toLowerCase()}">${appt.status}</span>
                `;
            }

            card.innerHTML = `
                <div class="agenda-time">
                    ${displayTime}
                    <span class="agenda-time-period">${period}</span>
                </div>
                <div class="agenda-info">
                    <div class="agenda-pet-title">
                        <span style="cursor:pointer;" onclick="window.location.hash='pet-details/${pet.id}'">${pet.name}</span>
                        <span class="badge" style="font-size: 10px; padding: 2px 6px;">${pet.species}</span>
                    </div>
                    <div class="agenda-vet-text">Vet: <strong>${appt.vetName}</strong> • Owner: ${owner.name}</div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">Reason: <em>${appt.reason}</em></div>
                </div>
                ${actionsHTML}
            `;
            agendaList.appendChild(card);
        });
    },

    // Collision check logic: Checks if a veterinarian already has an active appointment in the target date/time
    // We treat slots as 30 minute blocks, so checking matching date, time, and veterinarian name is correct
    checkCollision: (vetName, dateStr, timeStr, apptIdToIgnore = null) => {
        const appointments = app.db.get('appointments') || [];
        const targetDateTime = `${dateStr}T${timeStr}`;

        return appointments.some(appt => 
            appt.vetName === vetName &&
            appt.dateTime === targetDateTime &&
            appt.status === 'Scheduled' &&
            appt.id !== apptIdToIgnore
        );
    },

    // Save scheduled appointment slot
    save: () => {
        const id = document.getElementById('appointment-id').value;
        const petId = document.getElementById('appt-pet').value;
        const vetName = document.getElementById('appt-vet').value;
        const date = document.getElementById('appt-date').value;
        const time = document.getElementById('appt-time').value;
        const reason = document.getElementById('appt-reason').value;

        if (!petId || !vetName || !date || !time || !reason) {
            alert('Please fill out all required fields.');
            return;
        }

        // Perform final double-booking check
        const isColliding = app.appointments.checkCollision(vetName, date, time, id);
        if (isColliding) {
            document.getElementById('appointment-collision-alert').style.display = 'block';
            return;
        }

        let appointments = app.db.get('appointments') || [];
        const targetDateTime = `${date}T${time}`;

        if (id) {
            // Edit existing
            const index = appointments.findIndex(a => a.id === id);
            if (index !== -1) {
                appointments[index] = {
                    ...appointments[index],
                    petId,
                    vetName,
                    dateTime: targetDateTime,
                    reason
                };
            }
        } else {
            // Create new
            const newAppt = {
                id: 'a-' + Date.now(),
                petId,
                vetName,
                dateTime: targetDateTime,
                reason,
                status: 'Scheduled'
            };
            appointments.push(newAppt);
        }

        app.db.set('appointments', appointments);
        app.ui.closeAllModals();

        // Refresh views
        app.appointments.renderCalendar();
        app.appointments.renderAgenda();
    },

    // Change status (e.g. Cancel)
    changeStatus: (apptId, newStatus) => {
        let appointments = app.db.get('appointments') || [];
        const index = appointments.findIndex(a => a.id === apptId);
        
        if (index !== -1) {
            appointments[index].status = newStatus;
            app.db.set('appointments', appointments);
        }

        // Re-render
        app.appointments.renderCalendar();
        app.appointments.renderAgenda();
    },

    // Complete appointment - marks Completed and opens Treatment Modal
    completeAppointment: (apptId, petId) => {
        app.appointments.changeStatus(apptId, 'Completed');
        
        // Automatically launch Record Visit modal, passing pet ID and appointment reference
        app.ui.openTreatmentModal(null, petId, apptId);
    }
};
