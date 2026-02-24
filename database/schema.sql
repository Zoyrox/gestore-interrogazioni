-- ============================================
-- GESTORE INTERROGAZIONI SCOLASTICHE
-- Schema Database PostgreSQL
-- ============================================

-- Estensioni necessarie
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABELLA UTENTI
-- Admin e Capoclasse
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'capoclasse')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- TABELLA CLASSI
-- ============================================
CREATE TABLE IF NOT EXISTS classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    year INTEGER CHECK (year BETWEEN 1 AND 5),
    section VARCHAR(10),
    code VARCHAR(10) UNIQUE NOT NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_classes_code ON classes(code);
CREATE INDEX IF NOT EXISTS idx_classes_name ON classes(name);

-- ============================================
-- TABELLA STUDENTI
-- ============================================
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(last_name, first_name);

-- ============================================
-- TABELLA MATERIE
-- ============================================
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_subjects_class ON subjects(class_id);

-- ============================================
-- TABELLA INTERROGAZIONI (CALENDARIO)
-- ============================================
CREATE TABLE IF NOT EXISTS interrogations (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_interrogations_class ON interrogations(class_id);
CREATE INDEX IF NOT EXISTS idx_interrogations_date ON interrogations(date);
CREATE INDEX IF NOT EXISTS idx_interrogations_subject ON interrogations(subject_id);

-- ============================================
-- TABELLA ESCLUSIONI
-- Studenti esclusi da interrogazione in date specifiche
-- ============================================
CREATE TABLE IF NOT EXISTS exclusions (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, date)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_exclusions_student ON exclusions(student_id);
CREATE INDEX IF NOT EXISTS idx_exclusions_date ON exclusions(date);

-- ============================================
-- TABELLA STORICO ESTRAZIONI
-- ============================================
CREATE TABLE IF NOT EXISTS extraction_history (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    extraction_date DATE NOT NULL,
    extracted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, subject_id, student_id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_extractions_class ON extraction_history(class_id);
CREATE INDEX IF NOT EXISTS idx_extractions_subject ON extraction_history(subject_id);
CREATE INDEX IF NOT EXISTS idx_extractions_student ON extraction_history(student_id);
CREATE INDEX IF NOT EXISTS idx_extractions_date ON extraction_history(extraction_date);

-- ============================================
-- TABELLA ASSOCIAZIONE CAPOCLASSE-CLASSE
-- ============================================
CREATE TABLE IF NOT EXISTS class_extractors (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(class_id, user_id)
);

-- Indici
CREATE INDEX IF NOT EXISTS idx_class_extractors_class ON class_extractors(class_id);
CREATE INDEX IF NOT EXISTS idx_class_extractors_user ON class_extractors(user_id);

-- ============================================
-- TRIGGER PER AGGIORNAMENTO updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Applica trigger alle tabelle
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VISTE
-- ============================================

-- Vista riepilogo classe
CREATE OR REPLACE VIEW class_summary AS
SELECT 
    c.id,
    c.name,
    c.year,
    c.section,
    c.code,
    c.created_at,
    COUNT(DISTINCT s.id) as student_count,
    COUNT(DISTINCT sub.id) as subject_count,
    COUNT(DISTINCT eh.id) as total_extractions
FROM classes c
LEFT JOIN students s ON c.id = s.class_id AND s.is_active = TRUE
LEFT JOIN subjects sub ON c.id = sub.class_id AND sub.is_active = TRUE
LEFT JOIN extraction_history eh ON c.id = eh.class_id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.year, c.section, c.code, c.created_at;

-- Vista statistiche materia
CREATE OR REPLACE VIEW subject_stats AS
SELECT 
    s.id as subject_id,
    s.name as subject_name,
    s.color,
    c.id as class_id,
    c.name as class_name,
    COUNT(DISTINCT eh.student_id) as students_interrogated,
    COUNT(DISTINCT st.id) - COUNT(DISTINCT eh.student_id) as students_remaining
FROM subjects s
JOIN classes c ON s.class_id = c.id
LEFT JOIN students st ON c.id = st.class_id AND st.is_active = TRUE
LEFT JOIN extraction_history eh ON s.id = eh.subject_id
WHERE s.is_active = TRUE
GROUP BY s.id, s.name, s.color, c.id, c.name;

-- ============================================
-- DATI INIZIALI (OPZIONALE - PER TEST)
-- ============================================

-- Inserisci admin di default (password: Admin123!)
-- DA CAMBIARE IN PRODUZIONE!
-- INSERT INTO users (username, password_hash, role) 
-- VALUES ('admin', '$2b$10$YourHashedPasswordHere', 'admin')
-- ON CONFLICT (username) DO NOTHING;

-- ============================================
-- FUNZIONI UTILI
-- ============================================

-- Funzione per ottenere studenti disponibili per estrazione
CREATE OR REPLACE FUNCTION get_available_students(
    p_class_id INTEGER,
    p_subject_id INTEGER,
    p_date DATE
)
RETURNS TABLE (
    student_id INTEGER,
    first_name VARCHAR,
    last_name VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT s.id, s.first_name, s.last_name
    FROM students s
    WHERE s.class_id = p_class_id
      AND s.is_active = TRUE
      AND s.id NOT IN (
          -- Studenti già interrogati in questa materia
          SELECT eh.student_id 
          FROM extraction_history eh 
          WHERE eh.subject_id = p_subject_id 
            AND eh.class_id = p_class_id
      )
      AND s.id NOT IN (
          -- Studenti esclusi per questa data
          SELECT e.student_id 
          FROM exclusions e 
          WHERE e.date = p_date
      )
    ORDER BY s.last_name, s.first_name;
END;
$$ LANGUAGE plpgsql;

-- Funzione per statistiche estrazioni
CREATE OR REPLACE FUNCTION get_extraction_stats(
    p_class_id INTEGER,
    p_subject_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    total_students BIGINT,
    interrogated BIGINT,
    remaining BIGINT,
    percentage_done NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT eh.student_id) as interrogated,
        COUNT(DISTINCT s.id) - COUNT(DISTINCT eh.student_id) as remaining,
        CASE 
            WHEN COUNT(DISTINCT s.id) > 0 
            THEN ROUND(COUNT(DISTINCT eh.student_id)::NUMERIC / COUNT(DISTINCT s.id) * 100, 2)
            ELSE 0
        END as percentage_done
    FROM students s
    LEFT JOIN extraction_history eh ON s.id = eh.student_id 
        AND (p_subject_id IS NULL OR eh.subject_id = p_subject_id)
    WHERE s.class_id = p_class_id
      AND s.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PERMESSI
-- ============================================

-- Crea ruolo applicativo (opzionale)
-- CREATE ROLE gestore_app WITH LOGIN PASSWORD 'your_secure_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO gestore_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO gestore_app;
