-- ============================================
-- GESTORE INTERROGAZIONI - Database Schema
-- ============================================

-- Estensioni
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABELLE
-- ============================================

-- Utenti (admin e capoclasse)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'capoclasse')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classi
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    year VARCHAR(10),
    section VARCHAR(10),
    code VARCHAR(10) UNIQUE NOT NULL,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Studenti
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Materie
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3498db',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Interrogazioni (calendario)
CREATE TABLE IF NOT EXISTS interrogations (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    notes TEXT,
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Esclusioni studenti
CREATE TABLE IF NOT EXISTS exclusions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Storico estrazioni
CREATE TABLE IF NOT EXISTS extraction_history (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    extraction_date DATE NOT NULL,
    extracted_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Associazione capoclasse-classe
CREATE TABLE IF NOT EXISTS class_extractors (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, user_id)
);

-- ============================================
-- INDICI
-- ============================================

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_subjects_class ON subjects(class_id);
CREATE INDEX IF NOT EXISTS idx_interrogations_class ON interrogations(class_id);
CREATE INDEX IF NOT EXISTS idx_interrogations_date ON interrogations(date);
CREATE INDEX IF NOT EXISTS idx_extractions_class ON extraction_history(class_id);
CREATE INDEX IF NOT EXISTS idx_extractions_subject ON extraction_history(subject_id);
CREATE INDEX IF NOT EXISTS idx_extractions_student ON extraction_history(student_id);

-- ============================================
-- DATI INIZIALI (opzionale)
-- ============================================

-- Nota: L'admin viene gestito tramite variabili d'ambiente, non nel DB
