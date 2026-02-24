#!/usr/bin/env node
/**
 * Script per inizializzare il database
 * Usa: node scripts/setup-db.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function setup() {
  try {
    console.log('🔄 Inizializzazione database...');
    
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    
    console.log('✅ Database inizializzato con successo!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Errore:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setup();
