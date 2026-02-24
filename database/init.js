/**
 * Script di inizializzazione Database
 * Crea le tabelle e inserisce dati di esempio (opzionale)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function initDatabase() {
  try {
    console.log('🚀 Inizializzazione database...');

    // Leggi e esegui lo schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');

    await pool.query(schema);
    console.log('✅ Schema creato con successo');

    // Crea admin di default se non esiste
    const adminResult = await pool.query(
      "SELECT * FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (adminResult.rows.length === 0) {
      console.log('👤 Creazione admin di default...');
      
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123!';
      const passwordHash = await bcrypt.hash(password, 10);

      await pool.query(
        'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
        [username, passwordHash, 'admin']
      );

      console.log(`✅ Admin creato: ${username} / ${password}`);
      console.log('⚠️  CAMBIA LA PASSWORD DOPO IL PRIMO ACCESSO!');
    }

    // Dati di esempio (solo in sviluppo)
    if (process.env.NODE_ENV !== 'production' && process.env.SEED_DATA === 'true') {
      console.log('🌱 Inserimento dati di esempio...');
      await seedData();
    }

    console.log('✅ Database inizializzato con successo!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore inizializzazione:', error);
    process.exit(1);
  }
}

async function seedData() {
  // Classe di esempio
  const classResult = await pool.query(
    'INSERT INTO classes (name, year, section, code, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    ['3A Scientifico', 3, 'A', 'DEMO01', 1]
  );
  const classId = classResult.rows[0].id;

  // Studenti di esempio
  const students = [
    ['Mario', 'Rossi'],
    ['Luca', 'Bianchi'],
    ['Giulia', 'Verdi'],
    ['Anna', 'Neri'],
    ['Marco', 'Gialli'],
    ['Sofia', 'Blu'],
    ['Davide', 'Rosa'],
    ['Emma', 'Viola']
  ];

  for (const [first, last] of students) {
    await pool.query(
      'INSERT INTO students (class_id, first_name, last_name) VALUES ($1, $2, $3)',
      [classId, first, last]
    );
  }

  // Materie di esempio
  const subjects = [
    ['Matematica', '#3B82F6'],
    ['Italiano', '#10B981'],
    ['Storia', '#F59E0B'],
    ['Inglese', '#8B5CF6']
  ];

  for (const [name, color] of subjects) {
    await pool.query(
      'INSERT INTO subjects (class_id, name, color) VALUES ($1, $2, $3)',
      [classId, name, color]
    );
  }

  console.log('✅ Dati di esempio inseriti');
}

// Esegui se chiamato direttamente
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };
