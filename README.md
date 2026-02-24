# Gestore Interrogazioni Scolastiche

Sistema per la gestione delle interrogazioni scolastiche con estrazione casuale.

## Architettura

```
gestore-interrogazioni/
├── backend/          # Node.js + Express (API + Frontend)
├── frontend/         # HTML/CSS/JS
├── database/         # Schema PostgreSQL
└── render.yaml       # Configurazione Render
```

## Deploy su Render.com

### Step 1: Preparare il repository

1. Crea un repository su GitHub
2. Carica tutti i file (backend/, frontend/, database/, render.yaml)

### Step 2: Creare il database

1. Vai su [Render Dashboard](https://dashboard.render.com)
2. Clicca **New** → **PostgreSQL**
3. Configura:
   - **Name**: `gestore-interrogazioni-db`
   - **Region**: Scegli la più vicina
   - **Plan**: Free
4. Clicca **Create Database**

### Step 3: Deploy del servizio Web

1. Clicca **New** → **Blueprint**
2. Connetti il tuo repository GitHub
3. Render rileverà automaticamente il `render.yaml`
4. Clicca **Apply**

### Step 4: Configurare le variabili d'ambiente

Dopo il deploy, vai sul servizio web `gestore-interrogazioni`:

1. Vai su **Environment**
2. Aggiungi/modifica queste variabili:

| Variabile | Valore |
|-----------|--------|
| `ADMIN_USERNAME` | `admin` |
| `ADMIN_PASSWORD_HASH` | *(vedi sotto)* |

**Generare la password hash:**

```bash
node -e "console.log(require('bcrypt').hashSync('tua-password', 10))"
```

Copia l'output e incollalo in `ADMIN_PASSWORD_HASH`.

### Step 5: Inizializzare il database

1. Vai su **Shell** nel servizio web
2. Esegui:

```bash
psql $DATABASE_URL -f database/schema.sql
```

Oppure usa la console SQL di Render per eseguire lo schema.

### Step 6: Verifica

1. Apri l'URL del tuo servizio (es. `https://gestore-interrogazioni.onrender.com`)
2. Prova a fare login come admin

## Sviluppo Locale

### Requisiti
- Node.js 18+
- PostgreSQL 14+

### Setup

```bash
# 1. Clona il repository
git clone <repo-url>
cd gestore-interrogazioni

# 2. Configura database
createdb gestore_interrogazioni
psql gestore_interrogazioni < database/schema.sql

# 3. Configura variabili d'ambiente
cp .env.example .env
# Modifica .env con i tuoi valori

# 4. Avvia backend
cd backend
npm install
npm run dev

# 5. Apri frontend
# Apri http://localhost:3000 nel browser
```

## API Endpoints

| Endpoint | Metodo | Descrizione |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/admin/login` | POST | Login admin |
| `/api/auth/login` | POST | Login capoclasse |
| `/api/auth/verify` | GET | Verifica token |
| `/api/classes` | GET | Lista classi |
| `/api/classes` | POST | Crea classe |
| `/api/classes/:id` | DELETE | Elimina classe |
| `/api/classes/access` | POST | Accesso con codice |
| `/api/classes/:id/students` | GET | Lista studenti |
| `/api/classes/:id/students` | POST | Aggiungi studente |
| `/api/classes/:id/subjects` | GET | Lista materie |
| `/api/classes/:id/subjects` | POST | Aggiungi materia |
| `/api/extractions` | POST | Estrai studente |

## Troubleshooting

### Errore 500
- Verifica che `DATABASE_URL` sia corretto
- Controlla i log su Render Dashboard → Logs

### Login non funziona
- Verifica che `ADMIN_PASSWORD_HASH` sia generato correttamente
- Controlla che `JWT_SECRET` sia impostato

### Database connection failed
- Assicurati che il database PostgreSQL sia creato
- Verifica che DATABASE_URL punti al database corretto
