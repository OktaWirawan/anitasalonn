// scripts.js
// Script ini menangani SEMUA: Submission Formulir, Otentikasi, dan Logika Dashboard Pengguna.

const API_BASE_URL = 'http://localhost:3000/api';

// --- ELEMENT GLOBAL ---
const userDashboardSection = document.getElementById('user-profile-dashboard');
const dashboardLink = document.getElementById('profileDashboardLink');
const logoutLink = document.getElementById('logoutPlaceholder');
const profileContainer = document.getElementById('profileContainer'); 
const authButtons = document.getElementById('authButtons');           
const userNameDisplay = document.getElementById('userNameDisplay');
const userEmailDisplay = document.getElementById('userEmailDisplay');

// --- MODERN NOTIFICATION SYSTEM ---
function showNotification(type, title, message) {
    const colors = {
        success: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        error: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        warning: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
        info: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
    };

    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'modern-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        min-width: 320px;
        max-width: 420px;
        background: ${colors[type]};
        color: white;
        padding: 20px 24px;
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        display: flex;
        align-items: flex-start;
        gap: 16px;
        z-index: 10000;
        animation: slideInRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        backdrop-filter: blur(10px);
    `;

    notification.innerHTML = `
        <div style="
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.3);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            font-weight: bold;
            flex-shrink: 0;
        ">${icons[type]}</div>
        <div style="flex: 1;">
            <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${title}</div>
            <div style="font-size: 14px; opacity: 0.95; line-height: 1.5;">${message}</div>
        </div>
        <button onclick="this.parentElement.remove()" style="
            background: rgba(255,255,255,0.3);
            border: none;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            cursor: pointer;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.5)'" onmouseout="this.style.background='rgba(255,255,255,0.3)'">×</button>
    `;

    // Add animation styles
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)';
        setTimeout(() => notification.remove(), 400);
    }, 5000);
}

// --- FUNGSI UTILITY: FETCH DATA DENGAN PEMFILTERAN EMAIL OTOMATIS ---
async function fetchData(resource) {
    const loggedInUserEmail = localStorage.getItem('loggedInUserEmail'); 
    if (!loggedInUserEmail) return [];
    
    try {
        const response = await fetch(`${API_BASE_URL}/${resource}?email=${loggedInUserEmail}`);
        if (!response.ok) throw new Error(`Gagal mengambil data ${resource}.`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${resource}:`, error);
        if (error.message.includes('fetch')) {
            showNotification('error', 'Error Koneksi', 'Gagal terhubung ke server data. Pastikan JSON Server berjalan.');
        }
        return []; 
    }
}

// ---------------------------------------------------------------------
// --- AUTHENTICATION & PROFILE DISPLAY LOGIC ---
// ---------------------------------------------------------------------

async function updateAuthDisplay() {
    const loggedInUserEmail = localStorage.getItem('loggedInUserEmail');
    
    if (!loggedInUserEmail || loggedInUserEmail === 'null') {
        if (profileContainer) profileContainer.style.display = 'none';
        if (authButtons) authButtons.style.display = 'flex'; 
        return;
    }

    try {
        const allUsers = await fetch(`${API_BASE_URL}/users`).then(res => res.json());
        const user = allUsers.find(u => u.email === loggedInUserEmail);

        if (user) {
            localStorage.setItem('userRole', user.role); // Simpan role ke localStorage
            
            if (user.role === 'admin') {
                showNotification('warning', 'Akses Dialihkan', 'Anda masuk sebagai Admin dan dialihkan ke Panel Admin.');
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 1500);
                return;
            }

            if (profileContainer) profileContainer.style.display = 'flex';
            if (authButtons) authButtons.style.display = 'none';
            if (userNameDisplay) userNameDisplay.textContent = user.name.split(' ')[0];
            if (userEmailDisplay) userEmailDisplay.textContent = user.email;
            
        } else {
            handleLogout({ preventDefault: () => {} });
        }

    } catch (error) {
        // Fallback display jika API gagal tapi email ada di localStorage
        if (profileContainer) profileContainer.style.display = 'flex';
        if (authButtons) authButtons.style.display = 'none';
        if (userNameDisplay) userNameDisplay.textContent = loggedInUserEmail.split('@')[0];
        if (userEmailDisplay) userEmailDisplay.textContent = loggedInUserEmail;
    }
}

// ---------------------------------------------------------------------
// --- DASHBOARD LOGIC: MEMUAT RIWAYAT PENGGUNA ---
// ---------------------------------------------------------------------

async function loadUserProfileData() {
    const loggedInUserEmail = localStorage.getItem('loggedInUserEmail');
    if (!loggedInUserEmail) return; 
    
    // Pengecekan peran admin (walaupun seharusnya sudah dilakukan di updateAuthDisplay)
    try {
        const userRole = localStorage.getItem('userRole');
        if (userRole === 'admin') {
             window.location.href = 'admin.html';
             return;
        }
    } catch (e) { /* ignore */ }

    const bookingList = document.getElementById('userBookingHistory');
    const contactList = document.getElementById('userContactHistory'); // ID yang digunakan di HTML yang diperbarui

    if(bookingList) bookingList.innerHTML = '<li class="list-group-item text-center text-muted"><i class="fas fa-sync fa-spin me-2"></i> Memuat Janji Temu...</li>';
    if(contactList) contactList.innerHTML = '<li class="list-group-item text-center text-muted"><i class="fas fa-sync fa-spin me-2"></i> Memuat Pesan Kontak...</li>';

    const userBookings = await fetchData('bookings');
    const userContacts = await fetchData('contacts');

    // RIWAYAT JANJI TEMU
    if (bookingList) {
        if (userBookings.length === 0) {
            bookingList.innerHTML = '<li class="list-group-item text-center text-info">Anda belum memiliki janji temu yang tercatat.</li>';
        } else {
            // Urutkan berdasarkan tanggal/waktu terbaru
            userBookings.sort((a, b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`));
            
            bookingList.innerHTML = userBookings.map(b => {
                let statusClass = 'bg-secondary';
                if (b.status === 'Dikonfirmasi') {
                    statusClass = 'bg-success';
                } else if (b.status === 'Tertunda') {
                    statusClass = 'bg-warning text-dark';
                } else if (b.status === 'Dibatalkan') {
                    statusClass = 'bg-danger';
                } else if (b.status === 'Selesai') {
                    statusClass = 'bg-info';
                }

                return `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${b.service.replace(/-/g, ' ').toUpperCase()}</strong>
                            <div class="text-muted small">${b.date} @ ${b.time}</div>
                        </div>
                        <span class="badge ${statusClass}">${b.status || 'Tertunda'}</span>
                    </li>
                `;
            }).join('');
        }
    }

    // RIWAYAT PESAN KONTAK
    if (contactList) {
        if (userContacts.length === 0) {
            contactList.innerHTML = '<li class="list-group-item text-center text-info">Anda belum mengirim pesan kontak.</li>';
        } else {
            // Urutkan berdasarkan timestamp terbaru
             userContacts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
             
            contactList.innerHTML = userContacts.map(c => `
                <li class="list-group-item">
                    <div class="fw-bold">${c.subject}</div>
                    <div class="text-muted small">${c.message.substring(0, 70)}${c.message.length > 70 ? '...' : ''}</div>
                    <span class="badge bg-secondary float-end">${new Date(c.timestamp).toLocaleDateString('id-ID')}</span>
                </li>
            `).join('');
        }
    }
}

// ---------------------------------------------------------------------
// --- NAVIGASI DAN EVENT HANDLERS ---
// ---------------------------------------------------------------------

function handleDashboardClick(e) {
    const loggedInUserEmail = localStorage.getItem('loggedInUserEmail');
    if (userDashboardSection && loggedInUserEmail) {
        e.preventDefault(); 
        
        const userRole = localStorage.getItem('userRole'); 
        if (userRole === 'admin') {
            window.location.href = 'admin.html';
            return;
        }
        
        // Sembunyikan semua section di homepage
        document.querySelectorAll('body > section, body > footer').forEach(sec => {
            if (sec.id !== 'user-profile-dashboard' && !sec.classList.contains('modal')) { 
                sec.style.display = 'none';
            }
        }); 

        userDashboardSection.style.display = 'block'; 
        loadUserProfileData(); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (e) {
        e.preventDefault();
        showNotification('warning', 'Akses Ditolak', 'Anda harus login untuk mengakses dashboard.');
    }
}

function showHomeSections() {
    // Tampilkan kembali semua section homepage
    document.querySelectorAll('body > section:not(#user-profile-dashboard), body > footer').forEach(sec => {
        if (!sec.classList.contains('modal')) {
            sec.style.display = 'block';
        }
    });
    if (userDashboardSection) userDashboardSection.style.display = 'none';
}

function handleLogout(e) {
    if (e && e.preventDefault) e.preventDefault(); 
    localStorage.removeItem('loggedInUserEmail');
    localStorage.removeItem('userRole');
    window.location.href = 'login.html'; 
}

document.addEventListener('DOMContentLoaded', () => {
    
    updateAuthDisplay(); 
    
    // =========================================================================
    // 1. HANDLE FORM SUBMISSIONS (BOOKING)
    // =========================================================================
    document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const bookingServiceElement = document.getElementById('bookingService');
        const bookingDate = document.getElementById('bookingDate').value;
        const bookingTime = document.getElementById('bookingTime').value;
        const loggedInUserEmail = localStorage.getItem('loggedInUserEmail');
        const submittedEmail = document.getElementById('bookingEmail').value;

        // Validasi Ketersediaan Data
        if (bookingServiceElement.value === "" || bookingServiceElement.disabled) {
            showNotification('warning', 'Peringatan', 'Mohon pilih layanan yang valid.');
            return;
        }
        if (!bookingDate || !bookingTime) {
             showNotification('error', 'Validasi Gagal', 'Tanggal dan Waktu Janji Temu harus diisi.');
             return;
        }
         if (!loggedInUserEmail && submittedEmail.trim() === '') {
            showNotification('error', 'Validasi Gagal', 'Alamat Email harus diisi.');
            return;
        }

        const payload = {
            name: document.getElementById('bookingName').value,
            // PERBAIKAN: Gunakan email dari localStorage jika login, jika tidak, gunakan form
            email: loggedInUserEmail || submittedEmail, 
            phone: document.getElementById('bookingPhone').value,
            service: bookingServiceElement.value,
            date: bookingDate,
            time: bookingTime,
            message: document.getElementById('bookingMessage').value,
            status: "Tertunda", 
            timestamp: new Date().toISOString()
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/bookings`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload), 
            });
            
            if (!response.ok) {
                 const errorBody = await response.json();
                 throw new Error(errorBody.message || `Gagal mengirim data. Status: ${response.status}`);
            }
            
            showNotification('success', 'Janji Temu Terkirim!', 'Permintaan janji temu Anda telah diterima. Mohon tunggu konfirmasi dari Admin.');
            e.target.reset();

        } catch (error) { 
            console.error('Error saat submit booking:', error);
            showNotification('error', 'Koneksi Gagal!', `Terjadi kesalahan: ${error.message}. Pastikan server backend berjalan.`);
        }
    });

    // =========================================================================
    // 2. HANDLE FORM SUBMISSIONS (CONTACT)
    // =========================================================================
    document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const loggedInUserEmail = localStorage.getItem('loggedInUserEmail');
        const submittedEmail = document.getElementById('contactEmail').value;

        // Validasi Email
        if (!loggedInUserEmail && submittedEmail.trim() === '') {
            showNotification('error', 'Validasi Gagal', 'Alamat Email harus diisi.');
            return;
        }
        
        const payload = {
            name: document.getElementById('contactName').value,
            // PERBAIKAN: Gunakan email dari localStorage jika login, jika tidak, gunakan form
            email: loggedInUserEmail || submittedEmail, 
            subject: document.getElementById('contactSubject').value,
            message: document.getElementById('contactMessage').value,
            timestamp: new Date().toISOString()
        };
        
        try {
            const response = await fetch(`${API_BASE_URL}/contacts`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify(payload), 
            });

            if (!response.ok) {
                 const errorBody = await response.json();
                 throw new Error(errorBody.message || `Gagal mengirim data. Status: ${response.status}`);
            }
            
            showNotification('success', 'Pesan Terkirim!', 'Pesan Anda telah berhasil dikirim. Kami akan membalas secepatnya.');
            e.target.reset();
        } catch (error) { 
            console.error('Error saat submit contact:', error);
            showNotification('error', 'Koneksi Gagal!', `Terjadi kesalahan: ${error.message}. Pastikan server backend berjalan.`);
        }
    });
    
    // =========================================================================
    // 3. HANDLE FORM SUBMISSIONS (CHANGE PASSWORD - PENAMBAHAN BARU)
    // =========================================================================
    document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const oldPassword = document.getElementById('oldPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        const loggedInUserEmail = localStorage.getItem('loggedInUserEmail');

        if (newPassword !== confirmNewPassword) {
            showNotification('error', 'Gagal!', 'Konfirmasi kata sandi baru tidak cocok.');
            return;
        }
        
        if (newPassword.length < 6) {
            showNotification('warning', 'Peringatan', 'Kata sandi baru minimal 6 karakter.');
            return;
        }
        
        if (!loggedInUserEmail) {
            showNotification('error', 'Gagal!', 'Anda harus login untuk mengubah password.');
            return;
        }

        try {
            // Ambil data user untuk verifikasi password lama
            const response = await fetch(`${API_BASE_URL}/users?email=${loggedInUserEmail}`);
            const users = await response.json();
            const user = users.find(u => u.email === loggedInUserEmail);

            if (!user || user.password !== oldPassword) {
                showNotification('error', 'Gagal!', 'Kata sandi lama salah atau pengguna tidak ditemukan.');
                return;
            }

            // Update password
            const updateResponse = await fetch(`${API_BASE_URL}/users/${user.id}`, {
                method: 'PATCH', 
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: newPassword }),
            });

            if (!updateResponse.ok) throw new Error(`Gagal memperbarui password. Status: ${updateResponse.status}`);

            showNotification('success', 'Sukses!', 'Kata sandi Anda telah berhasil diubah.');
            e.target.reset();
            
            // Tutup modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('settingsModal'));
            if (modal) modal.hide();

        } catch (error) {
            console.error('Error saat ganti password:', error);
            showNotification('error', 'Koneksi Gagal!', `Terjadi kesalahan: ${error.message}. Pastikan server backend berjalan.`);
        }
    });


    // =========================================================================
    // 4. AUTO-FILL FORMS FOR LOGGED-IN USERS
    // =========================================================================

    const loggedInUserEmail = localStorage.getItem('loggedInUserEmail');
    if (loggedInUserEmail) {
        fetch(`${API_BASE_URL}/users?email=${loggedInUserEmail}`)
            .then(res => res.json())
            .then(users => {
                if (users.length > 0) {
                    const user = users[0];
                    
                    // Isi Otomatis Form Booking
                    const bookingName = document.getElementById('bookingName');
                    const bookingEmail = document.getElementById('bookingEmail');
                    if (bookingName) bookingName.value = user.name;
                    if (bookingEmail) bookingEmail.value = user.email;

                    // Isi Otomatis Form Contact
                    const contactName = document.getElementById('contactName');
                    const contactEmail = document.getElementById('contactEmail');
                    if (contactName) contactName.value = user.name;
                    if (contactEmail) contactEmail.value = user.email;
                }
            })
            .catch(error => console.error("Gagal autofill data:", error));
    }

    
    // =========================================================================
    // 5. SETUP EVENT LISTENERS DASHBOARD & NAVIGASI
    // =========================================================================
    
    if (dashboardLink) {
        dashboardLink.addEventListener('click', handleDashboardClick);
    }
    
    if (logoutLink) {
        logoutLink.addEventListener('click', handleLogout);
    }
    
    // Listener untuk navigasi agar dashboard disembunyikan saat kembali ke homepage
    document.querySelectorAll('.navbar-brand, #navbarNav .nav-link').forEach(link => {
        if (link.getAttribute('href') && link.getAttribute('href').startsWith('#') && link.id !== 'profileDashboardLink') {
             link.addEventListener('click', showHomeSections);
        }
    });

    // Inisialisasi Swiper Testimonials (jika Swiper sudah di-load)
    if (typeof Swiper !== 'undefined') {
        new Swiper('.testimonial-slider', {
            loop: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
            },
            pagination: {
                el: '.swiper-pagination',
                clickable: true,
            },
            breakpoints: {
                640: {
                    slidesPerView: 1,
                },
                768: {
                    slidesPerView: 2,
                    spaceBetween: 20,
                },
                1024: {
                    slidesPerView: 3,
                    spaceBetween: 30,
                },
            }
        });
    }

});