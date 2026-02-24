# Istruzioni Complete per Deploy su Render

## Problema Risolto

L'errore 500 era causato dal backend che tentava di contattare il servizio Flask auth tramite proxy. La nuova versione gestisce l'autenticazione admin direttamente nel backend Node.js.

## File da Caricare su GitHub

Carica questi file nel tuo repository:

```
gestore-interrogazioni/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── Procfile
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── database/
│   └── schema.sql
├── scripts/
│   └── setup-db.js
├── render.yaml
└── README.md
```

## Passo dopo Passo

### 1. Prepara il Repository

```bash
# Nella cartella del progetto
git add .
git commit -m "Fix backend auth"
git push origin main
```

### 2. Crea il Database su Render

1. Vai su https://dashboard.render.com
2. Clicca **New +** → **PostgreSQL**
3. Imposta:
   - **Name**: `gestore-interrogazioni-db`
   - **Database**: `gestore_interrogazioni`
   - **User**: lascia default
   - **Region**: Frankfurt (eu-central-1) o la più vicina
4. Clicca **Create Database**
5. Aspetta che sia pronto (stato "Available")

### 3. Deploy con Blueprint

1. Su Render, clicca **New +** → **Blueprint**
2. Connetti il tuo repository GitHub `Zoyrox/gestore-interrogazioni`
3. Render leggerà il file `render.yaml`
4. Clicca **Apply**
5. Aspetta il deploy (può richiedere 2-3 minuti)

### 4. Configura la Password Admin

Dopo il deploy:

1. Vai su https://dashboard.render.com
2. Clicca sul servizio `gestore-interrogazioni` (quello web, non il DB)
3. Vai su **Environment**
4. Trova la variabile `ADMIN_PASSWORD_HASH`
5. Se non esiste, aggiungila:
   - **Key**: `ADMIN_PASSWORD_HASH`
   - **Value**: *(vedi sotto)*

**Genera la password hash:**

Apri il terminale locale e esegui:

```bash
node -e "console.log(require('bcrypt').hashSync('tua-password', 10))"
```

Esempio output:
```
$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa
```

Copia questo valore e incollalo in `ADMIN_PASSWORD_HASH` su Render.

6. Clicca **Save Changes**
7. Il servizio si riavvierà automaticamente

### 5. Inizializza il Database

1. Nel servizio `gestore-interrogazioni`, vai su **Shell**
2. Esegui:

```bash
node scripts/setup-db.js
```

Se dà errore, prova:

```bash
cd backend && node ../scripts/setup-db.js
```

Oppure esegui lo schema manualmente:

```bash
psql $DATABASE_URL -f database/schema.sql
```

### 6. Verifica il Funzionamento

1. Apri l'URL del tuo servizio (es. `https://gestore-interrogazioni-xxx.onrender.com`)
2. Clicca su **Admin** nel login
3. Inserisci:
   - Username: `admin`
   - Password: quella che hai scelto
4. Dovresti entrare nella dashboard admin!

## Variabili d'Ambiente Necessarie

Il `render.yaml` configura automaticamente queste variabili:

| Variabile | Origine |
|-----------|---------|
| `DATABASE_URL` | Dal servizio PostgreSQL |
| `JWT_SECRET` | Generato automaticamente |
| `PORT` | 10000 |
| `NODE_ENV` | production |
| `ADMIN_USERNAME` | admin |
| `ADMIN_PASSWORD_HASH` | **Da impostare manualmente** |

## Debug

### Se vedi ancora errore 500

1. Vai su **Logs** nel servizio
2. Cerca l'errore specifico
3. Problemi comuni:
   - `DATABASE_URL` non configurato → Verifica connessione DB
   - `ADMIN_PASSWORD_HASH` mancante → Impostalo
   - Errore JWT → Verifica che `JWT_SECRET` esista

### Test API

Puoi testare l'API direttamente:

```bash
# Health check
curl https://TUO-URL.onrender.com/api/health

# Login admin
curl -X POST https://TUO-URL.onrender.com/api/auth/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"tua-password"}'
```

## Struttura Finale

Dopo il deploy avrai:

1. **Database**: `gestore-interrogazioni-db` (PostgreSQL)
2. **Web Service**: `gestore-interrogazioni` (Node.js + Frontend)

L'auth Flask è stato rimosso per semplicità - l'autenticazione admin è gestita direttamente dal backend Node.js.

## Supporto

Se hai problemi:
1. Controlla i log su Render Dashboard
2. Verifica tutte le variabili d'ambiente
3. Assicurati che il database sia inizializzato
