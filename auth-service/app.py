"""
GESTORE INTERROGAZIONI SCOLASTICHE
Microservizio Autenticazione Admin - Flask

Questo servizio gestisce esclusivamente l'autenticazione degli admin
con sicurezza elevata e sessioni JWT.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import datetime
import os
import re
from functools import wraps
from psycopg2 import pool, extras

# ============================================
# CONFIGURAZIONE APP
# ============================================
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['JWT_SECRET'] = os.environ.get('JWT_SECRET', 'jwt-secret-change-in-production')
app.config['JWT_EXPIRATION_HOURS'] = 8

# CORS configurazione
CORS(app, resources={
    r"/api/*": {
        "origins": os.environ.get('FRONTEND_URL', '*').split(','),
        "supports_credentials": True
    }
})

# ============================================
# CONNESSIONE DATABASE
# ============================================
db_pool = None

def init_db_pool():
    """Inizializza il connection pool"""
    global db_pool
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        raise ValueError("DATABASE_URL non configurato")
    
    # Adatta URL per psycopg2 se necessario
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    db_pool = pool.SimpleConnectionPool(
        1, 20,
        database_url,
        sslmode='require' if os.environ.get('NODE_ENV') == 'production' else 'prefer'
    )

def get_db_connection():
    """Ottiene una connessione dal pool"""
    if db_pool is None:
        init_db_pool()
    return db_pool.getconn()

def release_db_connection(conn):
    """Rilascia una connessione al pool"""
    if db_pool and conn:
        db_pool.putconn(conn)

# Inizializza pool all'avvio
try:
    init_db_pool()
    print("✅ Database pool inizializzato")
except Exception as e:
    print(f"⚠️  Database non disponibile: {e}")

# ============================================
# MIDDLEWARE DI SICUREZZA
# ============================================

def require_auth(f):
    """Decorator per richiedere autenticazione JWT"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Estrai token dall'header
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Token malformato'}), 401
        
        if not token:
            return jsonify({'error': 'Token mancante'}), 401
        
        try:
            data = jwt.decode(token, app.config['JWT_SECRET'], algorithms=["HS256"])
            
            # Verifica che sia un admin
            if data.get('role') != 'admin':
                return jsonify({'error': 'Accesso riservato agli admin'}), 403
                
            request.user = data
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token scaduto'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Token non valido'}), 401
            
        return f(*args, **kwargs)
    
    return decorated

def validate_password(password):
    """Valida la sicurezza della password"""
    if len(password) < 8:
        return False, "La password deve essere di almeno 8 caratteri"
    if not re.search(r"[A-Z]", password):
        return False, "La password deve contenere almeno una maiuscola"
    if not re.search(r"[a-z]", password):
        return False, "La password deve contenere almeno una minuscola"
    if not re.search(r"\d", password):
        return False, "La password deve contenere almeno un numero"
    return True, None

def sanitize_input(text):
    """Sanitizza input utente"""
    if not text:
        return text
    # Rimuovi caratteri pericolosi
    text = re.sub(r'[<>"\']', '', str(text))
    return text.strip()

# ============================================
# ROUTES - HEALTH CHECK
# ============================================

@app.route('/api/auth/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'service': 'auth-service',
        'timestamp': datetime.datetime.utcnow().isoformat()
    })

# ============================================
# ROUTES - ADMIN AUTH
# ============================================

@app.route('/api/auth/admin/login', methods=['POST'])
def admin_login():
    """
    Login admin
    
    Request body:
        - username: string
        - password: string
    
    Returns:
        - token: JWT token
        - user: info utente
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Dati mancanti'}), 400
        
        username = sanitize_input(data.get('username', ''))
        password = data.get('password', '')
        
        if not username or not password:
            return jsonify({'error': 'Username e password richiesti'}), 400
        
        # Ottieni credenziali admin dalle variabili d'ambiente
        admin_username = os.environ.get('ADMIN_USERNAME')
        admin_password_hash = os.environ.get('ADMIN_PASSWORD_HASH')
        
        # Se non configurato, usa default per sviluppo (DA CAMBIARE IN PRODUZIONE!)
        if not admin_username:
            admin_username = 'admin'
        if not admin_password_hash:
            # Password default: "Admin123!" (solo per sviluppo!)
            admin_password_hash = generate_password_hash('Admin123!')
        
        # Verifica credenziali
        if username != admin_username:
            return jsonify({'error': 'Credenziali non valide'}), 401
        
        if not check_password_hash(admin_password_hash, password):
            return jsonify({'error': 'Credenziali non valide'}), 401
        
        # Genera JWT
        token_payload = {
            'user_id': 'admin',
            'username': admin_username,
            'role': 'admin',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=app.config['JWT_EXPIRATION_HOURS']),
            'iat': datetime.datetime.utcnow()
        }
        
        token = jwt.encode(token_payload, app.config['JWT_SECRET'], algorithm="HS256")
        
        return jsonify({
            'token': token,
            'user': {
                'username': admin_username,
                'role': 'admin'
            },
            'expires_in': app.config['JWT_EXPIRATION_HOURS'] * 3600
        })
        
    except Exception as e:
        app.logger.error(f"Errore login admin: {e}")
        return jsonify({'error': 'Errore interno del server'}), 500


@app.route('/api/auth/admin/verify', methods=['GET'])
@require_auth
def verify_admin_token():
    """Verifica validità token admin"""
    return jsonify({
        'valid': True,
        'user': request.user
    })


@app.route('/api/auth/admin/change-password', methods=['POST'])
@require_auth
def change_admin_password():
    """
    Cambia password admin
    
    Request body:
        - current_password: string
        - new_password: string
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Dati mancanti'}), 400
        
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Password attuale e nuova richieste'}), 400
        
        # Valida nuova password
        valid, error_msg = validate_password(new_password)
        if not valid:
            return jsonify({'error': error_msg}), 400
        
        # Verifica password attuale
        admin_password_hash = os.environ.get('ADMIN_PASSWORD_HASH')
        if not admin_password_hash:
            return jsonify({'error': 'Configurazione admin non valida'}), 500
        
        if not check_password_hash(admin_password_hash, current_password):
            return jsonify({'error': 'Password attuale non corretta'}), 401
        
        # Genera nuovo hash
        new_hash = generate_password_hash(new_password)
        
        # NOTA: In produzione, questo dovrebbe aggiornare il database
        # o una variabile d'ambiente sicura. Per semplicità, restituiamo
        # il nuovo hash che dovrebbe essere salvato manualmente.
        
        return jsonify({
            'message': 'Password cambiata con successo',
            'new_hash': new_hash  # Da salvare in ADMIN_PASSWORD_HASH
        })
        
    except Exception as e:
        app.logger.error(f"Errore cambio password: {e}")
        return jsonify({'error': 'Errore interno del server'}), 500


# ============================================
# ROUTES - SETUP INIZIALE
# ============================================

@app.route('/api/auth/admin/setup', methods=['POST'])
def setup_admin():
    """
    Setup iniziale admin (solo se non esiste)
    
    Request body:
        - username: string
        - password: string
        - setup_key: string (deve corrispondere a SETUP_KEY env)
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Dati mancanti'}), 400
        
        username = sanitize_input(data.get('username', ''))
        password = data.get('password', '')
        setup_key = data.get('setup_key', '')
        
        # Verifica setup key
        expected_key = os.environ.get('SETUP_KEY')
        if not expected_key:
            return jsonify({'error': 'Setup non abilitato'}), 403
        
        if setup_key != expected_key:
            return jsonify({'error': 'Setup key non valida'}), 403
        
        # Verifica se admin già configurato
        if os.environ.get('ADMIN_PASSWORD_HASH'):
            return jsonify({'error': 'Admin già configurato'}), 409
        
        # Valida password
        valid, error_msg = validate_password(password)
        if not valid:
            return jsonify({'error': error_msg}), 400
        
        # Genera hash
        password_hash = generate_password_hash(password)
        
        return jsonify({
            'message': 'Admin configurato con successo',
            'username': username,
            'password_hash': password_hash,
            'note': 'Salva ADMIN_USERNAME e ADMIN_PASSWORD_HASH nelle variabili d\'ambiente'
        })
        
    except Exception as e:
        app.logger.error(f"Errore setup admin: {e}")
        return jsonify({'error': 'Errore interno del server'}), 500


# ============================================
# ROUTES - PROTEZIONE CSRF
# ============================================

@app.route('/api/auth/csrf-token', methods=['GET'])
def get_csrf_token():
    """Genera token CSRF per form"""
    token = jwt.encode(
        {
            'type': 'csrf',
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)
        },
        app.config['SECRET_KEY'],
        algorithm="HS256"
    )
    return jsonify({'csrf_token': token})


# ============================================
# ERROR HANDLERS
# ============================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint non trovato'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Errore interno del server'}), 500

@app.errorhandler(429)
def rate_limit_handler(error):
    return jsonify({'error': 'Troppe richieste, riprova più tardi'}), 429


# ============================================
# AVVIO SERVER
# ============================================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"🚀 Auth Service avviato su porta {port}")
    print(f"📁 Debug mode: {debug}")
    
    app.run(host='0.0.0.0', port=port, debug=debug)
