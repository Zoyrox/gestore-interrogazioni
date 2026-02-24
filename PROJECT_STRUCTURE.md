# 📁 Struttura Progetto

```
gestore-interrogazioni/
│
├── 📄 File di Configurazione Root
│   ├── .env.example              # Template variabili d'ambiente
│   ├── .gitignore               # File ignorati da Git
│   ├── CHANGELOG.md             # Storico modifiche
│   ├── CONTRIBUTING.md          # Guida contributi
│   ├── LICENSE                  # Licenza MIT
│   ├── PROJECT_STRUCTURE.md     # Questo file
│   ├── README.md                # Documentazione principale
│   └── render.yaml              # Configurazione Render.com
│
├── 🔧 backend/                  # Node.js + Express API
│   ├── server.js               # Entry point (REQUIRED for Render)
│   ├── package.json            # Dipendenze Node.js
│   ├── jest.config.js          # Configurazione test
│   ├── Procfile                # Comando avvio Render
│   └── tests/                  # Test unitari
│       └── auth.test.js
│
├── 🔐 auth-service/            # Flask Auth Microservice
│   ├── app.py                  # Applicazione Flask
│   ├── requirements.txt        # Dipendenze Python
│   └── Procfile                # Comando avvio Render
│
├── 🎨 frontend/                # HTML/CSS/JS SPA
│   ├── index.html              # Pagina principale
│   ├── styles.css              # Stili CSS
│   └── app.js                  # Logica JavaScript
│
├── 🗄️ database/                # Schema e script DB
│   ├── schema.sql              # Schema PostgreSQL
│   └── init.js                 # Script inizializzazione
│
├── 📚 docs/                    # Documentazione
│   └── API.md                  # Documentazione API
│
└── 🔨 scripts/                 # Script utilità
    └── setup.sh                # Script setup automatico
```

## 📊 Statistiche

| Componente | File | Linee Codice (stimata) |
|------------|------|------------------------|
| Backend | 6 | ~800 |
| Auth Service | 3 | ~400 |
| Frontend | 3 | ~1500 |
| Database | 2 | ~300 |
| Docs | 7 | ~800 |
| **Totale** | **21** | **~3800** |

## 🎯 Punti di Ingresso

| Servizio | File | Porta Default |
|----------|------|---------------|
| Backend API | `backend/server.js` | 3000 |
| Auth Service | `auth-service/app.py` | 5000 |
| Frontend | `frontend/index.html` | 80 |

## 🔌 Integrazioni

- **Database**: PostgreSQL 14+
- **Deploy**: Render.com (Web Services + PostgreSQL)
- **Auth**: JWT (JSON Web Tokens)
- **Security**: bcrypt, helmet, cors, rate-limit

## 📦 Dipendenze Principali

### Backend (Node.js)
- express
- pg (PostgreSQL)
- bcrypt
- jsonwebtoken
- helmet
- cors
- express-rate-limit

### Auth Service (Python)
- Flask
- Flask-CORS
- Werkzeug
- PyJWT
- psycopg2-binary
- gunicorn

### Frontend (Vanilla JS)
- Nessuna dipendenza esterna
- Font Awesome (CDN)

## 🚀 Deploy Rapido

1. **Database**: Crea PostgreSQL su Render
2. **Backend**: Deploy `backend/` come Web Service Node
3. **Auth**: Deploy `auth-service/` come Web Service Python
4. **Frontend**: Deploy `frontend/` come Static Site

Vedi `README.md` per istruzioni dettagliate.
