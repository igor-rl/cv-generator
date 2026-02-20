const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8000;
const ROOT = __dirname;

// Servir todos os arquivos (CSS, JS etc)
app.use(express.static(ROOT));

// Fallback SPA sem erro no Express 5:
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(ROOT, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SPA rodando em http://localhost:${PORT}`);
});