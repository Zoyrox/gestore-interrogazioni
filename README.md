# 📚 Gestore Interrogazioni Scolastiche

Sistema completo per la gestione delle interrogazioni scolastiche con estrazione casuale degli studenti, calendario interattivo e gestione multi-classe.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-blue.svg)](https://flask.palletsprojects.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 🏗️ Architettura

Il progetto è strutturato come segue:

```
gestore-interrogazioni/
├── backend/              # Node.js + Express (API principale)
│   ├── server.js        # Entry point
│   └── package.json
├── auth-service/        # Flask (Microservizio Auth Admin)
│   ├── app.py
│   ├── requirements.txt
│   └── Procfile
├── frontend/            # HTML/CSS/JS (SPA)
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── database/            # Schema PostgreSQL
│   └── schema.sql
├── .env.example         # Template variabili d'ambiente
└── README.md
```

## 👥 Sistema Ruoli

### 1️⃣ Admin
- Accesso protetto tramite Flask Auth Service
- Gestione completa classi, studenti, materie
- Assegnazione capoclasse
- Programmazione interrogazioni calendario
- Esclusioni studenti per date specifiche

### 2️⃣ Capoclasse (Estrattore)
- Accesso con credenziali dedicate
- Estrazione casuale studenti per materia
- Visualizzazione calendario classe
- Storico estrazioni

### 3️⃣ Studenti (Accesso Pubblico)
- Accesso tramite codice classe univoco
- Visualizzazione calendario interrogazioni
- Visualizzazione materie e colori
- **Sola lettura**

## 🚀 Deploy su Render.com

### Passo 1: Database PostgreSQL

1. Vai su [Render Dashboard](https://dashboard.render.com/)
2. Clicca **New** → **PostgreSQL**
3. Configura:
   - **Name**: `gestore-interrogazioni-db`
   - **Region**: Scegli la più vicina
   - **Plan**: Free (o superiore per produzione)
4. Clicca **Create Database**
5. Copia la **Internal Connection URL** (la userai dopo)

### Passo 2: Microservizio Auth (Flask)

1. Clicca **New** → **Web Service**
2. Connetti il tuo repository GitHub
3. Configura:
   - **Name**: `gestore-interrogazioni-auth`
   - **Root Directory**: `auth-service`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
4. Aggiungi Environment Variables:
   ```
   DATABASE_URL = <Internal Connection URL del DB>
   SECRET_KEY = <genera una chiave casuale lunga>
   JWT_SECRET = <genera un'altra chiave casuale>
   ADMIN_USERNAME = admin
   ADMIN_PASSWORD_HASH = <vedi sotto come generare>
   NODE_ENV = production
   ```
5. Clicca **Create Web Service**

### Passo 3: Backend Principale (Node.js)

1. Clicca **New** → **Web Service**
2. Connetti lo stesso repository
3. Configura:
   - **Name**: `gestore-interrogazioni-api`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. Aggiungi Environment Variables:
   ```
   DATABASE_URL = <Internal Connection URL del DB>
   JWT_SECRET = <stessa chiave usata per auth>
   NODE_ENV = production
   ```
5. Clicca **Create Web Service**

### Passo 4: Frontend (Static Site)

1. Clicca **New** → **Static Site**
2. Connetti lo stesso repository
3. Configura:
   - **Name**: `gestore-interrogazioni`
   - **Root Directory**: `frontend`
   - **Build Command**: (lascia vuoto)
   - **Publish Directory**: `./`
4. Clicca **Create Static Site**

## 🔐 Generazione Password Hash

### Con Node.js:
```bash
node -e "console.log(require('bcrypt').hashSync('TuaPassword123!', 10))"
```

### Con Python:
```python
from werkzeug.security import generate_password_hash
print(generate_password_hash('TuaPassword123!'))
```

## 🗄️ Setup Database

Dopo aver creato il database su Render, esegui lo schema:

```bash
# Usando psql locale con la External Connection URL
psql <EXTERNAL_CONNECTION_URL> -f database/schema.sql
```

Oppure usa il **SQL Shell** nel dashboard di Render.

## ⚙️ Variabili d'Ambiente Complete

### Backend (Node.js)
| Variabile | Descrizione | Obbligatorio |
|-----------|-------------|--------------|
| `DATABASE_URL` | URL PostgreSQL | ✅ |
| `JWT_SECRET` | Chiave JWT | ✅ |
| `NODE_ENV` | Ambiente (production) | ✅ |
| `PORT` | Porta (Render la imposta) | ❌ |

### Auth Service (Flask)
| Variabile | Descrizione | Obbligatorio |
|-----------|-------------|--------------|
| `DATABASE_URL` | URL PostgreSQL | ✅ |
| `SECRET_KEY` | Chiave sessioni Flask | ✅ |
| `JWT_SECRET` | Chiave JWT (stessa del backend) | ✅ |
| `ADMIN_USERNAME` | Username admin | ✅ |
| `ADMIN_PASSWORD_HASH` | Password hashata | ✅ |
| `NODE_ENV` | Ambiente | ✅ |

## 🛠️ Sviluppo Locale

### Requisiti
- Node.js 18+
- Python 3.9+
- PostgreSQL 14+

### Setup

```bash
# 1. Clona il repository
git clone <repo-url>
cd gestore-interrogazioni

# 2. Configura database locale
createdb gestore_interrogazioni
psql gestore_interrogazioni < database/schema.sql

# 3. Configura variabili d'ambiente
cp .env.example .env
# Modifica .env con i tuoi valori

# 4. Avvia Backend
cd backend
npm install
npm run dev

# 5. Avvia Auth Service (nuovo terminale)
cd auth-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
flask run --port=5000

# 6. Apri Frontend
# Apri frontend/index.html nel browser
# O usa un server statico: npx serve frontend
```

## 📱 Utilizzo

### Primo Accesso Admin
1. Vai alla pagina di login
2. Seleziona la tab "Admin"
3. Inserisci le credenziali configurate nelle env vars

### Creazione Classe
1. Dalla dashboard admin, clicca "Nuova Classe"
2. Inserisci nome, anno e sezione
3. Il sistema genera automaticamente un codice univoco
4. Condividi il codice con gli studenti

### Assegnazione Capoclasse
1. Vai su "Gestione Capoclasse"
2. Seleziona la classe
3. Clicca "Assegna Capoclasse"
4. Inserisci username e password

### Estrazione
1. Il capoclasse accede con le sue credenziali
2. Seleziona la materia
3. Clicca "Estrai Studente"
4. Il sistema estrae casualmente uno studente disponibile

## 🔒 Sicurezza

- ✅ Password hashate con bcrypt
- ✅ JWT con scadenza
- ✅ Rate limiting su API
- ✅ Helmet per headers sicurezza
- ✅ CORS configurato
- ✅ Input sanitizzato
- ✅ SQL injection protetto (parametrizzato)

## 📊 Database Schema

```
users (admin, capoclasse)
├── classes
│   ├── students
│   ├── subjects
│   ├── interrogations
│   └── extraction_history
├── exclusions
└── class_extractors
```

## 🐛 Troubleshooting

### Errore CORS
Verifica che `FRONTEND_URL` sia configurato correttamente o lascialo vuoto.

### Database Connection Failed
- Verifica che `DATABASE_URL` sia corretto
- Su Render, usa la **Internal Connection URL** per servizi nello stesso region

### JWT Non Valido
- Assicurati che `JWT_SECRET` sia identico in entrambi i servizi

### Porta Già in Uso
- Render imposta automaticamente la porta tramite variabile `PORT`
- Non impostare manualmente `PORT` in produzione

## 📝 API Endpoints

### Autenticazione
- `POST /api/auth/login` - Login capoclasse
- `POST /api/auth/admin/login` - Login admin (Flask)
- `GET /api/auth/verify` - Verifica token

### Classi
- `GET /api/classes` - Lista classi
- `POST /api/classes` - Crea classe
- `GET /api/classes/:id` - Dettaglio classe
- `DELETE /api/classes/:id` - Elimina classe
- `POST /api/classes/access` - Accesso con codice

### Studenti
- `GET /api/classes/:id/students` - Lista studenti
- `POST /api/classes/:id/students` - Aggiungi studente
- `DELETE /api/students/:id` - Elimina studente

### Materie
- `GET /api/classes/:id/subjects` - Lista materie
- `POST /api/classes/:id/subjects` - Aggiungi materia
- `DELETE /api/subjects/:id` - Elimina materia
- `POST /api/subjects/:id/reset` - Reset materia

### Interrogazioni
- `GET /api/classes/:id/interrogations` - Lista interrogazioni
- `POST /api/interrogations` - Programma interrogazione
- `DELETE /api/interrogations/:id` - Elimina interrogazione

### Estrazioni
- `POST /api/extractions` - Estrai studente
- `GET /api/classes/:id/extractions` - Storico estrazioni
- `GET /api/classes/:id/subjects/:id/status` - Stato materia

## 🤝 Contributi

Contributi sono benvenuti! Per favore:
1. Fork il repository
2. Crea un branch (`git checkout -b feature/nuova-feature`)
3. Committa le modifiche (`git commit -am 'Aggiungi nuova feature'`)
4. Push al branch (`git push origin feature/nuova-feature`)
5. Apri una Pull Request

## 📄 Licenza

Distribuito sotto licenza MIT. Vedi `LICENSE` per dettagli.

## 👨‍💻 Autore

Creato per la gestione efficiente delle interrogazioni scolastiche.

---

**⭐ Se questo progetto ti è utile, considera di lasciare una stella!**
