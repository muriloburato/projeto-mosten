const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

const db = new sqlite3.Database(path.join(__dirname, 'movies.db'));
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS items (
    id TEXT PRIMARY KEY,
    titulo TEXT NOT NULL,
    genero TEXT NOT NULL,
    descricao TEXT,
    imagem TEXT,
    gostei INTEGER DEFAULT 0,
    naoGostei INTEGER DEFAULT 0
  )`);
});

// GET /items - lista todos os items
app.get('/items', (req, res) => {
  db.all('SELECT * FROM items', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// GET /items/:id - busca item pelo id
app.get('/items/:id', (req, res) => {
  const id = req.params.id;
  db.get('SELECT * FROM items WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Item não encontrado' });
    res.json(row);
  });
});

// POST /items - cadastra novo item
app.post('/items', (req, res) => {
  const { titulo, genero, descricao = '', imagem = '' } = req.body;
  if (!titulo || !genero) return res.status(400).json({ error: 'Título e gênero são obrigatórios' });
  const id = uuidv4();
  const stmt = db.prepare('INSERT INTO items (id, titulo, genero, descricao, imagem) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, titulo, genero, descricao, imagem, function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM items WHERE id = ?', [id], (e, row) => res.status(201).json(row));
  });
});

// PATCH /items/:id - atualiza parcialmente um item existente
app.patch('/items/:id', (req, res) => {
  const id = req.params.id;
  const { titulo, genero, descricao, imagem } = req.body;

  db.get('SELECT * FROM items WHERE id = ?', [id], (err, item) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!item) return res.status(404).json({ error: 'Item não encontrado' });

    const novoTitulo = titulo !== undefined ? titulo : item.titulo;
    const novoGenero = genero !== undefined ? genero : item.genero;
    const novaDescricao = descricao !== undefined ? descricao : item.descricao;
    const novaImagem = imagem !== undefined ? imagem : item.imagem;

    const sql = `UPDATE items SET titulo = ?, genero = ?, descricao = ?, imagem = ? WHERE id = ?`;

    db.run(sql, [novoTitulo, novoGenero, novaDescricao, novaImagem, id], function (err) {
      if (err) return res.status(500).json({ error: err.message });

      db.get('SELECT * FROM items WHERE id = ?', [id], (e, row) => {
        if (e) return res.status(500).json({ error: e.message });
        res.json(row);
      });
    });
  });
});

// POST /items/:id/vote - registra voto
app.post('/items/:id/vote', (req, res) => {
  const tipo = req.body.tipo === 'naoGostei' ? 'naoGostei' : 'gostei';
  const id = req.params.id;
  db.run(`UPDATE items SET ${tipo} = ${tipo} + 1 WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get('SELECT * FROM items WHERE id = ?', [id], (e, row) => res.json(row));
  });
});

// GET /votes/total - totais gerais
app.get('/votes/total', (req, res) => {
  db.get('SELECT COALESCE(SUM(gostei),0) AS totalGostei, COALESCE(SUM(naoGostei),0) AS totalNaoGostei FROM items', [], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row);
  });
});

// Rota fallback para index.html (single page app)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`API rodando na porta ${PORT}`));
