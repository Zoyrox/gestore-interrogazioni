/**
 * GESTORE INTERROGAZIONI SCOLASTICHE
 * Backend Principale - Node.js + Express
 * 
 * Entry point per deployment su Render.com
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const path = require('path');
require('dotenv').config();

// ============================================
// CONFIGURAZIONE APP
// ============================================
const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================
// MIDDLEWARE DI SICUREZZA
// ============================================
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
}));

// 🔧 FIX: CORS configurato per accettare richieste dal frontend
const corsOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({
  origin: corsOrigin,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 100, // limita ogni IP a 100 richieste per windowMs
  message: 'Troppe richieste, riprova più tardi'
});
app.use(limiter);

// Logging
app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));

// Parsing body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// CONNESSIONE DATABASE POSTGRESQL
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connessione
pool.connect((err, client, release) => {
  if (err) {
    console.error('Errore connessione database:', err);
  } else {
    console.log('✅ Connesso a PostgreSQL');
    release();
  }
});

// ============================================
// MIDDLEWARE DI AUTENTICAZIONE
// ============================================

/**
 * Verifica JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token mancante' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token non valido' });
    }
    req.user = user;
    next();
  });
};

/**
 * Verifica ruolo admin
 */
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso riservato agli admin' });
  }
  next();
};

/**
 * Verifica ruolo capoclasse
 */
const requireCapoclasse = (req, res, next) => {
  if (req.user.role !== 'capoclasse' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso riservato ai capoclasse' });
  }
  next();
};

// ============================================
// 🔧 PROXY AUTH - Inoltra richieste admin al Flask
// ============================================

/**
 * Proxy per login admin
 * POST /api/auth/admin/login
 */
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password richiesti' });
    }

    // Inoltra la richiesta al servizio Flask Auth
    const authServiceUrl = process.env.AUTH_SERVICE_URL;
    
    if (!authServiceUrl) {
      // Se non c'è URL del servizio auth, usa autenticazione locale (fallback)
      console.log('⚠️ AUTH_SERVICE_URL non configurato, uso fallback locale');
      return await adminLoginFallback(req, res);
    }

    const response = await fetch(`${authServiceUrl}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await response.json();
    return res.status(response.status).json(data);

  } catch (error) {
    console.error('Errore proxy auth:', error);
    // Fallback a login locale se il servizio auth non risponde
    return await adminLoginFallback(req, res);
  }
});

/**
 * Fallback login admin locale (se Flask non disponibile)
 */
async function adminLoginFallback(req, res) {
  try {
    const { username, password } = req.body;
    
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    
    // Se non c'è hash configurato, rifiuta
    if (!adminPasswordHash) {
      return res.status(500).json({ error: 'Configurazione admin non disponibile' });
    }

    if (username !== adminUsername) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const validPassword = await bcrypt.compare(password, adminPasswordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Genera JWT
    const token = jwt.sign(
      { 
        user_id: 'admin', 
        username: adminUsername, 
        role: 'admin' 
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        username: adminUsername,
        role: 'admin'
      },
      expires_in: 8 * 3600
    });
  } catch (error) {
    console.error('Errore fallback login:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
}

// ============================================
// ROUTES - AUTH (Capoclasse)
// ============================================

/**
 * Login capoclasse
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password richiesti' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1 AND role = $2',
      [username, 'capoclasse']
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    // Ottieni la classe associata al capoclasse
    const classResult = await pool.query(
      'SELECT c.* FROM classes c JOIN class_extractors ce ON c.id = ce.class_id WHERE ce.user_id = $1',
      [user.id]
    );

    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role,
        classId: classResult.rows[0]?.id
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        class: classResult.rows[0] || null
      }
    });
  } catch (error) {
    console.error('Errore login:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Verifica token
 * GET /api/auth/verify
 */
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ============================================
// ROUTES - CLASSI (ADMIN)
// ============================================

/**
 * Crea nuova classe
 * POST /api/classes
 */
app.post('/api/classes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, year, section } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome classe richiesto' });
    }

    // Genera codice univoco
    const code = generateClassCode();

    const result = await pool.query(
      'INSERT INTO classes (name, year, section, code, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, year || null, section || null, code, req.user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Errore creazione classe:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Ottieni tutte le classi
 * GET /api/classes
 */
app.get('/api/classes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
             COUNT(DISTINCT s.id) as student_count,
             COUNT(DISTINCT sub.id) as subject_count
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id
      LEFT JOIN subjects sub ON c.id = sub.class_id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Errore recupero classi:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Ottieni singola classe
 * GET /api/classes/:id
 */
app.get('/api/classes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica permessi
    if (req.user.role === 'capoclasse' && req.user.classId != id) {
      return res.status(403).json({ error: 'Accesso non autorizzato a questa classe' });
    }

    const result = await pool.query(`
      SELECT c.*, 
             COUNT(DISTINCT s.id) as student_count,
             COUNT(DISTINCT sub.id) as subject_count
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id
      LEFT JOIN subjects sub ON c.id = sub.class_id
      WHERE c.id = $1
      GROUP BY c.id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Classe non trovata' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore recupero classe:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Elimina classe
 * DELETE /api/classes/:id
 */
app.delete('/api/classes/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM classes WHERE id = $1', [id]);
    res.json({ message: 'Classe eliminata con successo' });
  } catch (error) {
    console.error('Errore eliminazione classe:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Accesso classe con codice (pubblico)
 * POST /api/classes/access
 */
app.post('/api/classes/access', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Codice richiesto' });
    }

    const result = await pool.query(`
      SELECT c.*, 
             COUNT(DISTINCT s.id) as student_count,
             COUNT(DISTINCT sub.id) as subject_count
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id
      LEFT JOIN subjects sub ON c.id = sub.class_id
      WHERE c.code = $1
      GROUP BY c.id
    `, [code.toUpperCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Codice classe non valido' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore accesso classe:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// ROUTES - STUDENTI
// ============================================

/**
 * Aggiungi studente
 * POST /api/classes/:classId/students
 */
app.post('/api/classes/:classId/students', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { classId } = req.params;
    const { first_name, last_name } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'Nome e cognome richiesti' });
    }

    const result = await pool.query(
      'INSERT INTO students (class_id, first_name, last_name) VALUES ($1, $2, $3) RETURNING *',
      [classId, first_name.trim(), last_name.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Errore aggiunta studente:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Ottieni studenti di una classe
 * GET /api/classes/:classId/students
 */
app.get('/api/classes/:classId/students', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;

    // Verifica permessi
    if (req.user.role === 'capoclasse' && req.user.classId != classId) {
      return res.status(403).json({ error: 'Accesso non autorizzato' });
    }

    const result = await pool.query(
      'SELECT * FROM students WHERE class_id = $1 ORDER BY last_name, first_name',
      [classId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Errore recupero studenti:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Elimina studente
 * DELETE /api/students/:id
 */
app.delete('/api/students/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM students WHERE id = $1', [id]);
    res.json({ message: 'Studente eliminato' });
  } catch (error) {
    console.error('Errore eliminazione studente:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// ROUTES - MATERIE
// ============================================

/**
 * Aggiungi materia
 * POST /api/classes/:classId/subjects
 */
app.post('/api/classes/:classId/subjects', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { classId } = req.params;
    const { name, color } = req.body;

    if (!name || !color) {
      return res.status(400).json({ error: 'Nome e colore richiesti' });
    }

    const result = await pool.query(
      'INSERT INTO subjects (class_id, name, color) VALUES ($1, $2, $3) RETURNING *',
      [classId, name.trim(), color]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Errore aggiunta materia:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Ottieni materie di una classe
 * GET /api/classes/:classId/subjects
 */
app.get('/api/classes/:classId/subjects', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;

    if (req.user.role === 'capoclasse' && req.user.classId != classId) {
      return res.status(403).json({ error: 'Accesso non autorizzato' });
    }

    const result = await pool.query(
      'SELECT * FROM subjects WHERE class_id = $1 ORDER BY name',
      [classId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Errore recupero materie:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Elimina materia
 * DELETE /api/subjects/:id
 */
app.delete('/api/subjects/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM subjects WHERE id = $1', [id]);
    res.json({ message: 'Materia eliminata' });
  } catch (error) {
    console.error('Errore eliminazione materia:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Reset materia (cancella storico interrogazioni)
 * POST /api/subjects/:id/reset
 */
app.post('/api/subjects/:id/reset', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM interrogations WHERE subject_id = $1', [id]);
    res.json({ message: 'Materia resettata' });
  } catch (error) {
    console.error('Errore reset materia:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// ROUTES - INTERROGAZIONI (CALENDARIO)
// ============================================

/**
 * Programma interrogazione
 * POST /api/interrogations
 */
app.post('/api/interrogations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { class_id, subject_id, date, notes } = req.body;

    if (!class_id || !subject_id || !date) {
      return res.status(400).json({ error: 'Classe, materia e data richiesti' });
    }

    const result = await pool.query(
      'INSERT INTO interrogations (class_id, subject_id, date, notes, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [class_id, subject_id, date, notes || null, req.user.userId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Errore programmazione interrogazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Ottieni interrogazioni di una classe
 * GET /api/classes/:classId/interrogations
 */
app.get('/api/classes/:classId/interrogations', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const { month, year } = req.query;

    if (req.user.role === 'capoclasse' && req.user.classId != classId) {
      return res.status(403).json({ error: 'Accesso non autorizzato' });
    }

    let query = `
      SELECT i.*, s.name as subject_name, s.color as subject_color
      FROM interrogations i
      JOIN subjects s ON i.subject_id = s.id
      WHERE i.class_id = $1
    `;
    const params = [classId];

    if (month && year) {
      query += ` AND EXTRACT(MONTH FROM i.date) = $2 AND EXTRACT(YEAR FROM i.date) = $3`;
      params.push(month, year);
    }

    query += ` ORDER BY i.date`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Errore recupero interrogazioni:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Elimina interrogazione
 * DELETE /api/interrogations/:id
 */
app.delete('/api/interrogations/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM interrogations WHERE id = $1', [id]);
    res.json({ message: 'Interrogazione eliminata' });
  } catch (error) {
    console.error('Errore eliminazione interrogazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// ROUTES - ESCLUSIONI
// ============================================

/**
 * Aggiungi esclusione
 * POST /api/exclusions
 */
app.post('/api/exclusions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { student_id, date, reason } = req.body;

    if (!student_id || !date) {
      return res.status(400).json({ error: 'Studente e data richiesti' });
    }

    const result = await pool.query(
      'INSERT INTO exclusions (student_id, date, reason) VALUES ($1, $2, $3) RETURNING *',
      [student_id, date, reason || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Errore aggiunta esclusione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Ottieni esclusioni di una classe
 * GET /api/classes/:classId/exclusions
 */
app.get('/api/classes/:classId/exclusions', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;

    if (req.user.role === 'capoclasse' && req.user.classId != classId) {
      return res.status(403).json({ error: 'Accesso non autorizzato' });
    }

    let query = `
      SELECT e.*, s.first_name, s.last_name
      FROM exclusions e
      JOIN students s ON e.student_id = s.id
      WHERE s.class_id = $1
    `;
    const params = [classId];

    if (date) {
      query += ` AND e.date = $2`;
      params.push(date);
    }

    query += ` ORDER BY e.date, s.last_name`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Errore recupero esclusioni:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Elimina esclusione
 * DELETE /api/exclusions/:id
 */
app.delete('/api/exclusions/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM exclusions WHERE id = $1', [id]);
    res.json({ message: 'Esclusione eliminata' });
  } catch (error) {
    console.error('Errore eliminazione esclusione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// ROUTES - ESTRAZIONI
// ============================================

/**
 * Effettua estrazione casuale
 * POST /api/extractions
 */
app.post('/api/extractions', authenticateToken, requireCapoclasse, async (req, res) => {
  try {
    const { class_id, subject_id, date } = req.body;

    if (!class_id || !subject_id || !date) {
      return res.status(400).json({ error: 'Classe, materia e data richiesti' });
    }

    // Verifica che il capoclasse possa estrarre per questa classe
    if (req.user.role === 'capoclasse' && req.user.classId != class_id) {
      return res.status(403).json({ error: 'Non autorizzato a estrarre per questa classe' });
    }

    // Ottieni tutti gli studenti della classe
    const studentsResult = await pool.query(
      'SELECT * FROM students WHERE class_id = $1 ORDER BY last_name, first_name',
      [class_id]
    );

    if (studentsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Nessuno studente nella classe' });
    }

    const allStudents = studentsResult.rows;

    // Ottieni studenti già interrogati in questa materia
    const interrogatedResult = await pool.query(
      'SELECT DISTINCT student_id FROM extraction_history WHERE subject_id = $1 AND class_id = $2',
      [subject_id, class_id]
    );
    const interrogatedIds = new Set(interrogatedResult.rows.map(r => r.student_id));

    // Ottieni studenti esclusi per questa data
    const exclusionsResult = await pool.query(
      `SELECT e.student_id 
       FROM exclusions e
       JOIN students s ON e.student_id = s.id
       WHERE s.class_id = $1 AND e.date = $2`,
      [class_id, date]
    );
    const excludedIds = new Set(exclusionsResult.rows.map(r => r.student_id));

    // Filtra studenti disponibili
    const availableStudents = allStudents.filter(s => 
      !interrogatedIds.has(s.id) && !excludedIds.has(s.id)
    );

    if (availableStudents.length === 0) {
      return res.status(400).json({ 
        error: 'Nessuno studente disponibile per l\'estrazione. Tutti gli studenti sono stati interrogati o esclusi.',
        allInterrogated: true
      });
    }

    // Estrazione casuale reale
    const randomIndex = Math.floor(Math.random() * availableStudents.length);
    const selectedStudent = availableStudents[randomIndex];

    // Salva l'estrazione
    const extractionResult = await pool.query(
      `INSERT INTO extraction_history 
       (class_id, subject_id, student_id, extraction_date, extracted_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [class_id, subject_id, selectedStudent.id, date, req.user.userId]
    );

    // Ottieni info materia
    const subjectResult = await pool.query(
      'SELECT name, color FROM subjects WHERE id = $1',
      [subject_id]
    );

    res.json({
      extraction: extractionResult.rows[0],
      student: selectedStudent,
      subject: subjectResult.rows[0],
      remaining: availableStudents.length - 1
    });
  } catch (error) {
    console.error('Errore estrazione:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Ottieni storico estrazioni
 * GET /api/classes/:classId/extractions
 */
app.get('/api/classes/:classId/extractions', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;
    const { subject_id, limit } = req.query;

    if (req.user.role === 'capoclasse' && req.user.classId != classId) {
      return res.status(403).json({ error: 'Accesso non autorizzato' });
    }

    let query = `
      SELECT eh.*, 
             s.first_name, s.last_name,
             sub.name as subject_name, sub.color as subject_color
      FROM extraction_history eh
      JOIN students s ON eh.student_id = s.id
      JOIN subjects sub ON eh.subject_id = sub.id
      WHERE eh.class_id = $1
    `;
    const params = [classId];

    if (subject_id) {
      query += ` AND eh.subject_id = $${params.length + 1}`;
      params.push(subject_id);
    }

    query += ` ORDER BY eh.extraction_date DESC, eh.created_at DESC`;

    if (limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(parseInt(limit));
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Errore recupero estrazioni:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Ottieni stato interrogati per materia
 * GET /api/classes/:classId/subjects/:subjectId/status
 */
app.get('/api/classes/:classId/subjects/:subjectId/status', authenticateToken, async (req, res) => {
  try {
    const { classId, subjectId } = req.params;

    if (req.user.role === 'capoclasse' && req.user.classId != classId) {
      return res.status(403).json({ error: 'Accesso non autorizzato' });
    }

    // Ottieni tutti gli studenti
    const studentsResult = await pool.query(
      'SELECT id, first_name, last_name FROM students WHERE class_id = $1 ORDER BY last_name, first_name',
      [classId]
    );

    // Ottieni studenti interrogati
    const interrogatedResult = await pool.query(
      'SELECT student_id, extraction_date FROM extraction_history WHERE subject_id = $1 AND class_id = $2',
      [subjectId, classId]
    );

    const interrogatedMap = new Map();
    interrogatedResult.rows.forEach(row => {
      interrogatedMap.set(row.student_id, row.extraction_date);
    });

    const students = studentsResult.rows.map(s => ({
      ...s,
      interrogated: interrogatedMap.has(s.id),
      interrogation_date: interrogatedMap.get(s.id) || null
    }));

    res.json({
      total: students.length,
      interrogated: interrogatedMap.size,
      remaining: students.length - interrogatedMap.size,
      students
    });
  } catch (error) {
    console.error('Errore recupero stato:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// ROUTES - CAPOCLASSE (ADMIN)
// ============================================

/**
 * Assegna capoclasse a classe
 * POST /api/classes/:classId/extractors
 */
app.post('/api/classes/:classId/extractors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { classId } = req.params;
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password richiesti' });
    }

    // Verifica che esista la classe
    const classResult = await pool.query('SELECT * FROM classes WHERE id = $1', [classId]);
    if (classResult.rows.length === 0) {
      return res.status(404).json({ error: 'Classe non trovata' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Crea utente capoclasse
    const userResult = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, passwordHash, 'capoclasse']
    );

    // Associa alla classe
    await pool.query(
      'INSERT INTO class_extractors (class_id, user_id) VALUES ($1, $2)',
      [classId, userResult.rows[0].id]
    );

    res.status(201).json(userResult.rows[0]);
  } catch (error) {
    console.error('Errore assegnazione capoclasse:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username già esistente' });
    }
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Ottieni capoclasse di una classe
 * GET /api/classes/:classId/extractors
 */
app.get('/api/classes/:classId/extractors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { classId } = req.params;
    const result = await pool.query(`
      SELECT u.id, u.username, u.created_at
      FROM users u
      JOIN class_extractors ce ON u.id = ce.user_id
      WHERE ce.class_id = $1 AND u.role = 'capoclasse'
    `, [classId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Errore recupero capoclasse:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

/**
 * Rimuovi capoclasse
 * DELETE /api/extractors/:userId
 */
app.delete('/api/extractors/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1 AND role = $2', [userId, 'capoclasse']);
    res.json({ message: 'Capoclasse rimosso' });
  } catch (error) {
    console.error('Errore rimozione capoclasse:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// ROUTES - STATISTICHE
// ============================================

/**
 * Dashboard stats
 * GET /api/stats
 */
app.get('/api/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM classes) as total_classes,
        (SELECT COUNT(*) FROM students) as total_students,
        (SELECT COUNT(*) FROM subjects) as total_subjects,
        (SELECT COUNT(*) FROM extraction_history) as total_extractions,
        (SELECT COUNT(*) FROM users WHERE role = 'capoclasse') as total_extractors
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Errore recupero statistiche:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// SERVIZIO FILE STATICI (PRODUZIONE)
// ============================================
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
  });
}

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('Errore:', err);
  res.status(500).json({ error: 'Errore interno del server' });
});

// ============================================
// UTILITY
// ============================================

/**
 * Genera codice classe univoco
 */
function generateClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// ============================================
// AVVIO SERVER
// ============================================
app.listen(PORT, () => {
  console.log(`🚀 Server avviato su porta ${PORT}`);
  console.log(`📁 Environment: ${NODE_ENV}`);
  console.log(`🔗 Database: ${process.env.DATABASE_URL ? 'Configurato' : 'NON CONFIGURATO'}`);
  console.log(`🔐 Auth Service: ${process.env.AUTH_SERVICE_URL || 'Fallback locale'}`);
});

module.exports = app;
