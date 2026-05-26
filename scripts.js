class LocalDatabase {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem('eb_users')) {
            const seedUsers = [
                { id: "u1", name: "Elena Popescu", email: "elena@yahoo.com", password: "password123", role: "Turist", confirmed: true },
                { id: "u2", name: "Andrei Marin", email: "andrei@hotelmar.ro", password: "password123", role: "Proprietar", confirmed: true },
                { id: "admin", name: "Admin Central", email: "admin@easybook.ro", password: "adminpassword", role: "Administrator", confirmed: true }
            ];
            localStorage.setItem('eb_users', JSON.stringify(seedUsers));
        }

        if (!localStorage.getItem('eb_properties')) {
            const seedProperties = [
                { id: "p1", ownerId: "u2", title: "Hotel Maritimo Premium", resort: "Mamaia", price: 85, capacity: 4, description: "Situat la 50m de plaja, cu vedere frontala la mare. Dotari moderne si finisaje de lux pentru un sejur ideal.", image: "https://dummyimage.com/450x300/dee2e6/6c757d.jpg&text=Hotel+Maritimo", facilities: ["Wi-Fi", "Parcare", "Aer Conditionat"], status: "Aprobat", available: true },
                { id: "p2", ownerId: "u2", title: "Vila Sun & Sand", resort: "Eforie Nord", price: 45, capacity: 6, description: "Locatie excelenta pentru familii, curte interioara generoasa, gratar si zona de relaxare.", image: "https://dummyimage.com/450x300/dee2e6/6c757d.jpg&text=Vila+Sun+Sand", facilities: ["Wi-Fi", "Piscina"], status: "Aprobat", available: true },
                { id: "p3", ownerId: "u2", title: "Apartament Vama Loft", resort: "Vama Veche", price: 60, capacity: 2, description: "Stil boem si design minimalist industrial, aproape de cele mai cunoscute plaje si baruri.", image: "https://dummyimage.com/450x300/dee2e6/6c757d.jpg&text=Vama+Loft", facilities: ["Wi-Fi", "Aer Conditionat"], status: "In Asteptare", available: true }
            ];
            localStorage.setItem('eb_properties', JSON.stringify(seedProperties));
        }

        if (!localStorage.getItem('eb_bookings')) {
            const seedBookings = [
                { id: "b1", propertyId: "p1", touristId: "u1", checkIn: "2026-07-10", checkOut: "2026-07-15", guests: 2, totalPrice: 425, status: "Confirmat" }
            ];
            localStorage.setItem('eb_bookings', JSON.stringify(seedBookings));
        }

        if (!localStorage.getItem('eb_favorites')) {
            localStorage.setItem('eb_favorites', JSON.stringify([]));
        }
    }

    getData(key) { return JSON.parse(localStorage.getItem(key)); }
    setData(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
}

class EasyBookApp {
    constructor() {
        this.db = new LocalDatabase();
        this.currentUser = JSON.parse(sessionStorage.getItem('eb_current_session')) || null;
        this.currentSearchCriteria = null;
        this.filteredProperties = [];
        
        this.initDOM();

        window.addEventListener('popstate', (event) => {
            if (event.state && event.state.viewId) {
                if (event.state.viewId === 'details' && event.state.propertyId) {
                    this.viewPropertyDetails(event.state.propertyId, false);
                } else {
                    this.switchView(event.state.viewId, false);
                }
            } else {
                this.switchView('home', false);
            }
        });

        const initialHash = window.location.hash.replace('#', '') || 'home';
        history.replaceState({ viewId: initialHash }, "", window.location.hash || '#home');
        
        if (initialHash.startsWith('details?id=')) {
            const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
            const propId = urlParams.get('id');
            if (propId) this.viewPropertyDetails(propId, false);
            else this.switchView('home', false);
        } else {
            this.switchView(initialHash, false);
        }
    }

    initDOM() {
        this.updateAuthUI();
        this.renderPropertiesGrid(this.getApprovedProperties());
        this.setInitialDates();
    }

    setInitialDates() {
        const today = new Date().toISOString().split('T')[0];
        if(document.getElementById('search-checkin')) {
            document.getElementById('search-checkin').min = today;
            document.getElementById('search-checkout').min = today;
        }
    }

    getApprovedProperties() {
        return this.db.getData('eb_properties').filter(p => p.status === 'Aprobat' && p.available !== false);
    }

    switchView(viewId, triggerPush = true) {
        document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
        const targetView = document.getElementById(`view-${viewId}`);
        if (targetView) targetView.classList.add('active');
        window.scrollTo(0, 0);

        if (viewId === 'dashboard') {
            this.loadDashboardData();
        }

        if (triggerPush) {
            history.pushState({ viewId: viewId }, "", `#${viewId}`);
        }
    }
    

    showAlert(message, type = 'danger') {
        const alertContainer = document.getElementById('alert-container');
        alertContainer.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show shadow-sm" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        window.scrollTo(0, 0);
    }

    toggleAdminKeyField() {
        const roleSelect = document.getElementById('reg-role');
        const confirmContainer = document.getElementById('admin-confirm-container');
        const adminKeyInput = document.getElementById('reg-admin-key');

        if (roleSelect && roleSelect.value === 'Administrator') {
            confirmContainer.style.display = 'block';
            adminKeyInput.required = true;
        } else {
            confirmContainer.style.display = 'none';
            if (adminKeyInput) {
                adminKeyInput.required = false;
                adminKeyInput.value = '';
            }
        }
    }

    handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const role = document.getElementById('reg-role').value;

        if (password.length < 6) {
            this.showAlert("Parola trebuie sa contina cel putin 6 caractere!");
            return;
        }

        let users = this.db.getData('eb_users');
        if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            this.showAlert("Aceasta adresa de email este deja utilizata!");
            return;
        }

        if (role === 'Administrator') {
            const adminKey = document.getElementById('reg-admin-key').value.trim();
            const validKey = "admin123";
            
            if (adminKey !== validKey) {
                this.showAlert("Link-ul sau codul de confirmare pentru functia de Administrator este invalid! Contul nu a fost creat.");
                return;
            }
        }

        const newUser = {
            id: 'u_' + Date.now(),
            name,
            email,
            password,
            role,
            confirmed: true
        };

        users.push(newUser);
        this.db.setData('eb_users', users);
        this.showAlert("Contul a fost creat cu succes! Te poti autentifica acum.", "success");
        this.switchView('login');
    }

    handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        const users = this.db.getData('eb_users');
        const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

        if (!user) {
            this.showAlert("Datele de autentificare sunt incorecte. Verifica email-ul sau parola.");
            return;
        }

        this.currentUser = user;
        sessionStorage.setItem('eb_current_session', JSON.stringify(user));
        this.updateAuthUI();
        this.showAlert(`Bine ai revenit, ${user.name}! (${user.role})`, "success");
        this.switchView('home');
    }

    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('eb_current_session');
        this.updateAuthUI();
        this.switchView('home');
    }

    updateAuthUI() {
        const authButtons = document.getElementById('auth-buttons');
        const userProfile = document.getElementById('user-profile');
        const loggedInUsername = document.getElementById('logged-in-username');
        const roleBadge = document.getElementById('user-role-badge');
        const dependentItems = document.querySelectorAll('.role-dependent');

        dependentItems.forEach(item => item.style.display = 'none');

        if (this.currentUser) {
            authButtons.style.display = 'none';
            userProfile.style.display = 'block';
            loggedInUsername.textContent = this.currentUser.name;
            roleBadge.textContent = this.currentUser.role;
            roleBadge.className = `badge ${this.getBadgeClass(this.currentUser.role)} me-3`;
            
            document.querySelectorAll('.role-dependent').forEach(item => {
                if (this.currentUser.role === 'Turist' && item.classList.contains('tourist-role')) item.style.display = 'block';
                if (this.currentUser.role === 'Proprietar' && item.classList.contains('owner-role')) item.style.display = 'block';
                if (this.currentUser.role === 'Administrator' && item.classList.contains('admin-role')) item.style.display = 'block';
            });
        } else {
            authButtons.style.display = 'block';
            userProfile.style.display = 'none';
            roleBadge.textContent = "Vizitator";
            roleBadge.className = "badge bg-secondary me-3";
        }
    }

    getBadgeClass(role) {
        if (role === 'Turist') return 'bg-info text-dark';
        if (role === 'Proprietar') return 'bg-success text-white';
        if (role === 'Administrator') return 'bg-danger text-white';
        return 'bg-secondary';
    }

    handleSearch(e) {
        e.preventDefault();
        const resort = document.getElementById('search-resort').value;
        const checkin = document.getElementById('search-checkin').value;
        const checkout = document.getElementById('search-checkout').value;
        const guests = parseInt(document.getElementById('search-guests').value);

        if (new Date(checkin) >= new Date(checkout)) {
            this.showAlert("Perioada selectata este invalida! Data de check-out trebuie sa fie ulterioara celei de check-in.");
            return;
        }

        this.currentSearchCriteria = { resort, checkin, checkout, guests };
        this.applySearchAndFilters();
    }

    handleFilters() {
        const maxPrice = document.getElementById('filter-price').value;
        document.getElementById('filter-price-val').textContent = `$${maxPrice}`;
        this.applySearchAndFilters();
    }

    applySearchAndFilters() {
        let list = this.getApprovedProperties();

        if (this.currentSearchCriteria) {
            const { resort, checkin, checkout, guests } = this.currentSearchCriteria;
            list = list.filter(p => p.resort === resort && p.capacity >= guests);
            list = list.filter(p => this.isPropertyAvailable(p.id, checkin, checkout));
        }

        const maxPrice = parseInt(document.getElementById('filter-price').value);
        list = list.filter(p => p.price <= maxPrice);

        const activeFacilities = Array.from(document.querySelectorAll('.filter-facility:checked')).map(el => el.value);
        if (activeFacilities.length > 0) {
            list = list.filter(p => activeFacilities.every(fac => p.facilities.includes(fac)));
        }

        this.renderPropertiesGrid(list);
    }

    isPropertyAvailable(propertyId, checkIn, checkOut) {
        const bookings = this.db.getData('eb_bookings').filter(b => b.propertyId === propertyId && b.status === 'Confirmat');
        const targetStart = new Date(checkIn);
        const targetEnd = new Date(checkOut);

        for (let b of bookings) {
            const bookingStart = new Date(b.checkIn);
            const bookingEnding = new Date(b.checkOut);

            if (targetStart < bookingEnding && targetEnd > bookingStart) {
                return false; 
            }
        }
        return true;
    }

    renderPropertiesGrid(properties) {
        const grid = document.getElementById('properties-grid');
        grid.innerHTML = '';

        if (properties.length === 0) {
            grid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <i class="bi-building-x display-4 text-muted"></i>
                    <p class="mt-2 text-muted">Nu s-au gasit unitati de cazare care sa corespunda criteriilor sau filtrelor selectate.</p>
                </div>
            `;
            return;
        }

        properties.forEach(p => {
            const isFav = this.currentUser && this.db.getData('eb_favorites').some(f => f.userId === this.currentUser.id && f.propId === p.id);
            
            grid.innerHTML += `
                <div class="col-md-6 col-xl-4 mb-4">
                    <div class="card h-100 shadow-sm position-relative">
                        <img class="card-img-top" src="${p.image}" alt="${p.title}" style="height: 180px; object-fit: cover;" />
                        <div class="card-body p-3">
                            <div class="d-flex justify-content-between align-items-start">
                                <span class="badge bg-primary mb-2">${p.resort}</span>
                                ${this.currentUser && this.currentUser.role === 'Turist' ? `
                                    <button class="btn btn-sm p-0 text-danger" onclick="app.toggleFavorite('${p.id}')">
                                        <i class="${isFav ? 'bi-heart-fill' : 'bi-heart'} fs-5"></i>
                                    </button>
                                ` : ''}
                            </div>
                            <h5 class="fw-bold mb-1">${p.title}</h5>
                            <p class="small text-muted mb-2"><i class="bi-people me-1"></i> Capacitate: max. ${p.capacity} persoane</p>
                            <div class="mb-2">
                                ${p.facilities.map(f => `<span class="badge bg-light text-dark border me-1">${f}</span>`).join('')}
                            </div>
                            <div class="text-primary fw-bold mt-2">
                                <span class="fs-4">$${p.price}</span> <span class="small fw-normal text-muted">/ noapte</span>
                            </div>
                        </div>
                        <div class="card-footer p-3 pt-0 border-top-0 bg-transparent">
                            <button class="btn btn-outline-dark btn-sm w-100" onclick="app.viewPropertyDetails('${p.id}')">Vizualizare detalii</button>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    viewPropertyDetails(id, triggerPush = true) {
        const p = this.db.getData('eb_properties').find(item => item.id === id);
        if (!p) return;

        document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById('view-details').classList.add('active');
        window.scrollTo(0, 0);
        
        if (triggerPush) {
            history.pushState({ viewId: 'details', propertyId: id }, "", `#details?id=${id}`);
        }

        const content = document.getElementById('property-details-content');
        const defaultCheckin = this.currentSearchCriteria ? this.currentSearchCriteria.checkin : '';
        const defaultCheckout = this.currentSearchCriteria ? this.currentSearchCriteria.checkout : '';
        const defaultGuests = this.currentSearchCriteria ? this.currentSearchCriteria.guests : 2;

        content.innerHTML = `
            <div class="row">
                <div class="col-md-7 mb-4">
                    <img src="${p.image}" class="img-fluid rounded shadow" alt="${p.title}" style="width: 100%; max-height: 400px; object-fit: cover;">
                    <h2 class="fw-bold mt-3">${p.title}</h2>
                    <h5 class="text-muted"><i class="bi-geo-alt-fill text-danger me-1"></i>Statiunea ${p.resort}, Litoralul Romanesc</h5>
                    <hr>
                    <p class="lead">${p.description}</p>
                    <h5 class="fw-bold mt-4">Facilitati incluse:</h5>
                    <div>
                        ${p.facilities.map(f => `<span class="badge bg-light text-dark border p-2 me-2 mb-2"><i class="bi-check2 text-success me-1"></i>${f}</span>`).join('')}
                    </div>
                </div>
                <div class="col-md-5">
                    <div class="card shadow-sm p-4 bg-light border-primary">
                        <h4 class="fw-bold text-center mb-3">Rezerva cazare</h4>
                        <div class="text-center mb-3">
                            <span class="fs-2 fw-bold text-primary">$${p.price}</span> <span class="text-muted">/ noapte</span>
                        </div>
                        
                        <form onsubmit="app.handleBooking(event, '${p.id}', ${p.price})">
                            <div class="mb-3">
                                <label class="form-label small fw-bold">Data Check-In</label>
                                <input type="date" class="form-control" id="book-checkin" value="${defaultCheckin}" required onchange="app.calculateTotalPrice(${p.price})">
                            </div>
                            <div class="mb-3">
                                <label class="form-label small fw-bold">Data Check-Out</label>
                                <input type="date" class="form-control" id="book-checkout" value="${defaultCheckout}" required onchange="app.calculateTotalPrice(${p.price})">
                            </div>
                            <div class="mb-3">
                                <label class="form-label small fw-bold">Numar Persoane</label>
                                <input type="number" class="form-control" id="book-guests" min="1" max="${p.capacity}" value="${defaultGuests}" required>
                                <div class="form-text small text-muted">Capacitatea maxima a acestei unitati este de ${p.capacity} persoane.</div>
                            </div>
                            
                            <div id="booking-cost-summary" class="alert alert-info text-center d-none my-3 fw-bold">
                                Cost total pentru rezervare: $0
                            </div>

                            <button type="submit" class="btn btn-primary w-100 btn-lg mt-2">
                                <i class="bi-calendar-check me-2"></i>Trimite Solicitare Rezervare
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        `;
        
        if (defaultCheckin && defaultCheckout) {
            this.calculateTotalPrice(p.price);
        }
    }

    calculateTotalPrice(pricePerNight) {
        const ci = document.getElementById('book-checkin').value;
        const co = document.getElementById('book-checkout').value;
        const summary = document.getElementById('booking-cost-summary');

        if (ci && co) {
            const days = Math.ceil((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
            if (days > 0) {
                summary.classList.remove('d-none');
                summary.textContent = `Cost total pentru ${days} nopti: $${days * pricePerNight}`;
                return;
            }
        }
        summary.classList.add('d-none');
    }

    handleBooking(e, propertyId, pricePerNight) {
        e.preventDefault();

        if (!this.currentUser) {
            this.showAlert("Trebuie sa fii autentificat pentru a efectua o rezervare! Te rugam sa intri in cont.");
            this.switchView('login');
            return;
        }

        if (this.currentUser.role !== 'Turist') {
            this.showAlert("Doar utilizatorii cu rol de Turist pot rezerva proprietati!");
            return;
        }

        const checkIn = document.getElementById('book-checkin').value;
        const checkOut = document.getElementById('book-checkout').value;
        const guests = parseInt(document.getElementById('book-guests').value);

        if (new Date(checkIn) >= new Date(checkOut)) {
            this.showAlert("Intervalul de rezervare este invalid!");
            return;
        }

        if (!this.isPropertyAvailable(propertyId, checkIn, checkOut)) {
            this.showAlert("Ne pare rau! Proprietatea a fost deja rezervata in aceasta perioada.");
            return;
        }

        const days = Math.ceil((new Date(checkOut) - new Date(checkIn)) / (1000 * 60 * 60 * 24));
        const totalPrice = days * pricePerNight;

        const newBooking = {
            id: 'b_' + Date.now(),
            propertyId,
            touristId: this.currentUser.id,
            checkIn,
            checkOut,
            guests,
            totalPrice,
            status: "In Asteptare"
        };

        const bookings = this.db.getData('eb_bookings');
        bookings.push(newBooking);
        this.db.setData('eb_bookings', bookings);

        this.showAlert("Solicitarea de rezervare a fost trimisa gazdei. Verificati statusul in panoul de control!", "success");
        this.switchView('dashboard');
    }

    toggleFavorite(propId) {
        if (!this.currentUser) return;
        let favs = this.db.getData('eb_favorites');
        const index = favs.findIndex(f => f.userId === this.currentUser.id && f.propId === propId);

        if (index > -1) {
            favs.splice(index, 1);
        } else {
            favs.push({ userId: this.currentUser.id, propId });
        }
        this.db.setData('eb_favorites', favs);
        this.applySearchAndFilters();
    }

    loadDashboardData() {
        document.getElementById('dashboard-role-title').textContent = this.currentUser.role;
        document.querySelectorAll('.dashboard-subview').forEach(sub => sub.style.display = 'none');

        if (this.currentUser.role === 'Turist') {
            this.loadTouristDashboard();
        } else if (this.currentUser.role === 'Proprietar') {
            this.loadOwnerDashboard();
        } else if (this.currentUser.role === 'Administrator') {
            this.loadAdminDashboard();
        }
    }

    loadTouristDashboard() {
        document.getElementById('subview-tourist').style.display = 'block';
        const bookings = this.db.getData('eb_bookings').filter(b => b.touristId === this.currentUser.id);
        const props = this.db.getData('eb_properties');
        const listContainer = document.getElementById('tourist-bookings-list');
        
        listContainer.innerHTML = '';
        if(bookings.length === 0) {
            listContainer.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nu ai efectuat nicio rezervare pana acum.</td></tr>';
        } else {
            bookings.forEach(b => {
                const p = props.find(item => item.id === b.propertyId);
                let statusBadge = `<span class="badge bg-warning text-dark">${b.status}</span>`;
                if (b.status === "Confirmat") statusBadge = `<span class="badge bg-success">${b.status}</span>`;
                if (b.status === "Respins" || b.status === "Anulat") statusBadge = `<span class="badge bg-danger">${b.status}</span>`;

                listContainer.innerHTML += `
                    <tr>
                        <td class="fw-bold">${p ? p.title : 'Unitate stearsa'}</td>
                        <td>${b.checkIn} - ${b.checkOut}</td>
                        <td>${b.guests} persoane</td>
                        <td class="text-primary fw-bold">$${b.totalPrice}</td>
                        <td>${statusBadge}</td>
                        <td>
                            ${b.status !== "Anulat" && b.status !== "Respins" ? `
                                <button class="btn btn-sm btn-outline-danger" onclick="app.cancelBookingTourist('${b.id}')">Anuleaza</button>
                            ` : '-'}
                        </td>
                    </tr>
                `;
            });
        }

        const favs = this.db.getData('eb_favorites').filter(f => f.userId === this.currentUser.id);
        const favGrid = document.getElementById('tourist-favorites-grid');
        favGrid.innerHTML = '';
        
        if(favs.length === 0) {
            favGrid.innerHTML = '<div class="col-12 text-muted ps-3">Nu ai nicio cazare salvata la favorite.</div>';
        } else {
            favs.forEach(f => {
                const p = props.find(item => item.id === f.propId);
                if(p) {
                    favGrid.innerHTML += `
                        <div class="col-md-4 mb-3">
                            <div class="card p-2 border">
                                <h6 class="fw-bold mb-1">${p.title}</h6>
                                <p class="small text-muted mb-2">${p.resort} - $${p.price}/noapte</p>
                                <button class="btn btn-sm btn-outline-dark" onclick="app.viewPropertyDetails('${p.id}')">Vezi Oferta</button>
                            </div>
                        </div>
                    `;
                }
            });
        }
    }

    cancelBookingTourist(bookingId) {
        let bookings = this.db.getData('eb_bookings');
        const idx = bookings.findIndex(b => b.id === bookingId);
        if (idx > -1) {
            bookings[idx].status = "Anulat";
            this.db.setData('eb_bookings', bookings);
            this.showAlert("Rezervarea a fost anulata cu succes!", "success");
            this.loadTouristDashboard();
        }
    }

    loadOwnerDashboard() {
        document.getElementById('subview-owner').style.display = 'block';
        const myProps = this.db.getData('eb_properties').filter(p => p.ownerId === this.currentUser.id);
        const grid = document.getElementById('owner-properties-grid');
        grid.innerHTML = '';

        if(myProps.length === 0) {
            grid.innerHTML = '<div class="col-12 text-muted ps-3">Nu ai nicio proprietate listata. Foloseeste butonul de adaugare.</div>';
        } else {
            myProps.forEach(p => {
                let statusColor = 'bg-warning text-dark';
                if(p.status === 'Aprobat') statusColor = 'bg-success';
                if(p.status === 'Respins') statusColor = 'bg-danger';

                const isAvailable = p.available !== false;

                grid.innerHTML += `
                    <div class="col-md-6 col-lg-4 mb-3">
                        <div class="card p-3 shadow-sm border">
                            <h5 class="fw-bold mb-1">${p.title}</h5>
                            <span class="badge ${statusColor} align-self-start mb-2">${p.status}</span>
                            <div class="mb-3 small">
                                <strong>Statiune:</strong> ${p.resort}<br>
                                <strong>Status manual:</strong> <span class="fw-bold ${isAvailable ? 'text-success' : 'text-danger'}">${isAvailable ? 'Deschis (Disponibil)' : 'Inchis (Indisponibil)'}</span>
                            </div>
                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" id="update-avail-${p.id}" ${isAvailable ? 'checked' : ''} onchange="app.updateAvailabilityOwner('${p.id}')">
                                <label class="form-check-label small" for="update-avail-${p.id}">Permite rezervari active</label>
                            </div>
                            <div class="input-group input-group-sm mb-2">
                                <span class="input-group-text">$</span>
                                <input type="number" class="form-control" id="update-price-${p.id}" value="${p.price}">
                                <button class="btn btn-primary" onclick="app.updatePropertyOwner('${p.id}')">Pret</button>
                            </div>
                            <button class="btn btn-sm btn-danger w-100" onclick="app.deletePropertyOwner('${p.id}')"><i class="bi-trash"></i> Sterge Anunt</button>
                        </div>
                    </div>
                `;
            });
        }

        const allBookings = this.db.getData('eb_bookings');
        const users = this.db.getData('eb_users');
        const recList = document.getElementById('owner-received-list');
        recList.innerHTML = '';

        let hasBookings = false;
        allBookings.forEach(b => {
            const p = myProps.find(item => item.id === b.propertyId);
            if(p) {
                hasBookings = true;
                const client = users.find(u => u.id === b.touristId);
                let statusBadge = `<span class="badge bg-warning text-dark">${b.status}</span>`;
                if (b.status === "Confirmat") statusBadge = `<span class="badge bg-success">${b.status}</span>`;
                if (b.status === "Respins" || b.status === "Anulat") statusBadge = `<span class="badge bg-danger">${b.status}</span>`;

                recList.innerHTML += `
                    <tr>
                        <td class="fw-bold">${p.title}</td>
                        <td>${client ? client.name : 'Client necunoscut'}</td>
                        <td>${b.checkIn} - ${b.checkOut}</td>
                        <td>${b.guests} pers.</td>
                        <td>${statusBadge}</td>
                        <td>
                            ${b.status === "In Asteptare" ? `
                                <button class="btn btn-xs btn-success me-1" onclick="app.changeBookingStatusOwner('${b.id}', 'Confirmat')">Accepta</button>
                                <button class="btn btn-xs btn-danger" onclick="app.changeBookingStatusOwner('${b.id}', 'Respins')">Respinge</button>
                            ` : '-'}
                        </td>
                    </tr>
                `;
            }
        });

        if(!hasBookings) {
            recList.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Nu s-a inregistrat nicio rezervare pentru proprietatile tale inca.</td></tr>';
        }
    }

    updateAvailabilityOwner(id) {
        const toggleValue = document.getElementById(`update-avail-${id}`).checked;
        let props = this.db.getData('eb_properties');
        const idx = props.findIndex(item => item.id === id);
        if (idx > -1) {
            props[idx].available = toggleValue;
            this.db.setData('eb_properties', props);
            this.showAlert("Disponibilitatea generala a fost modificata. Unitatile dezactivate nu mai apar la cautari.", "success");
            this.loadOwnerDashboard();
            this.applySearchAndFilters();
        }
    }

    changeBookingStatusOwner(bookingId, newStatus) {
        let bookings = this.db.getData('eb_bookings');
        const idx = bookings.findIndex(b => b.id === bookingId);
        if (idx > -1) {
            bookings[idx].status = newStatus;
            this.db.setData('eb_bookings', bookings);
            this.showAlert(`Rezervarea a fost marcata ca fiind: ${newStatus}`, "success");
            this.loadOwnerDashboard();
        }
    }

    deletePropertyOwner(id) {
        let props = this.db.getData('eb_properties');
        props = props.filter(p => p.id !== id);
        this.db.setData('eb_properties', props);
        this.showAlert("Anuntul tau a fost eliminat de pe platforma.", "success");
        this.loadOwnerDashboard();
        this.applySearchAndFilters();
    }

    handleAddProperty(e) {
        e.preventDefault();
        const title = document.getElementById('prop-title').value.trim();
        const resort = document.getElementById('prop-resort').value;
        const price = parseInt(document.getElementById('prop-price').value);
        const capacity = parseInt(document.getElementById('prop-capacity').value);
        const image = document.getElementById('prop-image').value.trim();
        const description = document.getElementById('prop-description').value.trim();
        const facilities = Array.from(document.querySelectorAll('.add-prop-fac:checked')).map(el => el.value);

        const newProp = {
            id: 'p_' + Date.now(),
            ownerId: this.currentUser.id,
            title,
            resort,
            price,
            capacity,
            description,
            image,
            facilities,
            status: "In Asteptare",
            available: true
        };

        const props = this.db.getData('eb_properties');
        props.push(newProp);
        this.db.setData('eb_properties', props);

        this.showAlert("Proprietatea a fost trimisa spre evaluare si validare administratorului platformei!", "success");
        e.target.reset();
        this.loadOwnerDashboard();
    }

    updatePropertyOwner(id) {
        const newPrice = parseInt(document.getElementById(`update-price-${id}`).value);
        if(isNaN(newPrice) || newPrice <= 0) {
            this.showAlert("Pretul trebuie sa fie un numar valid pozitiv!");
            return;
        }

        let props = this.db.getData('eb_properties');
        const idx = props.findIndex(item => item.id === id);
        if (idx > -1) {
            props[idx].price = newPrice;
            this.db.setData('eb_properties', props);
            this.showAlert("Informatiile de pret au fost actualizate in timp real!", "success");
            this.loadOwnerDashboard();
            this.applySearchAndFilters();
        }
    }

    loadAdminDashboard() {
        document.getElementById('subview-admin').style.display = 'block';
        
        const props = this.db.getData('eb_properties');
        const users = this.db.getData('eb_users');
        const listContainer = document.getElementById('admin-properties-list');
        listContainer.innerHTML = '';

        props.forEach(p => {
            const owner = users.find(u => u.id === p.ownerId);
            listContainer.innerHTML += `
                <tr>
                    <td><strong>${p.title}</strong></td>
                    <td>${p.resort}</td>
                    <td>${owner ? owner.name : 'Sursa stearsa'}</td>
                    <td>$${p.price}/noapte</td>
                    <td><span class="badge ${p.status === 'Aprobat' ? 'bg-success' : 'bg-warning text-dark'}">${p.status}</span></td>
                    <td>
                        ${p.status !== 'Aprobat' ? `<button class="btn btn-sm btn-success me-1" onclick="app.setPropStatus('${p.id}', 'Aprobat')">Aproba</button>` : ''}
                        <button class="btn btn-sm btn-danger" onclick="app.deletePropertyAdmin('${p.id}')">Elimina</button>
                    </td>
                </tr>
            `;
        });

        const usersContainer = document.getElementById('admin-users-list');
        usersContainer.innerHTML = '';
        users.forEach(u => {
            if(u.role === 'Administrator') return;
            usersContainer.innerHTML += `
                <tr>
                    <td>${u.name}</td>
                    <td>${u.email}</td>
                    <td><span class="badge bg-secondary">${u.role}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="app.deleteUserAdmin('${u.id}')"><i class="bi-trash"></i> Blocheaza Cont</button>
                    </td>
                </tr>
            `;
        });
    }

    setPropStatus(id, newStatus) {
        let props = this.db.getData('eb_properties');
        const idx = props.findIndex(p => p.id === id);
        if(idx > -1) {
            props[idx].status = newStatus;
            this.db.setData('eb_properties', props);
            this.showAlert("Anuntul a fost aprobat si publicat cu succes pe platforma!", "success");
            this.loadAdminDashboard();
            this.applySearchAndFilters();
        }
    }

    deletePropertyAdmin(id) {
        let props = this.db.getData('eb_properties');
        props = props.filter(p => p.id !== id);
        this.db.setData('eb_properties', props);
        this.showAlert("Anuntul a fost eliminat permanent de pe platforma.");
        this.loadAdminDashboard();
        this.applySearchAndFilters();
    }

    deleteUserAdmin(userId) {
        let users = this.db.getData('eb_users');
        users = users.filter(u => u.id !== userId);
        this.db.setData('eb_users', users);
        this.showAlert("Utilizatorul a fost blocat si eliminat din sistem.");
        this.loadAdminDashboard();
    }
}

let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new EasyBookApp();
});
