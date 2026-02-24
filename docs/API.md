# 📚 Documentazione API

## Base URL

**Sviluppo:**
- Backend: `http://localhost:3000`
- Auth: `http://localhost:5000`

**Produzione (Render):**
- Backend: `https://<nome-servizio>.onrender.com`
- Auth: `https://<nome-servizio-auth>.onrender.com`

## Autenticazione

L'API utilizza JWT (JSON Web Token) per l'autenticazione.

### Header
```
Authorization: Bearer <token>
```

### Ruoli
- `admin` - Accesso completo
- `capoclasse` - Accesso alla propria classe
- `student` - Accesso pubblico (solo lettura)

---

## 🔐 Autenticazione

### Login Capoclasse
```http
POST /api/auth/login
```

**Request:**
```json
{
  "username": "capoclasse1",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "capoclasse1",
    "role": "capoclasse",
    "class": {
      "id": 1,
      "name": "3A Scientifico",
      "code": "ABC123"
    }
  }
}
```

### Login Admin (Flask)
```http
POST /api/auth/admin/login
```

**Request:**
```json
{
  "username": "admin",
  "password": "Admin123!"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "username": "admin",
    "role": "admin"
  },
  "expires_in": 28800
}
```

### Verifica Token
```http
GET /api/auth/verify
Authorization: Bearer <token>
```

---

## 🏫 Classi

### Lista Classi (Admin)
```http
GET /api/classes
Authorization: Bearer <admin-token>
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "3A Scientifico",
    "year": 3,
    "section": "A",
    "code": "ABC123",
    "student_count": 25,
    "subject_count": 8,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### Crea Classe
```http
POST /api/classes
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "3A Scientifico",
  "year": 3,
  "section": "A"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "3A Scientifico",
  "year": 3,
  "section": "A",
  "code": "ABC123",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Accesso Classe (Studente)
```http
POST /api/classes/access
Content-Type: application/json
```

**Request:**
```json
{
  "code": "ABC123"
}
```

---

## 👨‍🎓 Studenti

### Lista Studenti
```http
GET /api/classes/:classId/students
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "first_name": "Mario",
    "last_name": "Rossi",
    "class_id": 1,
    "created_at": "2024-01-15T10:30:00Z"
  }
]
```

### Aggiungi Studente
```http
POST /api/classes/:classId/students
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "first_name": "Mario",
  "last_name": "Rossi"
}
```

### Elimina Studente
```http
DELETE /api/students/:id
Authorization: Bearer <admin-token>
```

---

## 📖 Materie

### Lista Materie
```http
GET /api/classes/:classId/subjects
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Matematica",
    "color": "#3B82F6",
    "class_id": 1
  }
]
```

### Aggiungi Materia
```http
POST /api/classes/:classId/subjects
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "name": "Matematica",
  "color": "#3B82F6"
}
```

### Reset Materia
```http
POST /api/subjects/:id/reset
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "message": "Materia resettata"
}
```

---

## 📅 Interrogazioni (Calendario)

### Lista Interrogazioni
```http
GET /api/classes/:classId/interrogations?month=1&year=2024
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "class_id": 1,
    "subject_id": 1,
    "subject_name": "Matematica",
    "subject_color": "#3B82F6",
    "date": "2024-01-15",
    "notes": "Capitolo 3"
  }
]
```

### Programma Interrogazione
```http
POST /api/interrogations
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "class_id": 1,
  "subject_id": 1,
  "date": "2024-01-15",
  "notes": "Capitolo 3"
}
```

---

## 🎲 Estrazioni

### Effettua Estrazione
```http
POST /api/extractions
Authorization: Bearer <capoclasse-token>
Content-Type: application/json
```

**Request:**
```json
{
  "class_id": 1,
  "subject_id": 1,
  "date": "2024-01-15"
}
```

**Response:**
```json
{
  "extraction": {
    "id": 1,
    "student_id": 5,
    "extraction_date": "2024-01-15"
  },
  "student": {
    "id": 5,
    "first_name": "Giulia",
    "last_name": "Verdi"
  },
  "subject": {
    "name": "Matematica",
    "color": "#3B82F6"
  },
  "remaining": 24
}
```

### Storico Estrazioni
```http
GET /api/classes/:classId/extractions?subject_id=1&limit=50
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": 1,
    "student_id": 5,
    "first_name": "Giulia",
    "last_name": "Verdi",
    "subject_name": "Matematica",
    "subject_color": "#3B82F6",
    "extraction_date": "2024-01-15",
    "created_at": "2024-01-15T09:00:00Z"
  }
]
```

### Stato Materia
```http
GET /api/classes/:classId/subjects/:subjectId/status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "total": 25,
  "interrogated": 10,
  "remaining": 15,
  "percentage_done": 40.00,
  "students": [
    {
      "id": 1,
      "first_name": "Mario",
      "last_name": "Rossi",
      "interrogated": true,
      "interrogation_date": "2024-01-10"
    }
  ]
}
```

---

## 🚫 Esclusioni

### Lista Esclusioni
```http
GET /api/classes/:classId/exclusions?date=2024-01-15
Authorization: Bearer <token>
```

### Aggiungi Esclusione
```http
POST /api/exclusions
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "student_id": 1,
  "date": "2024-01-15",
  "reason": "Malattia"
}
```

---

## 👤 Capoclasse (Admin)

### Assegna Capoclasse
```http
POST /api/classes/:classId/extractors
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Request:**
```json
{
  "username": "capoclasse1",
  "password": "SecurePass123!"
}
```

### Lista Capoclasse
```http
GET /api/classes/:classId/extractors
Authorization: Bearer <admin-token>
```

### Rimuovi Capoclasse
```http
DELETE /api/extractors/:userId
Authorization: Bearer <admin-token>
```

---

## 📊 Statistiche

### Dashboard Stats (Admin)
```http
GET /api/stats
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "total_classes": 5,
  "total_students": 125,
  "total_subjects": 20,
  "total_extractions": 450,
  "total_extractors": 5
}
```

---

## ❌ Errori

### Formato Errore
```json
{
  "error": "Descrizione dell'errore"
}
```

### Codici HTTP
| Codice | Descrizione |
|--------|-------------|
| 200 | OK |
| 201 | Creato |
| 400 | Bad Request |
| 401 | Non autorizzato |
| 403 | Accesso negato |
| 404 | Non trovato |
| 409 | Conflitto |
| 429 | Troppe richieste |
| 500 | Errore server |

---

## 📝 Note

- Tutte le date sono in formato ISO 8601: `YYYY-MM-DD`
- I colori sono in formato esadecimale: `#RRGGBB`
- I token JWT scadono dopo 8 ore
- Il rate limit è di 100 richieste per 15 minuti
