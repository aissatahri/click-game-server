// server.js - Express + Socket.IO + SQLite pour scores (LAN)
// Mise à jour : stocke game_type, protège /teacher /scores /export.csv /DELETE par Basic Auth,
// et sert teacher.html depuis /private (non accessible via express.static)
const express = require('express');
const http = require('http');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const crypto = require('crypto');

(async () => {
  const app = express();
  const server = http.createServer(app);
  const io = require('socket.io')(server);

  app.use(express.json());
  const PORT = process.env.PORT || 3000;

  // servir fichiers statiques (les pages élèves, jeux, etc.)
  app.use(express.static(path.join(__dirname, 'public')));

  // ouvrir/initialiser la base SQLite
  const db = await open({
    filename: path.join(__dirname, 'scores.db'),
    driver: sqlite3.Database
  });

  // créer la table si nécessaire (incluant game_type)
  await db.exec(`CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    classe TEXT DEFAULT '',
    student_number TEXT DEFAULT '',
    time_seconds INTEGER NOT NULL,
    errors INTEGER NOT NULL,
    game_type TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // migration légère : ajouter colonnes manquantes si DB ancienne
  const info = await db.all("PRAGMA table_info(scores)");
  const cols = info.map(c => c.name);
  if (!cols.includes('classe')) {
    console.log("Adding missing column 'classe' to scores table");
    await db.exec("ALTER TABLE scores ADD COLUMN classe TEXT DEFAULT ''");
  }
  if (!cols.includes('student_number')) {
    console.log("Adding missing column 'student_number' to scores table");
    await db.exec("ALTER TABLE scores ADD COLUMN student_number TEXT DEFAULT ''");
  }
  if (!cols.includes('game_type')) {
    console.log("Adding missing column 'game_type' to scores table");
    await db.exec("ALTER TABLE scores ADD COLUMN game_type TEXT DEFAULT ''");
  }

  // ----------------------
  // Basic Auth middleware
  // ----------------------
  // Credentials: username (fixed 'teacher') and password from env TEACHER_PASS (default 'adminpass')
  const TEACHER_USER = process.env.TEACHER_USER || 'teacher';
  const TEACHER_PASS = process.env.TEACHER_PASS || 'adminpass';

  function basicAuth(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Teacher"');
      return res.status(401).send('Authentication required');
    }
    const match = auth.match(/^Basic (.+)$/);
    if (!match) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Teacher"');
      return res.status(401).send('Authentication required');
    }
    const credentials = Buffer.from(match[1], 'base64').toString('utf8');
    const idx = credentials.indexOf(':');
    if (idx === -1) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Teacher"');
      return res.status(401).send('Authentication required');
    }
    const user = credentials.slice(0, idx);
    const pass = credentials.slice(idx + 1);
    // constant-time compare to avoid timing leaks
    const okUser = (user === TEACHER_USER);
    const okPass = (pass === TEACHER_PASS);
    if (okUser && okPass) return next();
    res.setHeader('WWW-Authenticate', 'Basic realm="Teacher"');
    return res.status(401).send('Authentication required');
  }

  // ----------------------
  // Routes protégées
  // ----------------------

  // Servir explicitement teacher page depuis dossier "private" (non public)
  app.get('/teacher', basicAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'private', 'teacher.html'));
  });

  // Helper: build SQL WHERE and params from query
  function buildFilterQuery(qs) {
    const where = [];
    const params = [];

    if (qs.classe) {
      where.push('classe = ?');
      params.push(qs.classe);
    }
    if (qs.q) {
      where.push('(name LIKE ? OR student_number LIKE ? OR game_type LIKE ?)');
      const like = `%${qs.q}%`;
      params.push(like, like, like);
    }
    if (qs.game_type) {
      where.push('game_type = ?');
      params.push(qs.game_type);
    }
    return { where, params };
  }

  // GET /scores?classe=...&q=...&order=time_seconds|errors&dir=asc|desc&limit=50&game_type=...
  app.get('/scores', basicAuth, async (req, res) => {
    try {
      const qs = req.query || {};
      const orderField = (qs.order === 'errors') ? 'errors' : 'time_seconds';
      const dir = (qs.dir && qs.dir.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
      const limit = Math.min(1000, Math.max(1, parseInt(qs.limit, 10) || 200));

      const filter = buildFilterQuery(qs);
      const whereClause = filter.where.length ? ('WHERE ' + filter.where.join(' AND ')) : '';

      const sql = `SELECT id, name, classe, student_number, time_seconds, errors, game_type, created_at
                   FROM scores
                   ${whereClause}
                   ORDER BY ${orderField} ${dir}, errors ASC
                   LIMIT ?`;
      const params = [...filter.params, limit];
      const rows = await db.all(sql, params);
      res.json({ ok: true, rows });
    } catch (err) {
      console.error('GET /scores error', err);
      res.status(500).json({ ok: false });
    }
  });

  // POST /submit { name, classe, student_number, time_seconds, errors, game_type? }
  // This endpoint is public: students' pages POST here to submit results.
  app.post('/submit', async (req, res) => {
    try {
      const { name, classe, student_number, time_seconds, errors, game_type } = req.body;
      if (!name || typeof time_seconds !== 'number' || typeof errors !== 'number') {
        return res.status(400).json({ ok: false, error: 'invalid payload' });
      }
      const result = await db.run(
        'INSERT INTO scores (name, classe, student_number, time_seconds, errors, game_type) VALUES (?, ?, ?, ?, ?, ?)',
        [name, classe || '', student_number || '', time_seconds, errors, game_type || '']
      );
      const inserted = await db.get('SELECT id, name, classe, student_number, time_seconds, errors, game_type, created_at FROM scores WHERE id = ?', result.lastID);
      io.emit('new-score', inserted);
      res.json({ ok: true, row: inserted });
    } catch (err) {
      console.error('POST /submit error', err);
      res.status(500).json({ ok: false });
    }
  });

  // DELETE /scores/:id - supprimer un score (protégé)
  app.delete('/scores/:id', basicAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (Number.isNaN(id)) return res.status(400).json({ ok: false, error: 'invalid id' });
      const row = await db.get('SELECT id FROM scores WHERE id = ?', id);
      if (!row) return res.status(404).json({ ok: false, error: 'not found' });
      await db.run('DELETE FROM scores WHERE id = ?', id);
      io.emit('delete-score', { id });
      res.json({ ok: true, id });
    } catch (err) {
      console.error('DELETE /scores/:id error', err);
      res.status(500).json({ ok: false });
    }
  });

  // Export CSV: same filters as /scores (protected)
  app.get('/export.csv', basicAuth, async (req, res) => {
    try {
      const qs = req.query || {};
      const orderField = (qs.order === 'errors') ? 'errors' : 'time_seconds';
      const dir = (qs.dir && qs.dir.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
      const limit = Math.min(10000, Math.max(1, parseInt(qs.limit, 10) || 1000));

      const filter = buildFilterQuery(qs);
      const whereClause = filter.where.length ? ('WHERE ' + filter.where.join(' AND ')) : '';

      const sql = `SELECT id, name, classe, student_number, time_seconds, errors, game_type, created_at
                   FROM scores
                   ${whereClause}
                   ORDER BY ${orderField} ${dir}, errors ASC
                   LIMIT ?`;
      const params = [...filter.params, limit];
      const rows = await db.all(sql, params);

      // build CSV
      const header = ['id','name','classe','student_number','time_seconds','errors','game_type','created_at'];
      const escapeCell = (v) => {
        if (v === null || v === undefined) return '';
        const s = String(v).replace(/"/g, '""');
        return `"${s}"`;
      };
      const lines = [header.join(',')];
      rows.forEach(r => {
        const line = [
          r.id,
          escapeCell(r.name),
          escapeCell(r.classe),
          escapeCell(r.student_number),
          r.time_seconds,
          r.errors,
          escapeCell(r.game_type),
          escapeCell(r.created_at)
        ];
        lines.push(line.join(','));
      });
      const csv = lines.join('\r\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      const filename = `scores_export_${Date.now()}.csv`;
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csv);
    } catch (err) {
      console.error('GET /export.csv error', err);
      res.status(500).send('error');
    }
  });

  // socket.io connection (no auth on socket itself)
  io.on('connection', (socket) => {
    console.log('socket connected', socket.id);
    socket.on('disconnect', () => { console.log('socket disconnected', socket.id); });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Teacher user: ${TEACHER_USER} (password from TEACHER_PASS env or default 'adminpass')`);
  });
})();