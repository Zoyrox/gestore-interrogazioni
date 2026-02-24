/**
 * GESTORE INTERROGAZIONI SCOLASTICHE
 * Frontend JavaScript
 */

// ============================================
// CONFIGURAZIONE
// ============================================
const CONFIG = {
    // In produzione usa lo stesso dominio (relativo)
    // In locale usa localhost:3000
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : '',
    ANIMATION_DURATION: 300
};

// ============================================
// CLASSE APP
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

        // Navigazione
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.currentTarget.dataset.section;
                this.navigateTo(section);
            });
        });

        // Chiudi modal con ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hideAllModals();
        });

        // Chiudi modal cliccando fuori
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
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
            const response = await fetch(`${CONFIG.API_URL}/api/auth/admin/login`, {
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
            console.error('Errore login:', error);
            this.showToast('Errore di connessione al server', 'error');
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

    // ============================================
    // NAVIGAZIONE
    // ============================================
    showView(viewName) {
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });
        const view = document.getElementById(`${viewName}-view`);
        if (view) {
            view.classList.remove('hidden');
            this.currentView = viewName;
        }
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
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.section === section);
        });

        const view = this.currentView;
        document.querySelectorAll(`#${view}-view .content-section`).forEach(sec => {
            sec.classList.add('hidden');
        });

        const sectionEl = document.getElementById(`${view}-${section}-section`);
        if (sectionEl) {
            sectionEl.classList.remove('hidden');
        }

        // Carica dati
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
    // ADMIN
    // ============================================
    async initAdminView() {
        const display = document.getElementById('admin-username-display');
        if (display) display.textContent = this.user.username;
        this.loadDashboardStats();
        this.populateClassSelects();
    }

    async loadDashboardStats() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/stats`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const data = await response.json();

            this.setText('stat-classes', data.total_classes);
            this.setText('stat-students', data.total_students);
            this.setText('stat-subjects', data.total_subjects);
            this.setText('stat-extractions', data.total_extractions);
        } catch (error) {
            console.error('Errore stats:', error);
        }
    }

    setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    async loadClasses() {
        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const classes = await response.json();
            this.data.classes = classes;

            const tbody = document.getElementById('classes-table-body');
            if (tbody) {
                tbody.innerHTML = classes.map(c => `
                    <tr>
                        <td><strong>${c.name}</strong></td>
                        <td>${c.year || '-'}/${c.section || '-'}</td>
                        <td><code>${c.code}</code></td>
                        <td>${c.student_count || 0}</td>
                        <td>${c.subject_count || 0}</td>
                        <td>
                            <button class="btn btn-sm btn-danger" onclick="app.deleteClass(${c.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Errore classi:', error);
        }
    }

    async createClass() {
        const name = document.getElementById('new-class-name')?.value.trim();
        const year = document.getElementById('new-class-year')?.value;
        const section = document.getElementById('new-class-section')?.value.trim();

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
            } else {
                this.showToast(data.error || 'Errore', 'error');
            }
        } catch (error) {
            this.showToast('Errore di connessione', 'error');
        }
    }

    async deleteClass(id) {
        if (!confirm('Sei sicuro?')) return;

        try {
            await fetch(`${CONFIG.API_URL}/api/classes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            this.showToast('Classe eliminata', 'success');
            this.loadClasses();
        } catch (error) {
            this.showToast('Errore', 'error');
        }
    }

    async loadAllStudents() {
        await this.populateClassSelects();
    }

    async loadStudentsByClass(classId) {
        if (!classId) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/${classId}/students`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const students = await response.json();

            const tbody = document.getElementById('students-table-body');
            if (tbody) {
                tbody.innerHTML = students.map(s => `
                    <tr>
                        <td>${s.last_name}</td>
                        <td>${s.first_name}</td>
                        <td>
                            <button class="btn btn-sm btn-danger" onclick="app.deleteStudent(${s.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Errore studenti:', error);
        }
    }

    async addStudent() {
        const classId = document.getElementById('new-student-class')?.value;
        const firstName = document.getElementById('new-student-firstname')?.value.trim();
        const lastName = document.getElementById('new-student-lastname')?.value.trim();

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
                this.loadStudentsByClass(classId);
            }
        } catch (error) {
            this.showToast('Errore', 'error');
        }
    }

    async deleteStudent(id) {
        if (!confirm('Eliminare?')) return;

        try {
            await fetch(`${CONFIG.API_URL}/api/students/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            this.showToast('Studente eliminato', 'success');
            const filter = document.getElementById('student-class-filter');
            if (filter) this.loadStudentsByClass(filter.value);
        } catch (error) {
            this.showToast('Errore', 'error');
        }
    }

    async loadAllSubjects() {
        // Implementa se necessario
    }

    async loadSubjectsByClass(classId) {
        if (!classId) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/${classId}/subjects`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const subjects = await response.json();

            const grid = document.getElementById('subjects-grid');
            if (grid) {
                grid.innerHTML = subjects.map(s => `
                    <div class="subject-card" style="border-left-color: ${s.color}">
                        <h4>${s.name}</h4>
                        <button class="btn btn-sm btn-danger" onclick="app.deleteSubject(${s.id})">Elimina</button>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Errore materie:', error);
        }
    }

    async addSubject() {
        const classId = document.getElementById('new-subject-class')?.value;
        const name = document.getElementById('new-subject-name')?.value.trim();
        const color = document.getElementById('new-subject-color')?.value;

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
                this.loadSubjectsByClass(classId);
            }
        } catch (error) {
            this.showToast('Errore', 'error');
        }
    }

    async deleteSubject(id) {
        if (!confirm('Eliminare?')) return;

        try {
            await fetch(`${CONFIG.API_URL}/api/subjects/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            this.showToast('Materia eliminata', 'success');
        } catch (error) {
            this.showToast('Errore', 'error');
        }
    }

    async loadAdminCalendar() {
        // Implementa
    }

    async loadExtractors() {
        // Implementa
    }

    // ============================================
    // CAPOCLASSE
    // ============================================
    async initCapoclasseView() {
        const display = document.getElementById('capoclasse-class-display');
        if (display) display.textContent = this.user.class?.name || 'Classe';
        this.loadExtractionData();
    }

    async loadExtractionData() {
        const classId = this.user.class?.id;
        if (!classId) return;

        try {
            const response = await fetch(`${CONFIG.API_URL}/api/classes/${classId}/subjects`, {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });
            const subjects = await response.json();
            this.data.subjects = subjects;

            const select = document.getElementById('extract-subject');
            if (select) {
                select.innerHTML = '<option value="">Seleziona...</option>' + 
                    subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
            }
        } catch (error) {
            console.error('Errore:', error);
        }

        const dateInput = document.getElementById('extract-date');
        if (dateInput) dateInput.valueAsDate = new Date();
    }

    async extractStudent() {
        const classId = this.user.class?.id;
        const subjectId = document.getElementById('extract-subject')?.value;
        const date = document.getElementById('extract-date')?.value;

        if (!subjectId || !date) {
            this.showToast('Seleziona materia e data', 'error');
            return;
        }

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
                this.showToast(`Estratto: ${data.student.first_name} ${data.student.last_name}`, 'success');
            } else {
                this.showToast(data.error || 'Errore', 'error');
            }
        } catch (error) {
            this.showToast('Errore di connessione', 'error');
        }
    }

    async loadExtractionHistory() {
        // Implementa
    }

    async loadCapoclasseCalendar() {
        // Implementa
    }

    // ============================================
    // STUDENTE
    // ============================================
    async initStudentView() {
        const display = document.getElementById('student-class-display');
        if (display) display.textContent = this.user.class?.name || 'Classe';
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

            ['student-class-filter', 'new-student-class', 'new-subject-class'].forEach(id => {
                const select = document.getElementById(id);
                if (select) {
                    select.innerHTML = '<option value="">Seleziona...</option>' +
                        classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                }
            });
        } catch (error) {
            console.error('Errore:', error);
        }
    }

    showToast(message, type = 'info') {
        // Crea toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
            color: white;
            border-radius: 5px;
            z-index: 9999;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    showLoading(show) {
        // Implementa se necessario
    }

    showModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('active');
    }

    hideModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('active');
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
    }
}

// Inizializza
const app = new App();
