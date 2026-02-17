# Sistema de Currículos Estratégicos — PWA

Versão **offline-first**, instalável como app nativo em qualquer dispositivo.

---

## 🚀 Instalação Rápida

### Opção 1 — Servir localmente (desenvolvimento)

```bash
# Python (sem dependências extras)
python3 -m http.server 8000

# Node.js
npx serve .

# Depois abra:
# http://localhost:8000
```

> ⚠️ O Service Worker requer HTTPS **ou** `localhost`. Não funciona via `file://`.

### Opção 2 — Deploy gratuito (produção)

Faça upload da pasta para qualquer host estático:

| Plataforma | Comando |
|---|---|
| **Vercel** | `npx vercel` |
| **Netlify** | Arraste a pasta para netlify.com |
| **GitHub Pages** | Push + ativar Pages nas configurações |
| **Cloudflare Pages** | `npx wrangler pages deploy .` |

---

## 📲 Como Instalar como App

### iPhone / iPad
1. Abra no **Safari** (obrigatório)
2. Toque em **Compartilhar** → **Adicionar à Tela de Início**
3. Confirme o nome e toque **Adicionar**

### Android (Chrome)
1. Abra no **Chrome**
2. Toque no banner **"Instalar"** que aparece automaticamente
3. Ou: menu ⋮ → **Adicionar à tela inicial**

### Mac / Windows / Linux (Chrome ou Edge)
1. Acesse a URL no navegador
2. Clique no ícone **⊕** na barra de endereços
3. Ou: menu → **Instalar app**

---

## 💾 Armazenamento de Dados

Os dados agora ficam **100% no seu dispositivo** via IndexedDB:

| Dado | Localização anterior | Localização nova |
|---|---|---|
| Dados pessoais | `data/personal-data.json` | IndexedDB `personal['data']` |
| Histórico profissional | `data/personal-history.md` | IndexedDB `history['content']` |
| Vagas | `data/vagas.json` | IndexedDB `vagas` (store) |
| Currículos | `data/curriculos/*.json` | IndexedDB `curriculos` (store) |

### Backup e Restauração

Use os botões **Exportar Backup** / **Importar Backup** na aba "Meus Dados" para:
- Fazer backup antes de trocar de dispositivo
- Sincronizar entre dispositivos (export → import)
- Migrar dados do servidor Python para a PWA

---

## 🔄 Migração do server.py

Se você já tem dados no servidor Python, exporte-os assim:

```python
# migrate.py — execute uma vez no diretório do projeto antigo
import json, os, glob

data = {
    "version": 1,
    "exportedAt": "2025-02-17T00:00:00Z",
    "personal": json.load(open("data/personal-data.json")) if os.path.exists("data/personal-data.json") else None,
    "history": open("data/personal-history.md").read() if os.path.exists("data/personal-history.md") else "",
    "vagas": json.load(open("data/vagas.json")) if os.path.exists("data/vagas.json") else [],
    "curriculos": [
        {"vaga_uuid": f.split("/")[-1].replace(".json",""), **json.load(open(f))}
        for f in glob.glob("data/curriculos/*.json")
    ]
}

with open("backup-migracao.json", "w") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✅ Backup gerado: backup-migracao.json")
print(f"   {len(data['vagas'])} vagas | {len(data['curriculos'])} currículos")
```

Execute:
```bash
python3 migrate.py
```

Depois importe o `backup-migracao.json` na aba "Meus Dados" → **Importar Backup**.

---

## 📂 Estrutura de Arquivos

```
.
├── index.html              # App principal
├── resume.html             # Visualizador de currículo
├── manifest.json           # PWA manifest
├── sw.js                   # Service Worker (cache offline)
├── assets/
│   ├── css/
│   │   ├── main.css        # Estilos principais + PWA
│   │   └── resume.css      # Estilos do currículo
│   └── js/
│       ├── db.js           # ★ IndexedDB (substitui server.py)
│       ├── main.js         # Dados pessoais + backup + install prompt
│       └── vagas.js        # Vagas e currículos
├── core/
│   └── prompts/
│       └── master-prompt.md
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## ⚠️ Diferenças vs Versão com Servidor

| Funcionalidade | server.py | PWA |
|---|---|---|
| Dados pessoais | JSON no disco | IndexedDB |
| Vagas | JSON no disco | IndexedDB |
| Currículos | JSON no disco | IndexedDB |
| Extração automática de URL | ✅ (scraping Python) | ❌ (requer backend) |
| Funciona offline | ❌ | ✅ |
| Instalável como app | ❌ | ✅ |
| Funciona no iPhone | ❌ | ✅ |
| Backup/Restore | Manual | Export/Import JSON |


---

## 🛠️ Atualização do Cache

Quando fizer mudanças no código, incremente a versão do cache em `sw.js`:

```js
const CACHE_NAME = 'curriculos-v1.0.1'; // bump aqui
```

---

## 📄 Licença

MIT — Use, modifique e distribua livremente.
