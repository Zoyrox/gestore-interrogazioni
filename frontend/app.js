/**
 * GESTORE INTERROGAZIONI SCOLASTICHE
 * Applicazione Frontend JavaScript v2.0
 * Con animazioni spettacolari
 */

// ============================================
// CONFIGURAZIONE
// ============================================
const CONFIG = {
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : '',
    AUTH_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:5000'
        : '',
    ANIMATION_DURATION: 300
};

// ============================================
// CLASSE PRINCIPALE APP
// ============================================
class App {
    constructor() {
        this.token = localStorage.getItem('token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');
        this.currentView = 'login';
        this.currentDate = new Date();
        this.data = {
            classes: [],
            students: [],
            subjects: [],
            interrogations: [],
            exclusions: [],
            extractions: []
        };
        
        this.init();
    }

    // ============================================
    // INIZIALIZZAZIONE
    // ============================================
    init() {
        this.bindEvents();
        this.initAnimations();
        this.checkAuth();
    }

    initAnimations() {
        // Aggiungi classe per animazioni iniziali
        document.body.classList.add('animations-ready');
    }

    bindEvents() {
        // Tab login con animazione
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchLoginTab(tab);
            });
        });

        // Navigazione sidebar
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                this.navigateTo(section);
            });
        });

        // Chiudi modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });

        // Chiudi modal cliccando fuori
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.remove('active');
                }
            });
        });

        // Color picker
        const colorInput = document.getElementById('new-subject-color');
        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                const colorValue = document.querySelector('.color-value');
                if (colorValue) {
                    colorValue.textContent = e.target.value.toUpperCase();
                }
            });
        }

        // Enter key su form
        document.querySelectorAll('input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const form = input.closest('.login-form');
                    if (form) {
                        const btn = form.querySelector('.btn-primary');
                        if (btn) btn.click();
                    }
                }
            });
        });
    }

    // ============================================
    // AUTENTICAZIONE
    // ============================================
    async checkAuth() {
        if (!this.token) {
            this.showView('login');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/auth/verify`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.user = data.user;
                this.showDashboard();
            } else {
                this.logout();
            }
        } catch (error) {
            console.error('Errore verifica auth:', error);
            this.logout();
        }
    }

    async loginStudent() {
        const code = document.getElementById('student-code').value.trim().toUpperCase();
        
        if (!code) {
            this.showToast('Inserisci il codice classe', 'error');
            this.shakeElement('student-code');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code })
            });

            const data = await response.json();

            if (response.ok) {
                this.user = { role: 'student', class: data };
                localStorage.setItem('user', JSON.stringify(this.user));
                this.animateTransition(() => {
                    this.showView('student');
                    this.initStudentView();
                });
                this.showToast('Accesso effettuato!', 'success');
            } else {
                this.showToast(data.error || 'Codice non valido', 'error');
                this.shakeElement('student-code');
            }
        } catch (error) {
            console.error('Errore login:', error);
            this.showToast('Errore di connessione', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loginCapoclasse() {
        const username = document.getElementById('capoclasse-username').value.trim();
        const password = document.getElementById('capoclasse-password').value;

        if (!username || !password) {
            this.showToast('Inserisci username e password', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = data.user;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                this.animateTransition(() => {
                    this.showView('capoclasse');
                    this.initCapoclasseView();
                });
                this.showToast('Benvenuto, Capoclasse!', 'success');
            } else {
                this.showToast(data.error || 'Credenziali non valide', 'error');
                this.shakeElement('capoclasse-username');
            }
        } catch (error) {
            console.error('Errore login:', error);
            this.showToast('Errore di connessione', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async loginAdmin() {
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value;

        if (!username || !password) {
            this.showToast('Inserisci username e password', 'error');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${CONFIG.AUTH_URL}/api/auth/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.user = { ...data.user, role: 'admin' };
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(this.user));
                this.animateTransition(() => {
                    this.showView('admin');
                    this.initAdminView();
                });
                this.showToast('Benvenuto, Admin!', 'success');
            } else {
                this.showToast(data.error || 'Credenziali non valide', 'error');
            }
        } catch (error) {
            console.error('Errore login admin:', error);
            this.showToast('Servizio auth non disponibile', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        this.animateTransition(() => {
            this.showView('login');
            this.switchLoginTab('student');
        });
    }

    switchLoginTab(tab) {
        // Anima uscita form attivo
        const activeForm = document.querySelector('.login-form.active');
        if (activeForm) {
            activeForm.style.animation = 'fadeOut 0.2s ease forwards';
            setTimeout(() => {
                activeForm.classList.remove('active');
                activeForm.style.animation = '';
                
                // Attiva nuovo tab
                document.querySelectorAll('.tab-btn').forEach(btn => {
                    btn.classList.toggle('active', btn.dataset.tab === tab);
                });
                document.querySelectorAll('.login-form').forEach(form => {
                    form.classList.remove('active');
                });
                const newForm = document.getElementById(`${tab}-login`);
                newForm.classList.add('active');
                newForm.style.animation = 'fadeInUp 0.4s ease';
            }, 200);
        } else {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tab);
            });
            document.querySelectorAll('.login-form').forEach(form => {
                form.classList.remove('active');
            });
            document.getElementById(`${tab}-login`).classList.add('active');
        }
    }

    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
        
        // Anima icona
        const icon = input.parentElement.querySelector('.toggle-password i');
        icon.style.transform = 'scale(0.8)';
        setTimeout(() => {
            icon.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
            icon.style.transform = 'scale(1)';
        }, 150);
    }

    // ============================================
    // ANIMAZIONI
    // ============================================
    animateTransition(callback) {
        // Crea overlay di transizione
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: var(--primary);
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        document.body.appendChild(overlay);
        
        // Fade in
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
        
        // Esegui callback e fade out
        setTimeout(() => {
            callback();
            overlay.style.opacity = '0';
            setTimeout(() => overlay.remove(), 300);
        }, 300);
    }

    shakeElement(elementId) {
        const element = document.getElementById(elementId);
        if (element) {
            element.closest('.input-group')?.classList.add('shake');
            setTimeout(() => {
                element.closest('.input-group')?.classList.remove('shake');
            }, 500);
        }
    }

    // ============================================
    // NAVIGAZIONE VIEWS
    // ============================================
    showView(viewName) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });
        const newView = document.getElementById(`${viewName}-view`);
        newView.classList.remove('hidden');
        newView.style.animation = 'fadeIn 0.5s ease';
        this.currentView = viewName;
    }

    showDashboard() {
        if (this.user.role === 'admin') {
            this.showView('admin');
            this.initAdminView();
        } else if (this.user.role === 'capoclasse') {
            this.showView('capoclasse');
            this.initCapoclasseView();
        } else {
            this.showView('student');
            this.initStudentView();
        }
    }

    navigateTo(section) {
        // Aggiorna nav attiva con animazione
        document.querySelectorAll('.nav-item').forEach(item => {
            const isActive = item.dataset.section === section;
            item.classList.toggle('active', isActive);
            if (isActive) {
                item.style.animation = 'pulse 0.3s ease';
                setTimeout(() => item.style.animation = '', 300);
            }
        });

        // Nascondi tutte le sezioni
        const view = this.currentView;
        const sections = document.querySelectorAll(`#${view}-view .content-section`);
        
        sections.forEach(sec => {
            if (!sec.classList.contains('hidden')) {
                sec.style.animation = 'fadeOut 0.2s ease forwards';
                setTimeout(() => {
                    sec.classList.add('hidden');
                    sec.style.animation = '';
                }, 200);
            }
        });

        // Mostra nuova sezione
        setTimeout(() => {
            const newSection = document.getElementById(`${view}-${section}-section`);
            newSection.classList.remove('hidden');
            newSection.style.animation = 'fadeInUp 0.4s ease';
        }, 250);

        // Aggiorna titolo
        const titles = {
            dashboard: 'Dashboard',
            classes: 'Gestione Classi',
            students: 'Gestione Studenti',
            subjects: 'Gestione Materie',
            calendar: 'Calendario',
            extractors: 'Gestione Capoclasse',
            extract: 'Estrazione',
            history: 'Storico Estrazioni'
        };
        const titleEl = document.getElementById(`${view}-page-title`);
        if (titleEl) {
            titleEl.style.animation = 'fadeOut 0.15s ease forwards';
            setTimeout(() => {
                titleEl.textContent = titles[section] || section;
                titleEl.style.animation = 'fadeIn 0.15s ease';
            }, 150);
        }

        // Carica dati sezione
        setTimeout(() => {
            if (view === 'admin') {
                if (section === 'dashboard') this.loadDashboardStats();
                if (section === 'classes') this.loadClasses();
                if (section === 'students') this.loadAllStudents();
                if (section === 'subjects') this.loadAllSubjects();
                if (section === 'calendar') this.loadAdminCalendar();
                if (section === 'extractors') this.loadExtractors();
            } else if (view === 'capoclasse') {
                if (section === 'extract') this.loadExtractionData();
                if (section === 'calendar') this.loadCapoclasseCalendar();
                if (section === 'history') this.loadExtractionHistory();
            }
        }, 300);
    }

    // ============================================
    // ADMIN VIEW
    // ============================================
    async initAdminView() {
        const usernameDisplay = document.getElementById('admin-username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = this.user.username;
        }
        this.loadDashboardStats();
        this.populateClassSelects();
    }

    async loadDashboardStats() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/stats`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();

            // Anima i numeri
            this.animateNumber('stat-classes', data.total_classes);
            this.animateNumber('stat-students', data.total_students);
            this.animateNumber('stat-subjects', data.total_subjects);
            this.animateNumber('stat-extractions', data.total_extractions);
        } catch (error) {
            console.error('Errore caricamento stats:', error);
        }
    }

    animateNumber(elementId, targetValue) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const duration = 1000;
        const startValue = 0;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);
            
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    async loadClasses() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const classes = await response.json();
            this.data.classes = classes;

            const tbody = document.getElementById('classes-table-body');
            tbody.innerHTML = classes.map((c, index) => `
                <tr style="animation: fadeInUp 0.3s ease ${index * 0.05}s backwards;">
                    <td><strong>${c.name}</strong></td>
                    <td>${c.year || '-'}/${c.section || '-'}</td>
                    <td><code class="code">${c.code}</code></td>
                    <td>${c.student_count || 0}</td>
                    <td>${c.subject_count || 0}</td>
                    <td>
                        <div class="table-actions">
                            <button class="btn btn-sm btn-secondary" onclick="app.viewClassDetails(${c.id})" title="Dettagli">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.deleteClass(${c.id})" title="Elimina">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Errore caricamento classi:', error);
        }
    }

    async createClass() {
        const name = document.getElementById('new-class-name').value.trim();
        const year = document.getElementById('new-class-year').value;
        const section = document.getElementById('new-class-section').value.trim();

        if (!name) {
            this.showToast('Inserisci il nome della classe', 'error');
            return;
        }

        const btn = document.querySelector('#create-class-modal .btn-primary');
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creazione...';
        btn.disabled = true;

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ name, year, section })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast(`Classe creata! Codice: ${data.code}`, 'success');
                this.hideModal('create-class-modal');
                this.loadClasses();
                this.populateClassSelects();
                
                // Reset form
                document.getElementById('new-class-name').value = '';
                document.getElementById('new-class-year').value = '';
                document.getElementById('new-class-section').value = '';
            } else {
                this.showToast(data.error || 'Errore creazione classe', 'error');
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showToast('Errore di connessione', 'error');
        } finally {
            btn.innerHTML = 'Crea Classe';
            btn.disabled = false;
        }
    }

    async deleteClass(id) {
        if (!confirm('Sei sicuro di voler eliminare questa classe?')) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            if (response.ok) {
                this.showToast('Classe eliminata', 'success');
                this.loadClasses();
                this.populateClassSelects();
            } else {
                const data = await response.json();
                this.showToast(data.error || 'Errore eliminazione', 'error');
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showToast('Errore di connessione', 'error');
        }
    }

    async loadAllStudents() {
        await this.populateClassSelects();
        const filter = document.getElementById('student-class-filter');
        
        filter.addEventListener('change', () => {
            this.loadStudentsByClass(filter.value);
        });

        if (filter.value) {
            this.loadStudentsByClass(filter.value);
        }
    }

    async loadStudentsByClass(classId) {
        if (!classId) {
            document.getElementById('students-table-body').innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/${classId}/students`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const students = await response.json();

            const className = this.data.classes.find(c => c.id == classId)?.name || '';

            const tbody = document.getElementById('students-table-body');
            tbody.innerHTML = students.map((s, index) => `
                <tr style="animation: fadeInUp 0.3s ease ${index * 0.03}s backwards;">
                    <td>${s.last_name}</td>
                    <td>${s.first_name}</td>
                    <td>${className}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteStudent(${s.id})" title="Elimina">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Errore caricamento studenti:', error);
        }
    }

    async addStudent() {
        const classId = document.getElementById('new-student-class').value;
        const firstName = document.getElementById('new-student-firstname').value.trim();
        const lastName = document.getElementById('new-student-lastname').value.trim();

        if (!classId || !firstName || !lastName) {
            this.showToast('Compila tutti i campi', 'error');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/${classId}/students`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ first_name: firstName, last_name: lastName })
            });

            if (response.ok) {
                this.showToast('Studente aggiunto!', 'success');
                this.hideModal('add-student-modal');
                document.getElementById('new-student-firstname').value = '';
                document.getElementById('new-student-lastname').value = '';
                
                const filter = document.getElementById('student-class-filter');
                if (filter.value == classId) {
                    this.loadStudentsByClass(classId);
                }
            } else {
                const data = await response.json();
                this.showToast(data.error || 'Errore', 'error');
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showToast('Errore di connessione', 'error');
        }
    }

    async deleteStudent(id) {
        if (!confirm('Eliminare questo studente?')) return;

        try {
            await fetch(`${CONFIG.API_URL}/api/students/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            this.showToast('Studente eliminato', 'success');
            
            const filter = document.getElementById('student-class-filter');
            if (filter.value) this.loadStudentsByClass(filter.value);
        } catch (error) {
            console.error('Errore:', error);
        }
    }

    async loadAllSubjects() {
        const filter = document.getElementById('subject-class-filter');
        
        filter.addEventListener('change', () => {
            this.loadSubjectsByClass(filter.value);
        });

        if (filter.value) {
            this.loadSubjectsByClass(filter.value);
        }
    }

    async loadSubjectsByClass(classId) {
        if (!classId) {
            document.getElementById('subjects-grid').innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/${classId}/subjects`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const subjects = await response.json();

            const grid = document.getElementById('subjects-grid');
            grid.innerHTML = subjects.map((s, index) => `
                <div class="subject-card" style="--card-color: ${s.color}; animation: fadeInUp 0.4s ease ${index * 0.05}s backwards;">
                    <div class="subject-card-header">
                        <div>
                            <h4>${s.name}</h4>
                            <span class="subject-card-meta">${s.color}</span>
                        </div>
                        <div class="subject-card-actions">
                            <button class="btn btn-sm btn-secondary" onclick="app.resetSubject(${s.id})" title="Reset">
                                <i class="fas fa-undo"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="app.deleteSubject(${s.id})" title="Elimina">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Errore caricamento materie:', error);
        }
    }

    async addSubject() {
        const classId = document.getElementById('new-subject-class').value;
        const name = document.getElementById('new-subject-name').value.trim();
        const color = document.getElementById('new-subject-color').value;

        if (!classId || !name) {
            this.showToast('Compila tutti i campi', 'error');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/${classId}/subjects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ name, color })
            });

            if (response.ok) {
                this.showToast('Materia aggiunta!', 'success');
                this.hideModal('add-subject-modal');
                document.getElementById('new-subject-name').value = '';
                
                const filter = document.getElementById('subject-class-filter');
                if (filter.value == classId) {
                    this.loadSubjectsByClass(classId);
                }
            } else {
                const data = await response.json();
                this.showToast(data.error || 'Errore', 'error');
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showToast('Errore di connessione', 'error');
        }
    }

    async deleteSubject(id) {
        if (!confirm('Eliminare questa materia?')) return;

        try {
            await fetch(`${CONFIG.API_URL}/api/subjects/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            this.showToast('Materia eliminata', 'success');
            
            const filter = document.getElementById('subject-class-filter');
            if (filter.value) this.loadSubjectsByClass(filter.value);
        } catch (error) {
            console.error('Errore:', error);
        }
    }

    async resetSubject(id) {
        if (!confirm('Resettare questa materia? Tutti gli studenti torneranno disponibili.')) return;

        try {
            await fetch(`${CONFIG.API_URL}/api/subjects/${id}/reset`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            this.showToast('Materia resettata', 'success');
        } catch (error) {
            console.error('Errore:', error);
        }
    }

    async loadAdminCalendar() {
        this.renderCalendar('admin-calendar-grid', 'admin');
    }

    async loadExtractors() {
        const filter = document.getElementById('extractor-class-filter');
        
        filter.addEventListener('change', () => {
            this.loadExtractorsByClass(filter.value);
        });

        if (filter.value) {
            this.loadExtractorsByClass(filter.value);
        }
    }

    async loadExtractorsByClass(classId) {
        if (!classId) {
            document.getElementById('extractors-table-body').innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/${classId}/extractors`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const extractors = await response.json();

            const className = this.data.classes.find(c => c.id == classId)?.name || '';

            const tbody = document.getElementById('extractors-table-body');
            tbody.innerHTML = extractors.map((e, index) => `
                <tr style="animation: fadeInUp 0.3s ease ${index * 0.05}s backwards;">
                    <td>${e.username}</td>
                    <td>${className}</td>
                    <td>${new Date(e.assigned_at).toLocaleDateString('it-IT')}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteExtractor(${e.id})" title="Rimuovi">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Errore caricamento capoclasse:', error);
        }
    }

    async addExtractor() {
        const classId = document.getElementById('new-extractor-class').value;
        const username = document.getElementById('new-extractor-username').value.trim();
        const password = document.getElementById('new-extractor-password').value;

        if (!classId || !username || !password) {
            this.showToast('Compila tutti i campi', 'error');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/${classId}/extractors`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                this.showToast('Capoclasse assegnato!', 'success');
                this.hideModal('add-extractor-modal');
                document.getElementById('new-extractor-username').value = '';
                document.getElementById('new-extractor-password').value = '';
                
                const filter = document.getElementById('extractor-class-filter');
                if (filter.value == classId) {
                    this.loadExtractorsByClass(classId);
                }
            } else {
                const data = await response.json();
                this.showToast(data.error || 'Errore', 'error');
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showToast('Errore di connessione', 'error');
        }
    }

    async deleteExtractor(userId) {
        if (!confirm('Rimuovere questo capoclasse?')) return;

        try {
            await fetch(`${CONFIG.API_URL}/api/extractors/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            this.showToast('Capoclasse rimosso', 'success');
            
            const filter = document.getElementById('extractor-class-filter');
            if (filter.value) this.loadExtractorsByClass(filter.value);
        } catch (error) {
            console.error('Errore:', error);
        }
    }

    // ============================================
    // CAPOCLASSE VIEW
    // ============================================
    async initCapoclasseView() {
        const classDisplay = document.getElementById('capoclasse-class-display');
        if (classDisplay) {
            classDisplay.textContent = this.user.class?.name || 'Classe';
        }
        this.loadExtractionData();
    }

    async loadExtractionData() {
        const classId = this.user.class?.id;
        if (!classId) return;

        // Carica materie
        try {
            const subjectsRes = await fetch(`${CONFIG.API_URL}/api/classes/${classId}/subjects`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const subjects = await subjectsRes.json();
            this.data.subjects = subjects;

            const select = document.getElementById('extract-subject');
            select.innerHTML = '<option value="">Seleziona materia...</option>' + 
                subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');

            // Carica storico per filtro
            const historySelect = document.getElementById('history-subject-filter');
            if (historySelect) {
                historySelect.innerHTML = '<option value="">Tutte le materie</option>' + 
                    subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            }
        } catch (error) {
            console.error('Errore caricamento materie:', error);
        }

        // Imposta data odierna
        document.getElementById('extract-date').valueAsDate = new Date();

        // Aggiorna stato quando cambia materia
        document.getElementById('extract-subject').addEventListener('change', () => {
            this.updateExtractionStatus();
        });
    }

    async updateExtractionStatus() {
        const classId = this.user.class?.id;
        const subjectId = document.getElementById('extract-subject').value;

        if (!subjectId) {
            document.getElementById('status-total').textContent = '0';
            document.getElementById('status-interrogated').textContent = '0';
            document.getElementById('status-available').textContent = '0';
            return;
        }

        try {
            const response = await fetch(
                `${CONFIG.API_URL}/api/classes/${classId}/subjects/${subjectId}/status`,
                { headers: { 'Authorization': `Bearer ${this.token}` } }
            );
            const data = await response.json();

            this.animateNumber('status-total', data.total);
            this.animateNumber('status-interrogated', data.interrogated);
            this.animateNumber('status-available', data.remaining);
        } catch (error) {
            console.error('Errore:', error);
        }
    }

    async performExtraction() {
        const classId = this.user.class?.id;
        const subjectId = document.getElementById('extract-subject').value;
        const date = document.getElementById('extract-date').value;

        if (!subjectId || !date) {
            this.showToast('Seleziona materia e data', 'error');
            return;
        }

        const btn = document.querySelector('.extraction-card .btn-lg');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Estrazione...';
        btn.disabled = true;

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/extractions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ class_id: classId, subject_id: subjectId, date })
            });

            const data = await response.json();

            if (response.ok) {
                const resultDiv = document.getElementById('extraction-result');
                resultDiv.classList.remove('hidden');
                document.getElementById('result-student').textContent = 
                    `${data.student.first_name} ${data.student.last_name}`;
                document.getElementById('result-subject').textContent = data.subject.name;
                
                this.updateExtractionStatus();
                this.showToast('Estrazione completata!', 'success');
                
                // Scroll al risultato
                resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                if (data.allInterrogated) {
                    this.showToast('Tutti gli studenti sono stati interrogati. Resetta la materia.', 'warning');
                } else {
                    this.showToast(data.error || 'Errore estrazione', 'error');
                }
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showToast('Errore di connessione', 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }

    async loadCapoclasseCalendar() {
        this.renderCalendar('capoclasse-calendar-grid', 'capoclasse');
    }

    async loadExtractionHistory() {
        const classId = this.user.class?.id;
        const subjectId = document.getElementById('history-subject-filter').value;

        try {
            let url = `${CONFIG.API_URL}/api/classes/${classId}/extractions?limit=50`;
            if (subjectId) url += `&subject_id=${subjectId}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const extractions = await response.json();

            const tbody = document.getElementById('history-table-body');
            tbody.innerHTML = extractions.map((e, index) => `
                <tr style="animation: fadeInUp 0.3s ease ${index * 0.02}s backwards;">
                    <td>${new Date(e.extraction_date).toLocaleDateString('it-IT')}</td>
                    <td>
                        <span class="badge" style="background: ${e.subject_color}20; color: ${e.subject_color}; border: 1px solid ${e.subject_color}40;">
                            ${e.subject_name}
                        </span>
                    </td>
                    <td>${e.first_name} ${e.last_name}</td>
                    <td>${new Date(e.created_at).toLocaleString('it-IT')}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Errore caricamento storico:', error);
        }
    }

    // ============================================
    // STUDENT VIEW
    // ============================================
    async initStudentView() {
        const className = document.getElementById('student-class-name');
        if (className) {
            className.textContent = this.user.class?.name || 'Classe';
        }
        this.renderCalendar('student-calendar-grid', 'student');
        this.loadStudentSubjects();
    }

    async loadStudentSubjects() {
        const classId = this.user.class?.id;
        if (!classId) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/${classId}/subjects`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const subjects = await response.json();

            const legend = document.getElementById('student-subjects-legend');
            legend.innerHTML = subjects.map((s, index) => `
                <div class="legend-item" style="animation: fadeInUp 0.3s ease ${index * 0.05}s backwards;">
                    <span class="legend-dot" style="background: ${s.color}; box-shadow: 0 0 10px ${s.color}80;"></span>
                    <span>${s.name}</span>
                </div>
            `).join('');
        } catch (error) {
            console.error('Errore:', error);
        }
    }

    // ============================================
    // CALENDARIO
    // ============================================
    async renderCalendar(gridId, viewType) {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        // Aggiorna titolo
        const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        
        const titleId = viewType === 'student' ? 'student-calendar-month-year' : 
                       viewType === 'capoclasse' ? 'capoclasse-calendar-month-year' :
                       'calendar-month-year';
        
        const titleEl = document.getElementById(titleId);
        if (titleEl) titleEl.textContent = `${monthNames[month]} ${year}`;

        // Carica interrogazioni
        const classId = viewType === 'student' ? this.user.class?.id :
                       viewType === 'capoclasse' ? this.user.class?.id :
                       document.getElementById('calendar-class-filter')?.value;

        let interrogations = [];
        if (classId) {
            try {
                const token = viewType === 'student' ? '' : this.token;
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                
                const response = await fetch(
                    `${CONFIG.API_URL}/api/classes/${classId}/interrogations?month=${month + 1}&year=${year}`,
                    { headers }
                );
                interrogations = await response.json();
            } catch (error) {
                console.error('Errore caricamento interrogazioni:', error);
            }
        }

        // Genera griglia
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        let html = '';

        // Header giorni
        const dayNames = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
        dayNames.forEach(day => {
            html += `<div class="calendar-day-header">${day}</div>`;
        });

        // Giorni mese precedente
        for (let i = firstDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            html += `<div class="calendar-day other-month"><span class="calendar-day-number">${day}</span></div>`;
        }

        // Giorni mese corrente
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
            const dayInterrogations = interrogations.filter(i => {
                const d = new Date(i.date);
                return d.getDate() === day;
            });

            html += `<div class="calendar-day ${isToday ? 'today' : ''}" onclick="app.showDayDetail(${day}, ${month}, ${year})">`;
            html += `<span class="calendar-day-number">${day}</span>`;
            html += `<div class="calendar-day-events">`;
            dayInterrogations.forEach(i => {
                html += `<span class="calendar-event-dot" style="background: ${i.subject_color}"></span>`;
            });
            html += `</div></div>`;
        }

        // Giorni mese successivo
        const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
        const remainingCells = totalCells - (firstDay + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            html += `<div class="calendar-day other-month"><span class="calendar-day-number">${day}</span></div>`;
        }

        grid.innerHTML = html;
    }

    prevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.loadAdminCalendar();
    }

    nextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.loadAdminCalendar();
    }

    capoclassePrevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.loadCapoclasseCalendar();
    }

    capoclasseNextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.loadCapoclasseCalendar();
    }

    studentPrevMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.initStudentView();
    }

    studentNextMonth() {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.initStudentView();
    }

    async showDayDetail(day, month, year) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const classId = this.user.class?.id || document.getElementById('calendar-class-filter')?.value;
        
        if (!classId) return;

        document.getElementById('day-detail-title').innerHTML = 
            `<i class="fas fa-calendar-day"></i> ${day}/${month + 1}/${year}`;

        try {
            const response = await fetch(
                `${CONFIG.API_URL}/api/classes/${classId}/interrogations?month=${month + 1}&year=${year}`,
                { headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {} }
            );
            const interrogations = await response.json();
            const dayInterrogations = interrogations.filter(i => i.date === date);

            let html = '';
            if (dayInterrogations.length === 0) {
                html = '<p style="color: var(--gray-400); text-align: center; padding: 2rem;">Nessuna interrogazione programmata</p>';
            } else {
                html = '<div class="day-interrogations">';
                dayInterrogations.forEach(i => {
                    html += `
                        <div class="day-interrogation-item" style="border-left: 3px solid ${i.subject_color}; padding: 1rem; margin-bottom: 0.5rem; background: rgba(0,0,0,0.2); border-radius: var(--radius);">
                            <strong style="color: ${i.subject_color};">${i.subject_name}</strong>
                            ${i.notes ? `<p style="margin-top: 0.5rem; color: var(--gray-400);">${i.notes}</p>` : ''}
                        </div>
                    `;
                });
                html += '</div>';
            }

            document.getElementById('day-detail-content').innerHTML = html;
            this.showModal('day-detail-modal');
        } catch (error) {
            console.error('Errore:', error);
        }
    }

    // ============================================
    // MODALS
    // ============================================
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(m => {
            m.classList.remove('active');
        });
        document.body.style.overflow = '';
    }

    // ============================================
    // UTILITY
    // ============================================
    async populateClassSelects() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const classes = await response.json();
            this.data.classes = classes;

            const selects = [
                'student-class-filter',
                'subject-class-filter',
                'calendar-class-filter',
                'extractor-class-filter',
                'new-student-class',
                'new-subject-class',
                'new-extractor-class',
                'new-interrogation-class'
            ];

            selects.forEach(id => {
                const select = document.getElementById(id);
                if (select) {
                    const currentValue = select.value;
                    const placeholder = select.options[0]?.text || 'Seleziona classe...';
                    select.innerHTML = `<option value="">${placeholder}</option>` + 
                        classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                    select.value = currentValue;
                }
            });
        } catch (error) {
            console.error('Errore caricamento classi:', error);
        }
    }

    async loadSubjectsForInterrogation() {
        const classId = document.getElementById('new-interrogation-class').value;
        const select = document.getElementById('new-interrogation-subject');
        
        if (!classId) {
            select.innerHTML = '<option value="">Seleziona materia...</option>';
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/${classId}/subjects`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const subjects = await response.json();
            
            select.innerHTML = '<option value="">Seleziona materia...</option>' + 
                subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        } catch (error) {
            console.error('Errore:', error);
        }
    }

    async addInterrogation() {
        const classId = document.getElementById('new-interrogation-class').value;
        const subjectId = document.getElementById('new-interrogation-subject').value;
        const date = document.getElementById('new-interrogation-date').value;
        const notes = document.getElementById('new-interrogation-notes').value.trim();

        if (!classId || !subjectId || !date) {
            this.showToast('Compila tutti i campi obbligatori', 'error');
            return;
        }

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/interrogations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({ class_id: classId, subject_id: subjectId, date, notes })
            });

            if (response.ok) {
                this.showToast('Interrogazione programmata!', 'success');
                this.hideModal('add-interrogation-modal');
                document.getElementById('new-interrogation-notes').value = '';
                this.loadAdminCalendar();
            } else {
                const data = await response.json();
                this.showToast(data.error || 'Errore', 'error');
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showToast('Errore di connessione', 'error');
        }
    }

    viewClassDetails(classId) {
        this.showToast('Funzionalità in sviluppo', 'info');
    }

    // ============================================
    // TOAST NOTIFICATIONS
    // ============================================
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };

        toast.innerHTML = `
            <i class="fas fa-${icons[type]}"></i>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Auto remove
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.4s ease reverse forwards';
            setTimeout(() => toast.remove(), 400);
        }, 5000);
    }

    showLoading(show) {
        const overlay = document.getElementById('loading-overlay');
        overlay.classList.toggle('hidden', !show);
    }
}

// ============================================
// INIZIALIZZAZIONE APP
// ============================================
const app = new App();

// Aggiungi stili per animazioni aggiuntive
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-10px); }
    }
    
    .shake {
        animation: shake 0.5s ease !important;
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);
