# 🤝 Contributi

Grazie per il tuo interesse nel contribuire al Gestore Interrogazioni Scolastiche!

## Come Contribuire

### 1. Segnala un Bug

Se trovi un bug, apri una **Issue** su GitHub includendo:
- Descrizione del problema
- Passi per riprodurlo
- Comportamento atteso vs effettivo
- Screenshot (se applicabile)
- Ambiente (browser, OS, ecc.)

### 2. Proponi una Feature

Apri una **Issue** con label `enhancement` descrivendo:
- La feature richiesta
- Il motivo/priorità
- Possibile implementazione

### 3. Invia una Pull Request

#### Setup Locale

```bash
# 1. Fork il repository
# 2. Clona il tuo fork
git clone https://github.com/tuo-username/gestore-interrogazioni.git

# 3. Crea un branch
git checkout -b feature/nuova-feature

# 4. Installa dipendenze
cd backend && npm install
cd ../auth-service && pip install -r requirements.txt

# 5. Crea file .env
cp .env.example .env
# Modifica le variabili
```

#### Sviluppo

```bash
# Avvia backend
cd backend && npm run dev

# Avvia auth service
cd auth-service && flask run --port=5000

# Apri frontend/index.html nel browser
```

#### Prima di Committare

```bash
# Esegui i test
cd backend && npm test

# Verifica linting
npm run lint

# Formatta il codice
```

#### Commit

```bash
# Committa le modifiche
git add .
git commit -m "feat: aggiungi nuova feature"

# Push al tuo fork
git push origin feature/nuova-feature
```

Apri una **Pull Request** dal tuo fork al repository principale.

## Convenzioni

### Commit Messages

Segui [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nuova feature
- `fix:` Correzione bug
- `docs:` Documentazione
- `style:` Formattazione
- `refactor:` Refactoring
- `test:` Test
- `chore:` Manutenzione

Esempi:
```
feat: aggiungi calendario mensile
fix: corretta estrazione studenti già interrogati
docs: aggiornata guida deploy
```

### Codice

#### JavaScript
- Usa ES6+
- Async/await preferito a Promise
- Nomina chiara delle variabili
- Commenti per funzioni complesse

#### Python
- Segui PEP 8
- Usa type hints dove possibile
- Docstrings per funzioni pubbliche

### CSS
- Usa variabili CSS
- Mobile-first responsive
- BEM naming (opzionale)

## Code Review

Ogni PR richiede:
- ✅ Test passanti
- ✅ Nessun conflitto
- ✅ Code review approvata
- ✅ Descrizione chiara delle modifiche

## Domande?

Apri una **Discussion** su GitHub o contatta i maintainer.

Grazie per il tuo contributo! 🎉
