const express = require('express');
const path = require('path');
const app = express();

const PORT = 8000;
const PUBLIC = path.join(__dirname, 'public');

app.use(express.static(PUBLIC));

app.get('*', (req, res) => {
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

app.listen(PORT, () => console.log(`Dev SPA rodando: http://localhost:${PORT}`));