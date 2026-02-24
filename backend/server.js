/**
 * GESTORE INTERROGAZIONI SCOLASTICHE
 * Backend Principale - Node.js + Express
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
// MIDDLEWARE
// ============================================
app.use(helmet({
  contentSecurityPolicy: false, // Disabilita CSP per semplicità
}));

app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Troppe richieste, riprova più tardi' }
}));

app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================
// DATABASE
// ============================================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Errore pool PostgreSQL:', err);
});

// Test connessione
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Errore connessione database:', err.message);
  } else {
    console.log('✅ Connesso a PostgreSQL');
    release();
  }
});

// ============================================
// MIDDLEWARE AUTH
// ============================================
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token mancante' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token non valido' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso riservato agli admin' });
  }
  next();
};

const requireCapoclasse = (req, res, next) => {
  if (req.user.role !== 'capoclasse' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso riservato' });
  }
  next();
};

// ============================================
// AUTH ROUTES
// ============================================

// Login Admin (DIRETTO - non usa Flask)
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password richiesti' });
    }

    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminPasswordHash) {
      console.error('ADMIN_PASSWORD_HASH non configurato');
      return res.status(500).json({ error: 'Configurazione server incompleta' });
    }

    if (username !== adminUsername) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const valid = await bcrypt.compare(password, adminPasswordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const token = jwt.sign(
      { userId: 'admin', username: adminUsername, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      user: { username: adminUsername, role: 'admin' },
      expires_in: 28800
    });
  } catch (error) {
    console.error('Errore login admin:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Login Capoclasse
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
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Credenziali non valide' });
    }

    const classResult = await pool.query(
      `SELECT c.* FROM classes c 
       JOIN class_extractors ce ON c.id = ce.class_id 
       WHERE ce.user_id = $1`,
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

// Verifica token
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ valid: true, user: req.user });
});

// ============================================
// CLASSI
// ============================================

// Genera codice casuale
function generateClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Crea classe
app.post('/api/classes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, year, section } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome classe richiesto' });
    }

    // Verifica codice univoco
    let code;
    let exists = true;
    let attempts = 0;
    
    while (exists && attempts < 10) {
      code = generateClassCode();
      const check = await pool.query('SELECT id FROM classes WHERE code = $1', [code]);
      exists = check.rows.length > 0;
      attempts++;
    }

    const result = await pool.query(
      'INSERT INTO classes (name, year, section, code, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, year || null, section || null, code, req.user.userId || 'admin']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Errore creazione classe:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Lista classi
app.get('/api/classes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, 
             COUNT(DISTINCT s.id)::int as student_count,
             COUNT(DISTINCT sub.id)::int as subject_count
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

// Dettaglio classe
app.get('/api/classes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'capoclasse' && req.user.classId != id) {
      return res.status(403).json({ error: 'Accesso non autorizzato' });
    }

    const result = await pool.query(`
      SELECT c.*, 
             COUNT(DISTINCT s.id)::int as student_count,
             COUNT(DISTINCT sub.id)::int as subject_count
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
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Elimina classe
app.delete('/api/classes/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM classes WHERE id = $1', [req.params.id]);
    res.json({ message: 'Classe eliminata' });
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// Accesso con codice (pubblico)
app.post('/api/classes/access', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Codice richiesto' });
    }

    const result = await pool.query(`
      SELECT c.*, 
             COUNT(DISTINCT s.id)::int as student_count,
             COUNT(DISTINCT sub.id)::int as subject_count
      FROM classes c
      LEFT JOIN students s ON c.id = s.class_id
      LEFT JOIN subjects sub ON c.id = sub.class_id
      WHERE UPPER(c.code) = UPPER($1)
      GROUP BY c.id
    `, [code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Codice classe non valido' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// STUDENTI
// ============================================

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
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.get('/api/classes/:classId/students', authenticateToken, async (req, res) => {
  try {
    const { classId } = req.params;

    if (req.user.role === 'capoclasse' && req.user.classId != classId) {
      return res.status(403).json({ error: 'Accesso non autorizzato' });
    }

    const result = await pool.query(
      'SELECT * FROM students WHERE class_id = $1 ORDER BY last_name, first_name',
      [classId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.delete('/api/students/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM students WHERE id = $1', [req.params.id]);
    res.json({ message: 'Studente eliminato' });
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// MATERIE
// ============================================

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
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

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
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.delete('/api/subjects/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM subjects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Materia eliminata' });
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.post('/api/subjects/:id/reset', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM extraction_history WHERE subject_id = $1', [req.params.id]);
    res.json({ message: 'Materia resettata' });
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// INTERROGAZIONI
// ============================================

app.post('/api/interrogations', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { class_id, subject_id, date, notes } = req.body;

    if (!class_id || !subject_id || !date) {
      return res.status(400).json({ error: 'Dati mancanti' });
    }

    const result = await pool.query(
      'INSERT INTO interrogations (class_id, subject_id, date, notes, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [class_id, subject_id, date, notes || null, req.user.userId || 'admin']
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

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
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.delete('/api/interrogations/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM interrogations WHERE id = $1', [req.params.id]);
    res.json({ message: 'Interrogazione eliminata' });
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// ESTRAZIONI
// ============================================

app.post('/api/extractions', authenticateToken, requireCapoclasse, async (req, res) => {
  try {
    const { class_id, subject_id, date } = req.body;

    if (!class_id || !subject_id || !date) {
      return res.status(400).json({ error: 'Dati mancanti' });
    }

    if (req.user.role === 'capoclasse' && req.user.classId != class_id) {
      return res.status(403).json({ error: 'Non autorizzato' });
    }

    // Studenti della classe
    const studentsRes = await pool.query(
      'SELECT * FROM students WHERE class_id = $1 ORDER BY last_name, first_name',
      [class_id]
    );

    if (studentsRes.rows.length === 0) {
      return res.status(400).json({ error: 'Nessuno studente nella classe' });
    }

    const allStudents = studentsRes.rows;

    // Già interrogati
    const interrogatedRes = await pool.query(
      'SELECT DISTINCT student_id FROM extraction_history WHERE subject_id = $1 AND class_id = $2',
      [subject_id, class_id]
    );
    const interrogatedIds = new Set(interrogatedRes.rows.map(r => r.student_id));

    // Esclusi
    const excludedRes = await pool.query(
      `SELECT e.student_id FROM exclusions e
       JOIN students s ON e.student_id = s.id
       WHERE s.class_id = $1 AND e.date = $2`,
      [class_id, date]
    );
    const excludedIds = new Set(excludedRes.rows.map(r => r.student_id));

    // Disponibili
    const available = allStudents.filter(s => 
      !interrogatedIds.has(s.id) && !excludedIds.has(s.id)
    );

    if (available.length === 0) {
      return res.status(400).json({ 
        error: 'Nessuno studente disponibile',
        allInterrogated: true
      });
    }

    // Estrazione
    const selected = available[Math.floor(Math.random() * available.length)];

    const extractionRes = await pool.query(
      `INSERT INTO extraction_history 
       (class_id, subject_id, student_id, extraction_date, extracted_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [class_id, subject_id, selected.id, date, req.user.userId]
    );

    const subjectRes = await pool.query('SELECT name, color FROM subjects WHERE id = $1', [subject_id]);

    res.json({
      extraction: extractionRes.rows[0],
      student: selected,
      subject: subjectRes.rows[0],
      remaining: available.length - 1
    });
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

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
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.get('/api/classes/:classId/subjects/:subjectId/status', authenticateToken, async (req, res) => {
  try {
    const { classId, subjectId } = req.params;

    if (req.user.role === 'capoclasse' && req.user.classId != classId) {
      return res.status(403).json({ error: 'Accesso non autorizzato' });
    }

    const studentsRes = await pool.query(
      'SELECT id, first_name, last_name FROM students WHERE class_id = $1 ORDER BY last_name, first_name',
      [classId]
    );

    const interrogatedRes = await pool.query(
      'SELECT student_id, extraction_date FROM extraction_history WHERE subject_id = $1 AND class_id = $2',
      [subjectId, classId]
    );

    const interrogatedMap = new Map();
    interrogatedRes.rows.forEach(r => interrogatedMap.set(r.student_id, r.extraction_date));

    const students = studentsRes.rows.map(s => ({
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
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// CAPOCLASSE
// ============================================

app.post('/api/classes/:classId/extractors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { classId } = req.params;
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e password richiesti' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userRes = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, passwordHash, 'capoclasse']
    );

    await pool.query(
      'INSERT INTO class_extractors (class_id, user_id) VALUES ($1, $2)',
      [classId, userRes.rows[0].id]
    );

    res.status(201).json(userRes.rows[0]);
  } catch (error) {
    console.error('Errore:', error);
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username già esistente' });
    }
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.get('/api/classes/:classId/extractors', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.username, ce.assigned_at
      FROM users u
      JOIN class_extractors ce ON u.id = ce.user_id
      WHERE ce.class_id = $1 AND u.role = 'capoclasse'
    `, [req.params.classId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

app.delete('/api/extractors/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id = $1 AND role = $2', [req.params.userId, 'capoclasse']);
    res.json({ message: 'Capoclasse rimosso' });
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// STATISTICHE
// ============================================

app.get('/api/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*)::int FROM classes) as total_classes,
        (SELECT COUNT(*)::int FROM students) as total_students,
        (SELECT COUNT(*)::int FROM subjects) as total_subjects,
        (SELECT COUNT(*)::int FROM extraction_history) as total_extractions,
        (SELECT COUNT(*)::int FROM users WHERE role = 'capoclasse') as total_extractors
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Errore:', error);
    res.status(500).json({ error: 'Errore interno del server' });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'gestore-interrogazioni-api',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// FRONTEND STATICO
// ============================================

// Servi file statici dal frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Per tutte le altre richieste, servi index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// ============================================
// ERROR HANDLER
// ============================================
app.use((err, req, res, next) => {
  console.error('Errore non gestito:', err);
  res.status(500).json({ error: 'Errore interno del server' });
});

// ============================================
// AVVIO
// ============================================
app.listen(PORT, () => {
  console.log('========================================');
  console.log('🚀 GESTORE INTERROGAZIONI AVVIATO');
  console.log('========================================');
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🌍 Ambiente: ${NODE_ENV}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'OK' : 'NON CONFIGURATO'}`);
  console.log(`🔐 JWT Secret: ${process.env.JWT_SECRET ? 'OK' : 'NON CONFIGURATO'}`);
  console.log(`👤 Admin: ${process.env.ADMIN_USERNAME || 'admin'}`);
  console.log('========================================');
});

module.exports = app;
