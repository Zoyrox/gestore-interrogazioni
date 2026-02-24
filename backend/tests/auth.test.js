/**
 * Test Autenticazione
 */

const request = require('supertest');
const app = require('../server');

describe('Autenticazione', () => {
  describe('POST /api/auth/login', () => {
    it('dovrebbe rifiutare credenziali vuote', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({});
      
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('dovrebbe rifiutare credenziali errate', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'utente_inesistente',
          password: 'password_sbagliata'
        });
      
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/verify', () => {
    it('dovrebbe rifiutare richiesta senza token', async () => {
      const res = await request(app)
        .get('/api/auth/verify');
      
      expect(res.status).toBe(401);
    });

    it('dovrebbe rifiutare token non valido', async () => {
      const res = await request(app)
        .get('/api/auth/verify')
        .set('Authorization', 'Bearer token_non_valido');
      
      expect(res.status).toBe(403);
    });
  });
});

describe('Classi', () => {
  describe('POST /api/classes/access', () => {
    it('dovrebbe richiedere il codice', async () => {
      const res = await request(app)
        .post('/api/classes/access')
        .send({});
      
      expect(res.status).toBe(400);
    });

    it('dovrebbe rifiutare codice non valido', async () => {
      const res = await request(app)
        .post('/api/classes/access')
        .send({ code: 'CODICE_INVALIDO' });
      
      expect(res.status).toBe(404);
    });
  });
});
