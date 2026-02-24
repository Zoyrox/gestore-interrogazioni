/**
 * GESTORE INTERROGAZIONI SCOLASTICHE
 * Applicazione Frontend JavaScript
 */

// ============================================
// CONFIGURAZIONE
// ============================================
const CONFIG = {
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : '', // In produzione, usa lo stesso dominio
    AUTH_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:5000'
        : '', // In produzione, usa lo stesso dominio
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
        this.checkAuth();
    }

    bindEvents() {
        // Tab login
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
                document.querySelector('.color-value').textContent = e.target.value.toUpperCase();
            });
        }
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
                this.showView('student');
                this.initStudentView();
                this.showToast('Accesso effettuato!', 'success');
            } else {
                this.showToast(data.error || 'Codice non valido', 'error');
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
                this.showView('capoclasse');
                this.initCapoclasseView();
                this.showToast('Benvenuto, Capoclasse!', 'success');
            } else {
                this.showToast(data.error || 'Credenziali non valide', 'error');
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
                this.showView('admin');
                this.initAdminView();
                this.showToast('Benvenuto, Admin!', 'success');
            } else {
                this.showToast(data.error || 'Credenziali non valide', 'error');
            }
        } catch (error) {
            console.error('Errore login admin:', error);
            // Fallback: prova login diretto sul backend principale
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
        this.showView('login');
        this.switchLoginTab('student');
    }

    switchLoginTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        document.querySelectorAll('.login-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${tab}-login`).classList.add('active');
    }

    togglePassword(inputId) {
        const input = document.getElementById(inputId);
        const type = input.type === 'password' ? 'text' : 'password';
        input.type = type;
    }

    // ============================================
    // NAVIGAZIONE VIEWS
    // ============================================
    showView(viewName) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });
        document.getElementById(`${viewName}-view`).classList.remove('hidden');
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
        // Aggiorna nav attiva
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });

        // Mostra sezione
        const view = this.currentView;
        document.querySelectorAll(`#${view}-view .content-section`).forEach(sec => {
            sec.classList.add('hidden');
        });
        document.getElementById(`${view}-${section}-section`).classList.remove('hidden');

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
        if (titleEl) titleEl.textContent = titles[section] || section;

        // Carica dati sezione
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
    }

    // ============================================
    // ADMIN VIEW
    // ============================================
    async initAdminView() {
        document.getElementById('admin-username-display').textContent = this.user.username;
        this.loadDashboardStats();
        this.populateClassSelects();
    }

    async loadDashboardStats() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/stats`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();

            document.getElementById('stat-classes').textContent = data.total_classes;
            document.getElementById('stat-students').textContent = data.total_students;
            document.getElementById('stat-subjects').textContent = data.total_subjects;
            document.getElementById('stat-extractions').textContent = data.total_extractions;
        } catch (error) {
            console.error('Errore caricamento stats:', error);
        }
    }

    async loadClasses() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const classes = await response.json();
            this.data.classes = classes;

            const tbody = document.getElementById('classes-table-body');
            tbody.innerHTML = classes.map(c => `
                <tr>
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
                document.getElementById('new-class-name').value = '';
                document.getElementById('new-class-year').value = '';
                document.getElementById('new-class-section').value = '';
            } else {
                this.showToast(data.error || 'Errore creazione classe', 'error');
            }
        } catch (error) {
            console.error('Errore:', error);
            this.showToast('Errore di connessione', 'error');
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
            tbody.innerHTML = students.map(s => `
                <tr>
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
            grid.innerHTML = subjects.map(s => `
                <div class="subject-card" style="border-left-color: ${s.color}">
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
            tbody.innerHTML = extractors.map(e => `
                <tr>
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
        document.getElementById('capoclasse-class-display').textContent = this.user.class?.name || 'Classe';
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

        this.showLoading(true);

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
            this.showLoading(false);
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
            tbody.innerHTML = extractions.map(e => `
                <tr>
                    <td>${new Date(e.extraction_date).toLocaleDateString('it-IT')}</td>
                    <td>
                        <span class="badge" style="background: ${e.subject_color}">
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
        document.getElementById('student-class-name').textContent = this.user.class?.name || 'Classe';
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
            legend.innerHTML = subjects.map(s => `
                <div class="legend-item">
                    <span class="legend-dot" style="background: ${s.color}"></span>
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
                html = '<p class="text-muted">Nessuna interrogazione programmata</p>';
            } else {
                html = '<div class="day-interrogations">';
                dayInterrogations.forEach(i => {
                    html += `
                        <div class="day-interrogation-item" style="border-left: 3px solid ${i.subject_color}">
                            <strong>${i.subject_name}</strong>
                            ${i.notes ? `<p>${i.notes}</p>` : ''}
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
        document.getElementById(modalId).classList.add('active');
    }

    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
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
        // Implementa se necessario
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

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    showLoading(show) {
        document.getElementById('loading-overlay').classList.toggle('hidden', !show);
    }
}

// ============================================
// INIZIALIZZAZIONE APP
// ============================================
const app = new App();
