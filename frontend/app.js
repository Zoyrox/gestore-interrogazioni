/**
 * GESTORE INTERROGAZIONI SCOLASTICHE
 * Applicazione Frontend JavaScript v2.0
 * Con animazioni spettacolari
 */

// ============================================
// CONFIGURAZIONE
// ============================================
// ⚠️ IMPORTANTE: Configura qui gli URL dei tuoi servizi Render
const CONFIG = {
    // Backend Node.js API - in produzione lascia vuoto per stesso dominio
    // Oppure inserisci l'URL completo: 'https://tuo-backend.onrender.com'
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : '',
    
    // Auth Service Flask - USA SEMPRE API_URL in produzione (proxy)
    // Non contattare direttamente Flask dal frontend!
    AUTH_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:5000'
        : '',  // In prod: usa API_URL come proxy
    
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
            // 🔧 FIX: In produzione usa API_URL (proxy), non AUTH_URL diretto
            const authUrl = CONFIG.AUTH_URL || CONFIG.API_URL;
            const response = await fetch(`${authUrl}/api/auth/admin/login`, {
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
            this.showToast('Servizio auth non disponibile. Verifica la configurazione.', 'error');
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

            document.getElementById('status-total').textContent = data.total;
            document.getElementById('status-interrogated').textContent = data.interrogated;
            document.getElementById('status-available').textContent = data.remaining;
        } catch (error) {
            console.error('Errore caricamento stato:', error);
        }
    }

    async extractStudent() {
        const classId = this.user.class?.id;
        const subjectId = document.getElementById('extract-subject').value;
        const date = document.getElementById('extract-date').value;

        if (!subjectId || !date) {
            this.showToast('Seleziona materia e data', 'error');
            return;
        }

        const btn = document.getElementById('extract-btn');
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
                this.showExtractionResult(data);
                this.updateExtractionStatus();
            } else {
                if (data.allInterrogated) {
                    this.showToast('Tutti gli studenti sono stati interrogati! Resetta la materia.', 'warning');
                } else {
                    this.showToast(data.error || 'Errore estrazione', 'error');
                }
            }
        } catch (error) {
            console.error('Errore estrazione:', error);
            this.showToast('Errore di connessione', 'error');
        } finally {
            btn.innerHTML = '<i class="fas fa-random"></i> Estrai Studente';
            btn.disabled = false;
        }
    }

    showExtractionResult(data) {
        const modal = document.getElementById('extraction-result-modal');
        const content = document.getElementById('extraction-result-content');
        
        content.innerHTML = `
            <div class="extraction-result" style="--subject-color: ${data.subject.color}">
                <div class="result-student">${data.student.first_name} ${data.student.last_name}</div>
                <div class="result-subject">${data.subject.name}</div>
                <div class="result-meta">Rimangono ${data.remaining} studenti da interrogare</div>
            </div>
        `;
        
        modal.classList.add('active');
    }

    async loadExtractionHistory() {
        const classId = this.user.class?.id;
        const subjectFilter = document.getElementById('history-subject-filter')?.value;

        try {
            let url = `${CONFIG.API_URL}/api/classes/${classId}/extractions`;
            if (subjectFilter) url += `?subject_id=${subjectFilter}`;

            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const extractions = await response.json();

            const tbody = document.getElementById('history-table-body');
            if (extractions.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center">Nessuna estrazione</td></tr>';
                return;
            }

            tbody.innerHTML = extractions.map((e, index) => `
                <tr style="animation: fadeInUp 0.3s ease ${index * 0.05}s backwards;">
                    <td>${new Date(e.extraction_date).toLocaleDateString('it-IT')}</td>
                    <td><span class="subject-badge" style="background: ${e.subject_color}">${e.subject_name}</span></td>
                    <td><strong>${e.last_name} ${e.first_name}</strong></td>
                    <td>${new Date(e.created_at).toLocaleDateString('it-IT')}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Errore caricamento storico:', error);
        }
    }

    async loadCapoclasseCalendar() {
        this.renderCalendar('capoclasse-calendar-grid', 'capoclasse');
    }

    // ============================================
    // STUDENT VIEW
    // ============================================
    async initStudentView() {
        const classDisplay = document.getElementById('student-class-display');
        if (classDisplay) {
            classDisplay.textContent = this.user.class?.name || 'Classe';
        }
        this.loadStudentCalendar();
        this.loadStudentSubjects();
    }

    async loadStudentSubjects() {
        const classId = this.user.class?.id;
        if (!classId) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/${classId}/subjects`);
            const subjects = await response.json();

            const grid = document.getElementById('student-subjects-grid');
            grid.innerHTML = subjects.map((s, index) => `
                <div class="subject-card" style="--card-color: ${s.color}; animation: fadeInUp 0.4s ease ${index * 0.05}s backwards;">
                    <div class="subject-card-header">
                        <div>
                            <h4>${s.name}</h4>
                            <span class="subject-card-meta">${s.color}</span>
                        </div>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            console.error('Errore caricamento materie:', error);
        }
    }

    async loadStudentCalendar() {
        this.renderCalendar('student-calendar-grid', 'student');
    }

    // ============================================
    // CALENDARIO
    // ============================================
    renderCalendar(gridId, viewType) {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Aggiorna titolo
        const titleEl = document.getElementById(`${viewType}-calendar-title`);
        if (titleEl) {
            titleEl.textContent = new Date(year, month).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
        }

        // Primo giorno del mese
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay() || 7; // 1 = Lunedì

        let html = '';
        
        // Celle vuote prima del primo giorno
        for (let i = 1; i < startingDay; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // Giorni del mese
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
            
            html += `
                <div class="calendar-day ${isToday ? 'today' : ''}" data-date="${dateStr}">
                    <span class="day-number">${day}</span>
                    <div class="day-events"></div>
                </div>
            `;
        }

        grid.innerHTML = html;

        // Carica interrogazioni
        this.loadCalendarEvents(viewType, year, month + 1);
    }

    async loadCalendarEvents(viewType, year, month) {
        const classId = this.user.class?.id || (viewType === 'admin' ? null : this.user.class?.id);
        if (!classId) return;

        try {
            const response = await fetch(
                `${CONFIG.API_URL}/api/classes/${classId}/interrogations?year=${year}&month=${month}`,
                { headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {} }
            );
            const interrogations = await response.json();

            interrogations.forEach(i => {
                const date = new Date(i.date);
                const day = date.getDate();
                const dayEl = document.querySelector(`#${viewType}-calendar-grid .calendar-day:nth-child(${day + new Date(year, month - 1, 1).getDay()}) .day-events`);
                
                if (dayEl) {
                    const event = document.createElement('div');
                    event.className = 'calendar-event';
                    event.style.background = i.subject_color;
                    event.textContent = i.subject_name;
                    dayEl.appendChild(event);
                }
            });
        } catch (error) {
            console.error('Errore caricamento interrogazioni:', error);
        }
    }

    prevMonth(viewType) {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
        this.renderCalendar(`${viewType}-calendar-grid`, viewType);
    }

    nextMonth(viewType) {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
        this.renderCalendar(`${viewType}-calendar-grid`, viewType);
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
                'new-student-class',
                'subject-class-filter',
                'new-subject-class',
                'extractor-class-filter',
                'new-extractor-class'
            ];

            selects.forEach(id => {
                const select = document.getElementById(id);
                if (select) {
                    const isFilter = id.includes('filter');
                    select.innerHTML = (isFilter ? '<option value="">Tutte le classi</option>' : '<option value="">Seleziona classe...</option>') +
                        classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                }
            });
        } catch (error) {
            console.error('Errore caricamento classi:', error);
        }
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        const container = document.getElementById('toast-container') || document.body;
        container.appendChild(toast);

        // Anima in
        requestAnimationFrame(() => {
            toast.style.animation = 'slideInRight 0.3s ease';
        });

        // Rimuovi dopo 3 secondi
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    showLoading(show) {
        let loader = document.getElementById('global-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.innerHTML = '<div class="spinner"></div>';
            document.body.appendChild(loader);
        }
        loader.style.display = show ? 'flex' : 'none';
    }

    showModal(modalId) {
        document.getElementById(modalId)?.classList.add('active');
    }

    hideModal(modalId) {
        document.getElementById(modalId)?.classList.remove('active');
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    }

    viewClassDetails(classId) {
        // Implementa se necessario
        console.log('View class details:', classId);
    }
}

// ============================================
// INIZIALIZZAZIONE APP
// ============================================
const app = new App();
