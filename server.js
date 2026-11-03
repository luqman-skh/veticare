/**
 * VetiCare - Node.js Backend API Server
 * Uses Express and Supabase for DBMS integration.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT;
const HOST = process.env.HOST || '0.0.0.0';

// Configurable CORS: allow specific origins in production or all by default
const corsOrigin = process.env.CORS_ORIGIN 
    ? (process.env.CORS_ORIGIN === '*' ? '*' : process.env.CORS_ORIGIN.split(',').map(s => s.trim()))
    : '*';

app.use(cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Validate required Supabase credentials
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('\x1b[33m%s\x1b[0m', '[WARNING] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file. Database queries will fail until credentials are configured.');
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl || '', supabaseKey || '');

console.log(`Supabase client initialized for: ${supabaseUrl ? supabaseUrl : '(not set)'}`);

// Supabase Storage Bucket configuration
const storageBucketName = process.env.SUPABASE_STORAGE_BUCKET || process.env.VITE_SUPABASE_STORAGE_BUCKET || 'veti-care';

// Helper to safely delete diagnostic files / reports from Supabase Storage
async function deleteStorageAttachments(attachments) {
    if (!attachments) return;
    try {
        let attList = attachments;
        if (typeof attList === 'string') {
            try {
                attList = JSON.parse(attList);
            } catch (e) {
                attList = [];
            }
        }
        if (!Array.isArray(attList) || attList.length === 0) return;

        const paths = [];
        for (const att of attList) {
            if (!att) continue;
            if (att.path) {
                paths.push(att.path);
            } else if (att.url) {
                const parts = att.url.split('/' + storageBucketName + '/');
                if (parts.length > 1) {
                    paths.push(decodeURIComponent(parts[1]));
                }
            }
        }

        if (paths.length > 0) {
            console.log('[Storage] Deleting ' + paths.length + ' file(s) from bucket "' + storageBucketName + '":', paths);
            const { data, error } = await supabase.storage.from(storageBucketName).remove(paths);
            if (error) {
                console.warn('[Storage] Could not remove files from bucket "' + storageBucketName + '":', error.message);
            } else {
                console.log('[Storage] Successfully removed files from storage:', data);
            }
        }
    } catch (err) {
        console.error('[Storage] Error in deleteStorageAttachments:', err);
    }
}


// Health check endpoint for cloud deployment platforms (Render, Railway, AWS, etc.)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ==================== REST API ENDPOINTS ====================

// --- Authentication API ---
app.get('/api/auth/config', (req, res) => {
    res.json({
        supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
        supabaseAnonKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Server auth login error:', err);
        res.status(401).json({ error: err.message || 'Authentication failed' });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    try {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        console.error('Server auth signup error:', err);
        res.status(400).json({ error: err.message || 'Registration failed' });
    }
});

app.post('/api/auth/logout', async (req, res) => {
    try {
        await supabase.auth.signOut();
        res.json({ message: 'Logged out successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Owners API ---
app.get('/api/owners', async (req, res) => {
    const { data, error } = await supabase
        .from('owners')
        .select('*')
        .order('name', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/owners', async (req, res) => {
    const { id, name, phone, email, address, emergencycontact, created_at } = req.body;
    if (!name || !phone || !email || !address) {
        return res.status(400).json({ error: 'Required fields missing: name, phone, email, address.' });
    }

    const oId = id || 'o-' + Date.now();
    const createdDate = created_at || new Date().toISOString();

    // Check if owner already exists (upsert pattern)
    const { data: existing } = await supabase
        .from('owners')
        .select('id')
        .eq('id', oId)
        .single();

    if (existing) {
        // Update
        const { error } = await supabase
            .from('owners')
            .update({ name, phone, email, address, emergencycontact })
            .eq('id', oId);

        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: 'Owner profile updated successfully.', id: oId });
    } else {
        // Insert
        const { error } = await supabase
            .from('owners')
            .insert({ id: oId, name, phone, email, address, emergencycontact, created_at: createdDate });

        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json({ message: 'Owner profile created successfully.', id: oId });
    }
});

app.delete('/api/owners/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Query all pets belonging to this owner
        let { data: pets, error: petErr } = await supabase
            .from('pets')
            .select('id')
            .eq('ownerid', id);

        if (petErr) {
            const res2 = await supabase.from('pets').select('id').eq('ownerId', id);
            pets = res2.data;
        }

        const petIds = (pets || []).map(p => p.id);

        if (petIds.length > 0) {
            // Delete storage attachments for all treatments belonging to these pets
            try {
                let { data: ownerTreatments } = await supabase
                    .from('treatments')
                    .select('attachments')
                    .in('petid', petIds);

                if (!ownerTreatments || ownerTreatments.length === 0) {
                    const res2 = await supabase.from('treatments').select('attachments').in('petId', petIds);
                    ownerTreatments = res2.data;
                }

                if (ownerTreatments && ownerTreatments.length > 0) {
                    for (const t of ownerTreatments) {
                        if (t && t.attachments) {
                            await deleteStorageAttachments(t.attachments);
                        }
                    }
                }
            } catch (e) {
                console.warn('[Storage] Error cleaning up owner attachments:', e.message);
            }

            // Delete invoices for these pets
            await supabase.from('invoices').delete().in('petid', petIds);
            await supabase.from('invoices').delete().in('petId', petIds);

            // Delete treatments for these pets
            await supabase.from('treatments').delete().in('petid', petIds);
            await supabase.from('treatments').delete().in('petId', petIds);

            // Delete appointments for these pets
            await supabase.from('appointments').delete().in('petid', petIds);
            await supabase.from('appointments').delete().in('petId', petIds);

            // Delete vaccinations for these pets
            await supabase.from('vaccinations').delete().in('petid', petIds);

            // Delete pets
            await supabase.from('pets').delete().in('id', petIds);
        }

        // Delete owner
        const { error: ownerErr } = await supabase
            .from('owners')
            .delete()
            .eq('id', id);

        if (ownerErr) throw ownerErr;

        res.json({ message: 'Owner and all associated pets and records deleted successfully.' });
    } catch (err) {
        console.error('Error deleting owner:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Pets API ---
app.get('/api/pets', async (req, res) => {
    const { data, error } = await supabase
        .from('pets')
        .select('*')
        .order('name', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // Normalize metadata if stored in notes fallback
    const normalized = (data || []).map(p => {
        if ((!p.chip_number || !p.gender || !p.color || !p.location) && p.notes && p.notes.includes('[METADATA:')) {
            try {
                const match = p.notes.match(/\[METADATA:(.*?)\]/);
                if (match && match[1]) {
                    const meta = JSON.parse(match[1]);
                    return {
                        ...p,
                        chip_number: p.chip_number || meta.chip_number || '',
                        gender: p.gender || meta.gender || '',
                        color: p.color || meta.color || '',
                        location: p.location || meta.location || '',
                        notes: p.notes.replace(/\[METADATA:.*?\]\s*/, '')
                    };
                }
            } catch (e) {}
        }
        return p;
    });

    res.json(normalized);
});

app.post('/api/pets', async (req, res) => {
    const { id, ownerid, name, species, breed, dob, weight, vaccination, notes, chip_number, gender, color, location } = req.body;
    if (!ownerid || !name || !species || !breed || !dob || !chip_number || !color || !gender || !location) {
        return res.status(400).json({ error: 'Required fields missing: Owner, Name, Species, Breed, Date of Birth, Identification / Chip Number, Gender, Colour, and Location are mandatory.' });
    }

    const pId = id || 'p-' + Date.now();
    const parsedWeight = (weight !== undefined && weight !== null && weight !== '' && !isNaN(weight)) ? Number(weight) : null;
    const finalVaccination = vaccination || 'Unknown';

    const fullRecord = {
        ownerid,
        name,
        species,
        breed,
        dob,
        chip_number,
        gender,
        color,
        location,
        weight: parsedWeight,
        vaccination: finalVaccination,
        notes: notes || ''
    };

    const { data: existing } = await supabase
        .from('pets')
        .select('id')
        .eq('id', pId)
        .single();

    if (existing) {
        // Try update with full record (including new columns)
        let { error } = await supabase
            .from('pets')
            .update(fullRecord)
            .eq('id', pId);

        // Fallback: If Supabase schema does not have the new columns yet, embed in notes
        if (error && (error.code === 'PGRST204' || (error.message && (error.message.includes('column') || error.message.includes('schema cache'))))) {
            const meta = { chip_number, gender, color, location };
            const combinedNotes = `[METADATA:${JSON.stringify(meta)}] ${notes || ''}`.trim();
            const fallbackRecord = {
                ownerid,
                name,
                species,
                breed,
                dob,
                weight: parsedWeight,
                vaccination: finalVaccination,
                notes: combinedNotes
            };
            const fallbackRes = await supabase.from('pets').update(fallbackRecord).eq('id', pId);
            error = fallbackRes.error;
        }

        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: 'Pet profile updated successfully.', id: pId });
    } else {
        // Try insert with full record
        let { error } = await supabase
            .from('pets')
            .insert({ id: pId, ...fullRecord });

        // Fallback: If Supabase schema does not have the new columns yet, embed in notes
        if (error && (error.code === 'PGRST204' || (error.message && (error.message.includes('column') || error.message.includes('schema cache'))))) {
            const meta = { chip_number, gender, color, location };
            const combinedNotes = `[METADATA:${JSON.stringify(meta)}] ${notes || ''}`.trim();
            const fallbackRecord = {
                id: pId,
                ownerid,
                name,
                species,
                breed,
                dob,
                weight: parsedWeight,
                vaccination: finalVaccination,
                notes: combinedNotes
            };
            const fallbackRes = await supabase.from('pets').insert(fallbackRecord);
            error = fallbackRes.error;
        }

        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json({ message: 'Pet profile created successfully.', id: pId });
    }
});

app.delete('/api/pets/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Query and delete storage attachments for treatments of this pet
        try {
            let { data: petTreatments } = await supabase
                .from('treatments')
                .select('attachments')
                .eq('petid', id);

            if (!petTreatments || petTreatments.length === 0) {
                const res2 = await supabase.from('treatments').select('attachments').eq('petId', id);
                petTreatments = res2.data;
            }

            if (petTreatments && petTreatments.length > 0) {
                for (const t of petTreatments) {
                    if (t && t.attachments) {
                        await deleteStorageAttachments(t.attachments);
                    }
                }
            }
        } catch (e) {
            console.warn('[Storage] Error cleaning up pet attachments:', e.message);
        }

        // Delete all associated invoices, treatments, appointments for this pet
        await supabase.from('invoices').delete().eq('petid', id);
        await supabase.from('invoices').delete().eq('petId', id);

        await supabase.from('treatments').delete().eq('petid', id);
        await supabase.from('treatments').delete().eq('petId', id);

        await supabase.from('appointments').delete().eq('petid', id);
        await supabase.from('appointments').delete().eq('petId', id);

        await supabase.from('vaccinations').delete().eq('petid', id);

        const { error: petErr } = await supabase
            .from('pets')
            .delete()
            .eq('id', id);

        if (petErr) throw petErr;

        res.json({ message: 'Pet and all associated records deleted successfully.' });
    } catch (err) {
        console.error('Error deleting pet:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Appointments API ---
app.get('/api/appointments', async (req, res) => {
    const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date_time', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    const normalized = (data || []).map(a => ({
        ...a,
        label: a.label || 'New',
        status: a.status || 'Scheduled'
    }));

    res.json(normalized);
});

app.post('/api/appointments', async (req, res) => {
    const { id, petid, vetname, date_time, reason, status, label, outcome, outcome_notes } = req.body;
    if (!petid || !vetname || !date_time || !reason || !status) {
        return res.status(400).json({ error: 'Required fields missing.' });
    }

    const aId = id || 'a-' + Date.now();
    const finalLabel = label || 'New';

    const fullRecord = {
        petid,
        vetname,
        date_time,
        reason,
        status,
        label: finalLabel
    };
    if (outcome) fullRecord.outcome = outcome;
    if (outcome_notes) fullRecord.outcome_notes = outcome_notes;

    const { data: existing } = await supabase
        .from('appointments')
        .select('id')
        .eq('id', aId)
        .single();

    if (existing) {
        let { error } = await supabase
            .from('appointments')
            .update(fullRecord)
            .eq('id', aId);

        if (error && (error.code === 'PGRST204' || (error.message && error.message.includes('column')))) {
            const fallbackRes = await supabase
                .from('appointments')
                .update({ petid, vetname, date_time, reason, status })
                .eq('id', aId);
            error = fallbackRes.error;
        }

        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: 'Appointment updated successfully.', id: aId });
    } else {
        let { error } = await supabase
            .from('appointments')
            .insert({ id: aId, ...fullRecord });

        if (error && (error.code === 'PGRST204' || (error.message && error.message.includes('column')))) {
            const fallbackRes = await supabase
                .from('appointments')
                .insert({ id: aId, petid, vetname, date_time, reason, status });
            error = fallbackRes.error;
        }

        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json({ message: 'Appointment booked successfully.', id: aId });
    }
});

// Cancel or Complete Appointments
app.put('/api/appointments/:id/cancel', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('appointments')
        .update({ status: 'Cancelled' })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Appointment status updated to Cancelled.' });
});

app.put('/api/appointments/:id/complete', async (req, res) => {
    const { id } = req.params;
    const { status = 'Closed', outcome, outcomeNotes } = req.body || {};
    const validStatuses = ['Completed', 'Closed', 'Follow-up', 'Referred', 'Deceased'];
    const finalStatus = validStatuses.includes(status) ? status : 'Closed';

    const updatePayload = {
        status: finalStatus,
        outcome: outcome || finalStatus
    };
    if (outcomeNotes) updatePayload.outcome_notes = outcomeNotes;

    let { error } = await supabase
        .from('appointments')
        .update(updatePayload)
        .eq('id', id);

    // Fallback if outcome/outcome_notes columns are not yet in Supabase schema
    if (error && (error.code === 'PGRST204' || (error.message && error.message.includes('column')))) {
        const fallbackRes = await supabase
            .from('appointments')
            .update({ status: finalStatus })
            .eq('id', id);
        error = fallbackRes.error;
    }

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: `Appointment status updated to ${finalStatus}.`, status: finalStatus });
});

app.delete('/api/appointments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('appointments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Appointment deleted successfully.' });
    } catch (err) {
        console.error('Error deleting appointment:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Treatments API (Visit log + Automatic Invoice generation) ---
app.get('/api/treatments', async (req, res) => {
    const { data, error } = await supabase
        .from('treatments')
        .select('*')
        .order('date_time', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.post('/api/treatments', async (req, res) => {
    const { id, appointmentid, petid, date_time, symptoms, diagnosis, medications, vaccinegiven, cost, notes, payment_status, payment_method, attachments } = req.body;
    if (!petid || !date_time || !symptoms || !diagnosis || isNaN(cost)) {
        return res.status(400).json({ error: 'Required fields missing or invalid.' });
    }

    const tId = id || 't-' + Date.now();

    // Invoicing calculations
    const baseConsultation = 50.00;
    const medsCost = vaccinegiven ? 25.00 : (medications ? 15.00 : 0.00);
    const subtotal = baseConsultation + medsCost + Number(cost);
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    try {
        const { data: existingTreatment } = await supabase
            .from('treatments')
            .select('id')
            .eq('id', tId)
            .single();

        if (existingTreatment) {
            // Update treatment
            const treatmentBase = { appointmentid, petid, date_time, symptoms, diagnosis, medications, vaccinegiven, cost, notes };
            const treatmentWithAtt = { ...treatmentBase, attachments: attachments || [] };
            let updateRes = await supabase.from('treatments').update(treatmentWithAtt).eq('id', tId);
            if (updateRes.error && String(updateRes.error.message || '').includes('attachments')) {
                console.warn('[NOTICE] Supabase treatments table missing "attachments" column. Please run SQL migration.');
                updateRes = await supabase.from('treatments').update(treatmentBase).eq('id', tId);
            }
            if (updateRes.error) throw updateRes.error;


            // Update associated invoice (recalculates fees)
            const invUpdateData = { petid, date_time, treatmentcost: cost, medicinecost: medsCost, tax, total, reason: diagnosis };
            if (payment_status) {
                invUpdateData.status = payment_status;
                invUpdateData.paymentmethod = payment_method || (payment_status === 'Pending' ? 'Pending' : 'Card');
            }
            const { error: iErr } = await supabase
                .from('invoices')
                .update(invUpdateData)
                .eq('treatmentid', tId);

            if (iErr) throw iErr;
        } else {
            // Insert treatment
            const treatmentBase = { appointmentid, petid, date_time, symptoms, diagnosis, medications, vaccinegiven, cost, notes };
            const treatmentWithAtt = { ...treatmentBase, attachments: attachments || [] };
            let insertRes = await supabase.from('treatments').insert({ id: tId, ...treatmentWithAtt });
            if (insertRes.error && String(insertRes.error.message || '').includes('attachments')) {
                console.warn('[NOTICE] Supabase treatments table missing "attachments" column. Please run SQL migration.');
                insertRes = await supabase.from('treatments').insert({ id: tId, ...treatmentBase });
            }
            if (insertRes.error) throw insertRes.error;


            // Insert new invoice (defaulting to Paid unless specified)
            const invId = 'INV-' + (Math.floor(Math.random() * 9000) + 1000);
            const finalStatus = payment_status || 'Paid';
            const finalMethod = payment_method || (finalStatus === 'Pending' ? 'Pending' : 'Card');
            const { error: iErr } = await supabase
                .from('invoices')
                .insert({
                    id: invId,
                    treatmentid: tId,
                    petid,
                    date_time,
                    consultationfee: baseConsultation,
                    treatmentcost: cost,
                    medicinecost: medsCost,
                    tax,
                    total,
                    status: finalStatus,
                    paymentmethod: finalMethod,
                    reason: diagnosis
                });

            if (iErr) throw iErr;
        }

        // If vaccine administered, update pet vaccination status automatically
        if (vaccinegiven) {
            const { error: pErr } = await supabase
                .from('pets')
                .update({ vaccination: 'Up-to-date' })
                .eq('id', petid);

            if (pErr) throw pErr;
        }

        res.status(201).json({ message: 'Clinical treatment saved and invoice registered.', id: tId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/treatments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Query treatment to delete its storage attachments from bucket
        try {
            const { data: treatment } = await supabase
                .from('treatments')
                .select('attachments')
                .eq('id', id)
                .maybeSingle();

            if (treatment && treatment.attachments) {
                await deleteStorageAttachments(treatment.attachments);
            }
        } catch (e) {
            console.warn('[Storage] Error querying treatment attachments:', e.message);
        }

        // Delete associated invoice if any
        await supabase.from('invoices').delete().eq('treatmentid', id);
        await supabase.from('invoices').delete().eq('treatmentId', id);

        const { error } = await supabase
            .from('treatments')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Treatment record and associated invoice deleted successfully.' });
    } catch (err) {
        console.error('Error deleting treatment:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Invoices API ---
app.get('/api/invoices', async (req, res) => {
    const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('date_time', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.put('/api/invoices/:id/pay', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('invoices')
        .update({ status: 'Paid', paymentmethod: 'Card' })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: `Invoice ${id} payment recorded.` });
});

app.delete('/api/invoices/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('invoices')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Invoice deleted successfully.' });
    } catch (err) {
        console.error('Error deleting invoice:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- Vaccinations & Deworming API ---
app.get('/api/vaccinations', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('vaccinations')
            .select('*')
            .order('due_date', { ascending: true });

        if (error) {
            // Graceful fallback if table not yet created on Supabase
            return res.json([]);
        }
        res.json(data || []);
    } catch (err) {
        res.json([]);
    }
});

app.post('/api/vaccinations', async (req, res) => {
    const {
        id,
        petid,
        type = 'Vaccination',
        name,
        label = 'Primary',
        frequency = 'Annual',
        custom_interval_days,
        due_date,
        administered_date,
        status = 'Scheduled',
        vetname,
        batch_number,
        notes
    } = req.body;

    if (!petid || !name || !due_date) {
        return res.status(400).json({ error: 'Required fields missing: pet, name, and due date are mandatory.' });
    }

    const vId = id || 'v-' + Date.now();
    const parsedCustomDays = (custom_interval_days !== undefined && custom_interval_days !== null && custom_interval_days !== '' && !isNaN(custom_interval_days))
        ? parseInt(custom_interval_days, 10)
        : null;

    const record = {
        petid,
        type,
        name,
        label,
        frequency,
        custom_interval_days: parsedCustomDays,
        due_date,
        administered_date: administered_date || null,
        status,
        vetname: vetname || null,
        batch_number: batch_number || null,
        notes: notes || null
    };

    try {
        const { data: existing } = await supabase
            .from('vaccinations')
            .select('id')
            .eq('id', vId)
            .single();

        if (existing) {
            const { error } = await supabase
                .from('vaccinations')
                .update(record)
                .eq('id', vId);

            if (error) throw error;
            res.json({ message: 'Record updated successfully.', id: vId });
        } else {
            const { error } = await supabase
                .from('vaccinations')
                .insert({ id: vId, ...record });

            if (error) throw error;
            res.status(201).json({ message: 'Dose scheduled successfully.', id: vId });
        }
    } catch (err) {
        console.error('Error saving vaccination/deworming record:', err);
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/vaccinations/:id/administer', async (req, res) => {
    const { id } = req.params;
    const { administered_date = new Date().toISOString().split('T')[0], vetname, batch_number } = req.body || {};
    try {
        const updatePayload = {
            status: 'Administered',
            administered_date
        };
        if (vetname) updatePayload.vetname = vetname;
        if (batch_number) updatePayload.batch_number = batch_number;

        const { error } = await supabase
            .from('vaccinations')
            .update(updatePayload)
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Dose marked as administered.', id });
    } catch (err) {
        console.error('Error updating dose administration:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/vaccinations/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('vaccinations')
            .delete()
            .eq('id', id);

        if (error) throw error;
        res.json({ message: 'Record deleted successfully.' });
    } catch (err) {
        console.error('Error deleting vaccination record:', err);
        res.status(500).json({ error: err.message });
    }
});

// ==================== STATIC FRONTEND SERVING ====================
// Serve built production files from /dist if available, otherwise serve project root
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
} else {
    app.use(express.static(__dirname));
}

// Single-page application (SPA) client-side routing fallback
app.use((req, res) => {
    // If it's an API route that didn't match any handler, return 404 JSON
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    const htmlPath = fs.existsSync(path.join(distPath, 'index.html'))
        ? path.join(distPath, 'index.html')
        : path.join(__dirname, 'index.html');
    res.sendFile(htmlPath);
});

// Start Express Server
app.listen(PORT, HOST, () => {
    console.log(`VetiCare Server running on http://${HOST}:${PORT}`);
});
