const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs/promises');
const path = require('path');

const app = express();
const PORT = 3000;

// --- DEFINISI PATH DIREKTORI ---
const PUBLIC_DIR = path.join(__dirname, 'public'); 
const DATA_DIR = path.join(__dirname, 'data'); 

// --- DEFINISI PATH FILE JSON ---
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json');
const CONTACTS_FILE = path.join(DATA_DIR, 'contacts.json');

// --- Konfigurasi Middleware ---

app.use(express.static(PUBLIC_DIR));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware CORS (Wajib untuk komunikasi antara frontend dan backend)
app.use((req, res, next) => {
    // Mengizinkan semua domain, dan semua metode CRUD
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// -----------------------------------------------------------------
// --- FUNGSI HELPER UNTUK KETAHANAN FILE (READ/WRITE JSON) ---
// -----------------------------------------------------------------

async function writeData(filePath, data) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

async function readData(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        if (!data || data.trim() === '') {
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT' || error instanceof SyntaxError) {
            console.warn(`[DATA WARNING] File ${path.basename(filePath)} tidak ditemukan atau JSON tidak valid. Membuat file baru.`);
            await writeData(filePath, []);
            return [];
        }
        throw error;
    }
}

// Helper untuk menemukan file berdasarkan resource
function getFilePath(resource) {
    switch (resource) {
        case 'users': return USERS_FILE;
        case 'bookings': return BOOKINGS_FILE;
        case 'contacts': return CONTACTS_FILE;
        default: return null;
    }
}

// ---------------------------------------------
// --- AUTHENTICATION & PROFILE MANAGEMENT ---
// ---------------------------------------------

// API 1: Pendaftaran Pengguna Baru
app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body; 
    if (!name || !email || !password) return res.status(400).json({ message: 'Semua bidang wajib diisi.' });

    try {
        const users = await readData(USERS_FILE);
        if (users.find(user => user.email === email)) return res.status(409).json({ message: 'Email sudah terdaftar. Silakan login.' });

        const newId = users.length > 0 ? Math.max(...users.map(u => u.id || 0)) + 1 : 101;
        // Memberikan role 'user' default
        const newUser = { id: newId, name, email, password, role: 'user', date: new Date().toLocaleDateString('id-ID') };

        users.push(newUser);
        await writeData(USERS_FILE, users); 

        res.status(201).json({ message: 'Pendaftaran berhasil! Silakan masuk.', user: { name, email, role: 'user' } });

    } catch (error) {
        console.error('Error saat pendaftaran (500):', error);
        res.status(500).json({ message: 'Gagal menulis data ke server.' });
    }
});

// API 2: Login Terpadu (Pengguna BIASA dan ADMIN)
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email dan password wajib diisi.' });

    try {
        const users = await readData(USERS_FILE);
        const user = users.find(u => u.email === email && u.password === password);
        
        if (!user) return res.status(401).json({ message: 'Email atau password salah.' });
        
        // Login berhasil: Mengembalikan role
        res.status(200).json({ 
            message: `Selamat datang, ${user.name}!`, 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: user.role || 'user'
            } 
        });
    } catch (error) { 
        console.error('Error saat login:', error);
        res.status(500).json({ message: 'Server error saat memproses login.' }); 
    }
});


// API 3: Ganti Password Pengguna
app.post('/change-password', async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;
    
    if (!email || !oldPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Semua kolom password wajib diisi.' });
    }

    try {
        const users = await readData(USERS_FILE);
        const userIndex = users.findIndex(u => u.email === email);

        if (userIndex === -1) {
            return res.status(404).json({ success: false, message: 'Pengguna tidak ditemukan.' });
        }
        
        if (users[userIndex].password !== oldPassword) {
            return res.status(401).json({ success: false, message: 'Password lama salah. Coba lagi.' });
        }

        users[userIndex].password = newPassword;
        await writeData(USERS_FILE, users);

        res.status(200).json({ success: true, message: 'Password berhasil diperbarui! Anda akan diminta login ulang.' });

    } catch (error) {
        console.error('Error saat ganti password:', error);
        res.status(500).json({ success: false, message: 'Server error saat memperbarui password.' });
    }
});


// ---------------------------------------------
// --- FORM SUBMISSIONS (POST) ---
// ---------------------------------------------

// API 4: Pengiriman Form Booking
app.post('/submit-booking', async (req, res) => {
    const { bookingName: name, bookingEmail: email, bookingPhone: phone, bookingService: service, bookingDate: date, bookingTime: time, bookingMessage: message } = req.body;
    
    if (!name || !email || !service || !date || !time) return res.status(400).json({ message: 'Data booking tidak lengkap.' });
    
    try {
        const bookings = await readData(BOOKINGS_FILE);
        const newId = bookings.length > 0 ? Math.max(...bookings.map(d => d.id || 0)) + 1 : 1;
        const newBooking = { id: newId, name, email, phone, service, date, time, message, timestamp: new Date().toISOString(), status: 'Tertunda' };
        bookings.push(newBooking);
        await writeData(BOOKINGS_FILE, bookings); 
        res.status(200).json({ message: 'Janji temu berhasil dikirim. Menunggu konfirmasi!' });
    } catch (error) { 
        console.error('Error saat submit booking:', error);
        res.status(500).json({ message: 'Gagal menyimpan janji temu.' }); 
    }
});

// API 5: Pengiriman Form Kontak
app.post('/submit-contact', async (req, res) => {
    const { contactName: name, contactEmail: email, contactSubject: subject, contactMessage: message } = req.body;
    
    if (!name || !email || !subject || !message) return res.status(400).json({ message: 'Data kontak tidak lengkap.' });
    
    try {
        const contacts = await readData(CONTACTS_FILE);
        const newId = contacts.length > 0 ? Math.max(...contacts.map(d => d.id || 0)) + 1 : 1;
        const newContact = { id: newId, name, email, subject, message, timestamp: new Date().toISOString(), status: 'Baru' };
        contacts.push(newContact);
        await writeData(CONTACTS_FILE, contacts); 
        res.status(200).json({ message: 'Pesan Anda berhasil terkirim. Kami akan merespon segera.' });
    } catch (error) { 
        console.error('Error saat submit contact:', error);
        res.status(500).json({ message: 'Gagal menyimpan pesan kontak.' }); 
    }
});


// -------------------------------------------------------------
// --- CRUD API UNTUK MANAJEMEN DASHBOARD ADMIN (GET, POST, PUT, DELETE) ---
// -----------------------------------------------------------------

// API GET All /api/:resource (digunakan oleh dashboard user dan admin)
app.get('/api/:resource', async (req, res) => {
    const resource = req.params.resource;
    const filePath = getFilePath(resource);
    if (!filePath) return res.status(404).json({ message: 'Resource tidak ditemukan.' });
    
    try {
        let data = await readData(filePath);
        if (resource === 'users') {
            // Sembunyikan password saat mengirim data users ke frontend
            data = data.map(({ password, ...user }) => user);
        }
        res.json(data);
    } catch (e) {
        res.status(500).json({ message: `Gagal mengambil data ${resource}.` }); 
    }
});

// API CREATE (Menambahkan data baru - khusus Admin)
app.post('/api/:resource', async (req, res) => {
    const resource = req.params.resource;
    const filePath = getFilePath(resource);
    if (!filePath) return res.status(404).json({ message: 'Resource tidak ditemukan.' });

    try {
        const data = await readData(filePath);
        const newId = data.length > 0 ? Math.max(...data.map(d => d.id || 0)) + 1 : 1;
        
        let newItem = { id: newId, ...req.body };

        if (resource === 'users' && !newItem.role) newItem.role = 'user';
        if (resource === 'bookings' && !newItem.status) newItem.status = 'Tertunda';
        
        data.push(newItem);
        await writeData(filePath, data);

        // Jika user baru, hapus password untuk respons
        if (resource === 'users' && newItem.password) delete newItem.password;

        res.status(201).json({ message: `${resource} berhasil ditambahkan!`, item: newItem });

    } catch (e) {
        res.status(500).json({ message: `Gagal menambahkan data ${resource}.` }); 
    }
});

// API UPDATE (Mengubah data yang sudah ada - khusus Admin)
app.put('/api/:resource/:id', async (req, res) => {
    const resource = req.params.resource;
    const id = parseInt(req.params.id);
    const filePath = getFilePath(resource);
    if (!filePath) return res.status(404).json({ message: 'Resource tidak ditemukan.' });

    try {
        const data = await readData(filePath);
        const index = data.findIndex(d => d.id === id);
        
        if (index === -1) return res.status(404).json({ message: 'Data ID tidak ditemukan.' });

        // Gabungkan data lama dan baru, pertahankan ID
        const updatedItem = { ...data[index], ...req.body, id }; 
        data[index] = updatedItem;
        
        await writeData(filePath, data);

        // Hapus password dari respons sebelum dikirim
        if (resource === 'users' && updatedItem.password) delete updatedItem.password;

        res.status(200).json({ message: `${resource} ID ${id} berhasil diperbarui.`, item: updatedItem });

    } catch (e) {
        res.status(500).json({ message: `Gagal memperbarui data ${resource}.` }); 
    }
});

// API DELETE (Menghapus data - khusus Admin)
app.delete('/api/:resource/:id', async (req, res) => {
    const resource = req.params.resource;
    const id = parseInt(req.params.id);
    const filePath = getFilePath(resource);
    if (!filePath) return res.status(404).json({ message: 'Resource tidak ditemukan.' });

    try {
        let data = await readData(filePath);
        const initialLength = data.length;
        
        data = data.filter(d => d.id !== id);
        
        if (data.length === initialLength) return res.status(404).json({ message: 'Data ID tidak ditemukan.' });

        await writeData(filePath, data);

        res.status(200).json({ message: `${resource} ID ${id} berhasil dihapus.` });

    } catch (e) {
        res.status(500).json({ message: `Gagal menghapus data ${resource}.` }); 
    }
});


// --- Rute Default ---
app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'register.html'));
});


// --- Jalankan Server ---
app.listen(PORT, () => {
    console.log(`Server Anita Salon berjalan di http://localhost:${PORT} /admin@anitasalon.com / pw: asd12345`) ;
    console.log(`Login: http://localhost:${PORT}/login.html`);
});