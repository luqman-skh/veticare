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
const PORT = process.env.PORT || 3000;
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

// Health check endpoint for cloud deployment platforms (Render, Railway, AWS, etc.)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ==================== REST API ENDPOINTS ====================

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
            // Delete invoices for these pets
            await supabase.from('invoices').delete().in('petid', petIds);
            await supabase.from('invoices').delete().in('petId', petIds);

            // Delete treatments for these pets
            await supabase.from('treatments').delete().in('petid', petIds);
            await supabase.from('treatments').delete().in('petId', petIds);

            // Delete appointments for these pets
            await supabase.from('appointments').delete().in('petid', petIds);
            await supabase.from('appointments').delete().in('petId', petIds);

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
    res.json(data);
});

app.post('/api/pets', async (req, res) => {
    const { id, ownerid, name, species, breed, dob, weight, vaccination, notes } = req.body;
    if (!ownerid || !name || !species || !breed || !dob || isNaN(weight)) {
        return res.status(400).json({ error: 'Required fields missing or invalid.' });
    }

    const pId = id || 'p-' + Date.now();

    const { data: existing } = await supabase
        .from('pets')
        .select('id')
        .eq('id', pId)
        .single();

    if (existing) {
        // Update
        const { error } = await supabase
            .from('pets')
            .update({ ownerid, name, species, breed, dob, weight, vaccination, notes })
            .eq('id', pId);

        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: 'Pet profile updated successfully.', id: pId });
    } else {
        // Insert
        const { error } = await supabase
            .from('pets')
            .insert({ id: pId, ownerid, name, species, breed, dob, weight, vaccination, notes });

        if (error) return res.status(500).json({ error: error.message });
        res.status(201).json({ message: 'Pet profile created successfully.', id: pId });
    }
});

app.delete('/api/pets/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Delete all associated invoices, treatments, appointments for this pet
        await supabase.from('invoices').delete().eq('petid', id);
        await supabase.from('invoices').delete().eq('petId', id);

        await supabase.from('treatments').delete().eq('petid', id);
        await supabase.from('treatments').delete().eq('petId', id);

        await supabase.from('appointments').delete().eq('petid', id);
        await supabase.from('appointments').delete().eq('petId', id);

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
    res.json(data);
});

app.post('/api/appointments', async (req, res) => {
    const { id, petid, vetname, date_time, reason, status } = req.body;
    if (!petid || !vetname || !date_time || !reason || !status) {
        return res.status(400).json({ error: 'Required fields missing.' });
    }

    const aId = id || 'a-' + Date.now();

    const { data: existing } = await supabase
        .from('appointments')
        .select('id')
        .eq('id', aId)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('appointments')
            .update({ petid, vetname, date_time, reason, status })
            .eq('id', aId);

        if (error) return res.status(500).json({ error: error.message });
        res.json({ message: 'Appointment updated successfully.', id: aId });
    } else {
        const { error } = await supabase
            .from('appointments')
            .insert({ id: aId, petid, vetname, date_time, reason, status });

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
    const { error } = await supabase
        .from('appointments')
        .update({ status: 'Completed' })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Appointment status updated to Completed.' });
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
    const { id, appointmentId, petid, date_time, symptoms, diagnosis, medications, vaccineGiven, cost, notes } = req.body;
    if (!petid || !date_time || !symptoms || !diagnosis || isNaN(cost)) {
        return res.status(400).json({ error: 'Required fields missing or invalid.' });
    }

    const tId = id || 't-' + Date.now();

    // Invoicing calculations
    const baseConsultation = 50.00;
    const medsCost = vaccineGiven ? 25.00 : (medications ? 15.00 : 0.00);
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
            const { error: tErr } = await supabase
                .from('treatments')
                .update({ appointmentId, petid, date_time, symptoms, diagnosis, medications, vaccineGiven, cost, notes })
                .eq('id', tId);

            if (tErr) throw tErr;

            // Update associated invoice (recalculates fees)
            const { error: iErr } = await supabase
                .from('invoices')
                .update({ petid, date_time, treatmentCost: cost, medicineCost: medsCost, tax, total, reason: diagnosis })
                .eq('treatmentId', tId);

            if (iErr) throw iErr;
        } else {
            // Insert treatment
            const { error: tErr } = await supabase
                .from('treatments')
                .insert({ id: tId, appointmentId, petid, date_time, symptoms, diagnosis, medications, vaccineGiven, cost, notes });

            if (tErr) throw tErr;

            // Insert new pending invoice
            const invId = 'INV-' + (Math.floor(Math.random() * 9000) + 1000);
            const { error: iErr } = await supabase
                .from('invoices')
                .insert({
                    id: invId,
                    treatmentId: tId,
                    petid,
                    date_time,
                    consultationFee: baseConsultation,
                    treatmentCost: cost,
                    medicineCost: medsCost,
                    tax,
                    total,
                    status: 'Pending',
                    paymentMethod: 'Pending',
                    reason: diagnosis
                });

            if (iErr) throw iErr;
        }

        // If vaccine administered, update pet vaccination status automatically
        if (vaccineGiven) {
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
        // Delete associated invoice if any
        await supabase.from('invoices').delete().eq('treatmentId', id);
        await supabase.from('invoices').delete().eq('treatmentid', id);

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
        .update({ status: 'Paid', paymentMethod: 'Card' })
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
